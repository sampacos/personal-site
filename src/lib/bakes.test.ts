import { describe, expect, it } from 'vitest';
import {
  bakePhotoUrl,
  getBakes,
  INITIAL_SEED_BAKES,
  isAllowedPhotoFile,
  isValidBakeDate,
  mergeBakeUpdate,
  parseBakeRow,
  serializeBakeRow,
  sortBakes,
  validateCalculatorState,
} from './bakes';
import { DEFAULT_CALCULATOR_STATE } from './bread';

const validBake = {
  id: 'bake-123',
  date: '2026-02-01',
  description: 'Sesame levain',
  notes: 'Nice oven spring.',
  photos: ['fileA', 'fileB'],
  formula: DEFAULT_CALCULATOR_STATE,
  createdAt: '2026-02-01T10:00:00.000Z',
};

describe('bake validation helpers', () => {
  it('accepts valid ISO dates and rejects everything else', () => {
    expect(isValidBakeDate('2026-02-01')).toBe(true);
    expect(isValidBakeDate('2024-02-29')).toBe(true);
    expect(isValidBakeDate('2023-02-29')).toBe(false); // not a leap year
    expect(isValidBakeDate('2026-2-1')).toBe(false);
    expect(isValidBakeDate('02/01/2026')).toBe(false);
    expect(isValidBakeDate('')).toBe(false);
    expect(isValidBakeDate(123)).toBe(false);
    expect(isValidBakeDate(null)).toBe(false);
  });

  it('accepts a valid calculator state', () => {
    const state = validateCalculatorState(JSON.parse(JSON.stringify(DEFAULT_CALCULATOR_STATE)));
    expect(state).not.toBeNull();
    expect(state?.dough.salt).toBe(2);
  });

  it('rejects calculator states with missing or non-finite numbers', () => {
    expect(validateCalculatorState(null)).toBeNull();
    expect(validateCalculatorState('nope')).toBeNull();
    expect(validateCalculatorState({})).toBeNull();

    const missing = {
      ...DEFAULT_CALCULATOR_STATE,
      dough: { ...DEFAULT_CALCULATOR_STATE.dough, salt: undefined },
    };
    expect(validateCalculatorState(missing)).toBeNull();

    const nan = {
      ...DEFAULT_CALCULATOR_STATE,
      batch: { ...DEFAULT_CALCULATOR_STATE.batch, unitWeight: Number.NaN },
    };
    expect(validateCalculatorState(nan)).toBeNull();

    const infinite = {
      ...DEFAULT_CALCULATOR_STATE,
      maintenanceStarter: {
        ...DEFAULT_CALCULATOR_STATE.maintenanceStarter,
        multiplicativeFactor: Infinity,
      },
    };
    expect(validateCalculatorState(infinite)).toBeNull();
  });

  it('validates photo uploads by type and size', () => {
    expect(isAllowedPhotoFile({ type: 'image/jpeg', size: 1000 })).toBe(true);
    expect(isAllowedPhotoFile({ type: 'image/png', size: 10 * 1024 * 1024 })).toBe(true);
    expect(isAllowedPhotoFile({ type: 'image/webp', size: 500 })).toBe(true);
    expect(isAllowedPhotoFile({ type: 'application/pdf', size: 1000 })).toBe(false);
    expect(isAllowedPhotoFile({ type: 'image/jpeg', size: 0 })).toBe(false);
    expect(isAllowedPhotoFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).toBe(false);
  });

  it('builds renderable photo URLs without exposing the folder', () => {
    expect(bakePhotoUrl('abc123')).toBe('https://lh3.googleusercontent.com/d/abc123');
  });
});

describe('bake row serialization', () => {
  it('round-trips a bake through serialize/parse', () => {
    const row = serializeBakeRow(validBake);
    expect(row).toHaveLength(7);

    const parsed = parseBakeRow(row);
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe(validBake.id);
    expect(parsed?.date).toBe(validBake.date);
    expect(parsed?.description).toBe(validBake.description);
    expect(parsed?.notes).toBe(validBake.notes);
    expect(parsed?.photos).toEqual(['fileA', 'fileB']);
    expect(parsed?.formula).toEqual(DEFAULT_CALCULATOR_STATE);
    expect(parsed?.createdAt).toBe(validBake.createdAt);
  });

  it('rejects rows without an id or a valid date', () => {
    expect(parseBakeRow(['', '2026-02-01'])).toBeNull();
    expect(parseBakeRow(['bake-1', 'not-a-date'])).toBeNull();
    expect(parseBakeRow([])).toBeNull();
  });

  it('falls back to default formula and empty photos on corrupt JSON', () => {
    const parsed = parseBakeRow([
      'bake-1',
      '2026-02-01',
      'desc',
      'notes',
      '{bad json',
      '{also bad',
      '',
    ]);
    expect(parsed).not.toBeNull();
    expect(parsed?.photos).toEqual([]);
    expect(parsed?.formula).toEqual(DEFAULT_CALCULATOR_STATE);
  });
});

describe('bake editing (mergeBakeUpdate)', () => {
  it('overwrites only the provided fields', () => {
    const updated = mergeBakeUpdate(validBake, {
      description: 'New description',
      notes: 'New notes.',
    });
    expect(updated.description).toBe('New description');
    expect(updated.notes).toBe('New notes.');
    expect(updated.photos).toEqual(['fileA', 'fileB']);
    expect(updated.date).toBe(validBake.date);
    expect(updated.formula).toEqual(DEFAULT_CALCULATOR_STATE);
    expect(updated.createdAt).toBe(validBake.createdAt);
  });

  it('replaces the full photo list and can clear it', () => {
    const replaced = mergeBakeUpdate(validBake, { photos: ['fileC'] });
    expect(replaced.photos).toEqual(['fileC']);

    const cleared = mergeBakeUpdate(validBake, { photos: [] });
    expect(cleared.photos).toEqual([]);
  });

  it('drops non-string entries from the replacement photo list', () => {
    const updated = mergeBakeUpdate(validBake, {
      photos: ['fileC', 42, null, 'fileD'] as unknown as string[],
    });
    expect(updated.photos).toEqual(['fileC', 'fileD']);
  });

  it('leaves the bake untouched when no fields are provided', () => {
    const updated = mergeBakeUpdate(validBake, {});
    expect(updated).toEqual(validBake);
  });
});

describe('bake sorting', () => {
  it('sorts newest bake date first, createdAt as tiebreaker', () => {
    const bakes = sortBakes([
      { ...validBake, id: 'a', date: '2026-01-01', createdAt: '2026-01-01T00:00:00.000Z' },
      { ...validBake, id: 'b', date: '2026-03-01', createdAt: '2026-03-01T00:00:00.000Z' },
      { ...validBake, id: 'c', date: '2026-02-01', createdAt: '2026-02-01T00:00:00.000Z' },
      { ...validBake, id: 'd', date: '2026-02-01', createdAt: '2026-02-05T00:00:00.000Z' },
    ]);
    expect(bakes.map((b) => b.id)).toEqual(['b', 'd', 'c', 'a']);
  });
});

describe('bakes storage adapter', () => {
  it('returns fallback seed bakes when credentials are unconfigured in test environment', async () => {
    const bakes = await getBakes(true);
    expect(Array.isArray(bakes)).toBe(true);
    expect(bakes.length).toBeGreaterThanOrEqual(INITIAL_SEED_BAKES.length);
    expect(bakes[0]?.formula).toEqual(DEFAULT_CALCULATOR_STATE);
  });
});
