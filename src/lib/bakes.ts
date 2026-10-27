import { BLOB_READ_WRITE_TOKEN } from 'astro:env/server';
import { put } from '@vercel/blob';
import { google } from 'googleapis';
import {
  type BatchInputs,
  type CalculatorState,
  DEFAULT_CALCULATOR_STATE,
  type DoughIngredients,
  type DoughStarterInputs,
  type MaintenanceStarterInputs,
} from './bread';
import { getGoogleSheetsCredentials } from './sheets';

/**
 * Storage adapter for the bake log. Bakes live in a dedicated "Bakes" tab of
 * the same Google Sheet that powers the blog and recommendations.
 *
 * Only the calculator *inputs* are persisted (as a JSON snapshot); all derived
 * values are recomputed at render time via `src/lib/bread.ts`.
 */

const BAKES_SHEET = 'Bakes';
const BAKES_HEADER = ['id', 'date', 'description', 'notes', 'photos', 'formula', 'createdAt'];
const CACHE_TTL_MS = 30 * 1000;

export interface Bake {
  id: string;
  /** Bake date (ISO yyyy-mm-dd) — the primary index of the log. */
  date: string;
  /** Optional short description shown in the bakes table. */
  description: string;
  /** Free-text notes. */
  notes: string;
  /** Drive file IDs of uploaded photos. */
  photos: string[];
  /** Full snapshot of the calculator inputs used for this bake. */
  formula: CalculatorState;
  createdAt: string;
}

export interface NewBake {
  date: string;
  description?: string;
  notes?: string;
  photos?: string[];
  formula: CalculatorState;
}

/** Editable fields of a bake — the date, formula, and id are immutable. */
export interface BakeUpdate {
  description?: string;
  notes?: string;
  /** Full replacement list of Drive file IDs (empty array clears all photos). */
  photos?: string[];
}

/**
 * Merges an edit into an existing bake. Pure so it can be unit-tested; the
 * sheet-bound `updateBake` applies it after locating the row.
 */
export function mergeBakeUpdate(existing: Bake, update: BakeUpdate): Bake {
  return {
    ...existing,
    description:
      update.description !== undefined ? update.description.trim() : existing.description,
    notes: update.notes !== undefined ? update.notes : existing.notes,
    photos:
      update.photos !== undefined
        ? update.photos.filter((p) => typeof p === 'string')
        : existing.photos,
  };
}

export interface SeedBake extends Bake {
  formula: CalculatorState;
}

let cachedBakes: Bake[] | null = null;
let bakesCacheExpiry = 0;

/**
 * Constructs a publicly renderable URL for a stored Drive photo (legacy
 * entries store bare Drive file IDs; new entries store full blob URLs).
 */
export function bakePhotoUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Resolves a stored photo reference to a renderable URL. Full URLs (Vercel
 * Blob) are used as-is; legacy entries store bare Drive file IDs.
 */
export function bakePhotoSrc(reference: string): string {
  return /^https?:\/\//.test(reference) ? reference : bakePhotoUrl(reference);
}

/** ISO date (yyyy-mm-dd) validation for the bake date field. */
export function isValidBakeDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Validates and normalizes an untrusted calculator state (e.g. from the save
 * endpoint). Returns null when anything is missing or not a finite number.
 */
export function validateCalculatorState(input: unknown): CalculatorState | null {
  if (typeof input !== 'object' || input === null) return null;
  const raw = input as Record<string, unknown>;

  const num = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  function parseFields<T extends object>(
    group: unknown,
    keys: readonly (keyof T & string)[],
  ): T | null {
    if (typeof group !== 'object' || group === null) return null;
    const source = group as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const key of keys) {
      const value = num(source[key]);
      if (value === null) return null;
      out[key] = value;
    }
    return out as T;
  }

  const batch = parseFields<BatchInputs>(raw.batch, [
    'unitWeight',
    'quantityOfUnits',
    'wasteFactor',
  ]);
  const maintenanceStarter = parseFields<MaintenanceStarterInputs>(raw.maintenanceStarter, [
    'starterHydration',
    'multiplicativeFactor',
  ]);
  const doughStarter = parseFields<DoughStarterInputs>(raw.doughStarter, [
    'sugar',
    'starterHydration',
    'multiplicativeFactor',
    'preFermentedFlour',
  ]);
  const dough = parseFields<DoughIngredients>(raw.dough, [
    'water',
    'milk',
    'heavyCream',
    'egg',
    'eggYolk',
    'butter',
    'sugar',
    'honey',
    'salt',
  ]);

  if (!batch || !maintenanceStarter || !doughStarter || !dough) return null;

  return { batch, maintenanceStarter, doughStarter, dough };
}

/**
 * Parses one spreadsheet row into a Bake. Returns null for unusable rows so
 * corrupted data never reaches the page.
 */
export function parseBakeRow(row: unknown[]): Bake | null {
  const id = typeof row[0] === 'string' ? row[0].trim() : '';
  const date = typeof row[1] === 'string' ? row[1].trim() : '';
  if (!id || !isValidBakeDate(date)) return null;

  let photos: string[] = [];
  try {
    const parsed: unknown = JSON.parse(typeof row[4] === 'string' && row[4] ? row[4] : '[]');
    if (Array.isArray(parsed)) {
      photos = parsed.filter((p): p is string => typeof p === 'string');
    }
  } catch {
    photos = [];
  }

  let formula: CalculatorState = DEFAULT_CALCULATOR_STATE;
  try {
    const parsed: unknown = JSON.parse(typeof row[5] === 'string' && row[5] ? row[5] : 'null');
    const validated = validateCalculatorState(parsed);
    if (validated) formula = validated;
  } catch {
    // Keep defaults for rows with a missing/corrupt formula snapshot.
  }

  return {
    id,
    date,
    description: typeof row[2] === 'string' ? row[2].trim() : '',
    notes: typeof row[3] === 'string' ? row[3] : '',
    photos,
    formula,
    createdAt: typeof row[6] === 'string' && row[6] ? row[6] : new Date().toISOString(),
  };
}

/** Serializes a Bake into a spreadsheet row (BAKES_HEADER column order). */
export function serializeBakeRow(bake: Bake): string[] {
  return [
    bake.id,
    bake.date,
    bake.description,
    bake.notes,
    JSON.stringify(bake.photos),
    JSON.stringify(bake.formula),
    bake.createdAt,
  ];
}

/** Sorts bakes by date (newest first), createdAt as tiebreaker. */
export function sortBakes(bakes: Bake[]): Bake[] {
  return [...bakes].sort((a, b) => {
    const byDate =
      new Date(`${b.date}T00:00:00Z`).getTime() - new Date(`${a.date}T00:00:00Z`).getTime();
    if (byDate !== 0) return byDate;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function getSheetsClient() {
  const { clientEmail, privateKey } = getGoogleSheetsCredentials();
  if (!clientEmail || !privateKey) return null;

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Initializes the Bakes tab (creates it and writes the header if missing).
 */
async function ensureBakesSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
): Promise<void> {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetExists = spreadsheet.data.sheets?.some((s) => s.properties?.title === BAKES_SHEET);

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: BAKES_SHEET } } }],
      },
    });
  }

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${BAKES_SHEET}!A1:G1`,
  });

  if (!rowsRes.data.values || rowsRes.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${BAKES_SHEET}!A1:G1`,
      valueInputOption: 'RAW',
      requestBody: { values: [BAKES_HEADER] },
    });
  }
}

/** Seed bake shown in development / when credentials are unconfigured. */
export const INITIAL_SEED_BAKES: Bake[] = [
  {
    id: 'seed-bake-1',
    date: new Date().toISOString().slice(0, 10),
    description: 'First entry from the dough builder',
    notes: 'Seeded bake for local development.',
    photos: [],
    formula: DEFAULT_CALCULATOR_STATE,
    createdAt: new Date().toISOString(),
  },
];

export async function getBakes(bypassCache = false): Promise<Bake[]> {
  const now = Date.now();
  if (!bypassCache && cachedBakes && bakesCacheExpiry > now) {
    return cachedBakes;
  }

  const { spreadsheetId } = getGoogleSheetsCredentials();
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    return INITIAL_SEED_BAKES;
  }

  try {
    await ensureBakesSheet(sheets, spreadsheetId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${BAKES_SHEET}!A2:G`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return INITIAL_SEED_BAKES;
    }

    const bakes = sortBakes(rows.map(parseBakeRow).filter((bake): bake is Bake => bake !== null));

    cachedBakes = bakes;
    bakesCacheExpiry = now + CACHE_TTL_MS;
    return bakes;
  } catch (error) {
    console.error('Error reading bakes from Google Sheets:', error);
    return cachedBakes || INITIAL_SEED_BAKES;
  }
}

export async function getBakeById(id: string, bypassCache = false): Promise<Bake | null> {
  const bakes = await getBakes(bypassCache);
  return bakes.find((bake) => bake.id === id) || null;
}

/**
 * Updates the editable fields of a bake. Returns null when the id does not
 * exist. The date, formula, id, and createdAt are left untouched.
 */
export async function updateBake(id: string, data: BakeUpdate): Promise<Bake | null> {
  const { spreadsheetId } = getGoogleSheetsCredentials();
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    throw new Error('Google Sheets credentials are not configured');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${BAKES_SHEET}!A2:G`,
  });

  const rows = response.data.values;
  if (!rows) return null;

  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return null;

  const existing = parseBakeRow(rows[rowIndex]);
  if (!existing) return null;

  const updated = mergeBakeUpdate(existing, data);
  const sheetRowNumber = rowIndex + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${BAKES_SHEET}!A${sheetRowNumber}:G${sheetRowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [serializeBakeRow(updated)] },
  });

  cachedBakes = null;
  return updated;
}

export async function deleteBake(id: string): Promise<boolean> {
  const { spreadsheetId } = getGoogleSheetsCredentials();
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    throw new Error('Google Sheets credentials are not configured');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${BAKES_SHEET}!A:A`,
  });

  const rows = response.data.values;
  if (!rows) return false;

  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return false;

  const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = sheetMetadata.data.sheets?.find((s) => s.properties?.title === BAKES_SHEET);
  const sheetId = sheet?.properties?.sheetId || 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });

  cachedBakes = null;
  return true;
}

export async function addBake(data: NewBake): Promise<Bake> {
  const { spreadsheetId } = getGoogleSheetsCredentials();
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    throw new Error('Google Sheets credentials are not configured');
  }

  if (!isValidBakeDate(data.date)) {
    throw new Error('Invalid bake date');
  }

  const newBake: Bake = {
    id: `bake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: data.date,
    description: (data.description || '').trim(),
    notes: data.notes || '',
    photos: (data.photos || []).filter((p) => typeof p === 'string'),
    formula: data.formula,
    createdAt: new Date().toISOString(),
  };

  await ensureBakesSheet(sheets, spreadsheetId);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${BAKES_SHEET}!A:G`,
    valueInputOption: 'RAW',
    requestBody: { values: [serializeBakeRow(newBake)] },
  });

  cachedBakes = null;
  return newBake;
}

// ----------------------------------------------------
// Photo uploads (Vercel Blob)
// ----------------------------------------------------

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

const PHOTO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function isAllowedPhotoFile(file: { type: string; size: number }): boolean {
  return ALLOWED_PHOTO_TYPES.has(file.type) && file.size > 0 && file.size <= MAX_PHOTO_BYTES;
}

/**
 * Uploads an image to the Vercel Blob store and returns its public URL.
 * Uploads reach the store only through the admin-gated API route; URLs are
 * unguessable and there is no folder listing to crawl.
 */
export async function uploadBakePhoto(file: {
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}): Promise<string> {
  if (!isAllowedPhotoFile(file)) {
    throw new Error('Unsupported file type or size');
  }

  // The token comes from the Astro env schema (astro:env/server), since Vite
  // does not populate process.env from .env files in dev. It is passed to put()
  // explicitly for the same reason.
  if (!BLOB_READ_WRITE_TOKEN) {
    throw new Error('Blob storage is not configured (BLOB_READ_WRITE_TOKEN missing)');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = PHOTO_EXTENSIONS[file.type] ?? 'bin';
  const pathname = `bakes/bake-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const blob = await put(pathname, buffer, {
    token: BLOB_READ_WRITE_TOKEN,
    access: 'public',
    contentType: file.type,
    addRandomSuffix: true,
  });

  return blob.url;
}
