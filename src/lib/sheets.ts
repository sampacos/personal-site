import {
  GOOGLE_PRIVATE_KEY,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SHEET_ID,
} from 'astro:env/server';
import { google } from 'googleapis';

export interface RecommendedItem {
  id: string;
  category: 'songs' | 'albums' | 'podcasts';
  title: string;
  artist: string;
  url: string;
  addedAt: string;
}

export interface BlogPostItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  publishedAt: string;
  updatedAt?: string;
}

export const INITIAL_SEED_ITEMS: RecommendedItem[] = [
  {
    id: 'seed-song-1',
    category: 'songs',
    title: 'jetski2013',
    artist: 'sean potter',
    url: 'https://soundcloud.com/user-732083412/jetski2013-sean-potter',
    addedAt: new Date().toISOString(),
  },
  {
    id: 'seed-song-2',
    category: 'songs',
    title: 'A Life Where We Work Out',
    artist: 'DJ E',
    url: 'https://soundcloud.com/b94107843/dj-e-a-life-where-we-work-out',
    addedAt: new Date().toISOString(),
  },
  {
    id: 'seed-song-3',
    category: 'songs',
    title: 'OVERBOARD',
    artist: 'sunsǝt',
    url: 'https://soundcloud.com/a01211581/overboard-1',
    addedAt: new Date().toISOString(),
  },
  {
    id: 'seed-album-1',
    category: 'albums',
    title: 'chuquimamani-condor-230525',
    artist: 'Chuquimamani-Condori',
    url: 'https://soundcloud.com/user-643553014/chuquimamani-condor-230525',
    addedAt: new Date().toISOString(),
  },
  {
    id: 'seed-podcast-1',
    category: 'podcasts',
    title: 'Blowback',
    artist: 'Brendan James & Noah Kulwin',
    url: 'https://open.spotify.com/show/2pibBnPuHqKr07hxEMZE41',
    addedAt: new Date().toISOString(),
  },
];

export const INITIAL_SEED_BLOG_POSTS: BlogPostItem[] = [
  {
    id: 'seed-post-1',
    slug: 'welcome',
    title: 'welcome to pacos.nyc',
    description:
      'A new personal website, archive, and open notebook built with Astro and Google Sheets.',
    content:
      'Welcome to the new personal website!\n\nThis site is designed as a minimalist, fast, early-web style archive for bread baking notes, curated listening, photos, code projects, and writings.\n\nAll content is powered directly by Google Sheets, allowing lightweight live updates without needing manual deployments.',
    publishedAt: new Date().toISOString(),
  },
];

const RECOMMENDATIONS_SHEET = 'Recommendations';
const RECOMMENDATIONS_HEADER = ['id', 'category', 'title', 'artist', 'url', 'addedAt'];

const BLOG_SHEET = 'BlogPosts';
const BLOG_HEADER = ['id', 'slug', 'title', 'description', 'content', 'publishedAt', 'updatedAt'];

// Short in-memory cache for ultra-fast page rendering
let cachedRecommendations: RecommendedItem[] | null = null;
let recCacheExpiry = 0;

let cachedBlogPosts: BlogPostItem[] | null = null;
let blogCacheExpiry = 0;

const CACHE_TTL_MS = 30 * 1000; // 30 seconds

export function getGoogleSheetsCredentials() {
  const spreadsheetId = GOOGLE_SHEET_ID || process.env.GOOGLE_SHEET_ID || '';
  const clientEmail =
    GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  let privateKey = GOOGLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '';

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return { spreadsheetId, clientEmail, privateKey };
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
 * Initializes the Recommendations tab
 */
async function ensureRecommendationsSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheet.data.sheets?.some(
      (s) => s.properties?.title === RECOMMENDATIONS_SHEET,
    );

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: RECOMMENDATIONS_SHEET },
              },
            },
          ],
        },
      });
    }

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${RECOMMENDATIONS_SHEET}!A1:F1`,
    });

    const rows = rowsRes.data.values;
    if (!rows || rows.length === 0) {
      const seedRows = INITIAL_SEED_ITEMS.map((item) => [
        item.id,
        item.category,
        item.title,
        item.artist,
        item.url,
        item.addedAt,
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${RECOMMENDATIONS_SHEET}!A1:F${1 + seedRows.length}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [RECOMMENDATIONS_HEADER, ...seedRows],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring recommendations sheet initialized:', error);
  }
}

/**
 * Initializes the BlogPosts tab
 */
async function ensureBlogSheet(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheet.data.sheets?.some((s) => s.properties?.title === BLOG_SHEET);

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: BLOG_SHEET },
              },
            },
          ],
        },
      });
    }

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${BLOG_SHEET}!A1:G1`,
    });

    const rows = rowsRes.data.values;
    if (!rows || rows.length === 0) {
      const seedRows = INITIAL_SEED_BLOG_POSTS.map((post) => [
        post.id,
        post.slug,
        post.title,
        post.description,
        post.content,
        post.publishedAt,
        post.updatedAt || '',
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${BLOG_SHEET}!A1:G${1 + seedRows.length}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [BLOG_HEADER, ...seedRows],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring blog sheet initialized:', error);
  }
}

// ----------------------------------------------------
// Recommendations Functions
// ----------------------------------------------------

export async function getRecommendations(bypassCache = false): Promise<RecommendedItem[]> {
  const now = Date.now();
  if (!bypassCache && cachedRecommendations && recCacheExpiry > now) {
    return cachedRecommendations;
  }

  const { spreadsheetId } = getGoogleSheetsCredentials();
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    return INITIAL_SEED_ITEMS;
  }

  try {
    await ensureRecommendationsSheet(sheets, spreadsheetId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${RECOMMENDATIONS_SHEET}!A2:F`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return INITIAL_SEED_ITEMS;
    }

    const items: RecommendedItem[] = rows
      .filter((row) => row[0] && row[2])
      .map((row) => ({
        id: String(row[0] || ''),
        category: (row[1] || 'songs') as 'songs' | 'albums' | 'podcasts',
        title: String(row[2] || ''),
        artist: String(row[3] || ''),
        url: String(row[4] || ''),
        addedAt: String(row[5] || new Date().toISOString()),
      }));

    cachedRecommendations = items;
    recCacheExpiry = now + CACHE_TTL_MS;
    return items;
  } catch (error) {
    console.error('Error reading recommendations from Google Sheets:', error);
    return cachedRecommendations || INITIAL_SEED_ITEMS;
  }
}

export async function addRecommendation(
  item: Omit<RecommendedItem, 'id' | 'addedAt'>,
): Promise<RecommendedItem | null> {
  const { spreadsheetId } = getGoogleSheetsCredentials();
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    throw new Error('Google Sheets credentials are not configured');
  }

  const newItem: RecommendedItem = {
    ...item,
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    addedAt: new Date().toISOString(),
  };

  await ensureRecommendationsSheet(sheets, spreadsheetId);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${RECOMMENDATIONS_SHEET}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [newItem.id, newItem.category, newItem.title, newItem.artist, newItem.url, newItem.addedAt],
      ],
    },
  });

  cachedRecommendations = null;
  return newItem;
}

export async function deleteRecommendation(id: string): Promise<boolean> {
  const { spreadsheetId } = getGoogleSheetsCredentials();
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    throw new Error('Google Sheets credentials are not configured');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${RECOMMENDATIONS_SHEET}!A:A`,
  });

  const rows = response.data.values;
  if (!rows) return false;

  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return false;

  const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = sheetMetadata.data.sheets?.find(
    (s) => s.properties?.title === RECOMMENDATIONS_SHEET,
  );
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

  cachedRecommendations = null;
  return true;
}

// ----------------------------------------------------
// Blog Posts Functions
// ----------------------------------------------------

export async function getBlogPosts(bypassCache = false): Promise<BlogPostItem[]> {
  const now = Date.now();
  if (!bypassCache && cachedBlogPosts && blogCacheExpiry > now) {
    return cachedBlogPosts;
  }

  const { spreadsheetId } = getGoogleSheetsCredentials();
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    return INITIAL_SEED_BLOG_POSTS;
  }

  try {
    await ensureBlogSheet(sheets, spreadsheetId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${BLOG_SHEET}!A2:G`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return INITIAL_SEED_BLOG_POSTS;
    }

    const posts: BlogPostItem[] = rows
      .filter((row) => row[0] && row[1] && row[2]) // must have id, slug, and title
      .map((row) => ({
        id: String(row[0] || ''),
        slug: String(row[1] || '')
          .trim()
          .toLowerCase(),
        title: String(row[2] || '').trim(),
        description: String(row[3] || '').trim(),
        content: String(row[4] || ''),
        publishedAt: String(row[5] || new Date().toISOString()),
        updatedAt: row[6] ? String(row[6]) : undefined,
      }))
      // Sort newest first
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    cachedBlogPosts = posts;
    blogCacheExpiry = now + CACHE_TTL_MS;
    return posts;
  } catch (error) {
    console.error('Error reading blog posts from Google Sheets:', error);
    return cachedBlogPosts || INITIAL_SEED_BLOG_POSTS;
  }
}

export async function getBlogPostBySlug(
  slug: string,
  bypassCache = false,
): Promise<BlogPostItem | null> {
  const posts = await getBlogPosts(bypassCache);
  const normalized = slug.trim().toLowerCase();
  return posts.find((p) => p.slug === normalized) || null;
}

export async function createBlogPost(
  data: Omit<BlogPostItem, 'id' | 'publishedAt'>,
): Promise<BlogPostItem | null> {
  const { spreadsheetId } = getGoogleSheetsCredentials();
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    throw new Error('Google Sheets credentials are not configured');
  }

  const slug = data.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-');

  const newPost: BlogPostItem = {
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    slug,
    title: data.title.trim(),
    description: data.description.trim(),
    content: data.content,
    publishedAt: new Date().toISOString(),
  };

  await ensureBlogSheet(sheets, spreadsheetId);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${BLOG_SHEET}!A:G`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          newPost.id,
          newPost.slug,
          newPost.title,
          newPost.description,
          newPost.content,
          newPost.publishedAt,
          '',
        ],
      ],
    },
  });

  cachedBlogPosts = null;
  return newPost;
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  const { spreadsheetId } = getGoogleSheetsCredentials();
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    throw new Error('Google Sheets credentials are not configured');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${BLOG_SHEET}!A:A`,
  });

  const rows = response.data.values;
  if (!rows) return false;

  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return false;

  const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = sheetMetadata.data.sheets?.find((s) => s.properties?.title === BLOG_SHEET);
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

  cachedBlogPosts = null;
  return true;
}

export async function updateBlogPost(
  id: string,
  data: Partial<Omit<BlogPostItem, 'id' | 'publishedAt'>>,
): Promise<BlogPostItem | null> {
  const { spreadsheetId } = getGoogleSheetsCredentials();
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    throw new Error('Google Sheets credentials are not configured');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${BLOG_SHEET}!A2:G`,
  });

  const rows = response.data.values;
  if (!rows) return null;

  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return null;

  const existingRow = rows[rowIndex];
  const updatedSlug = data.slug
    ? data.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
    : existingRow[1];
  const updatedTitle = data.title !== undefined ? data.title.trim() : existingRow[2];
  const updatedDescription =
    data.description !== undefined ? data.description.trim() : existingRow[3];
  const updatedContent = data.content !== undefined ? data.content : existingRow[4];
  const publishedAt = existingRow[5];
  const updatedAt = new Date().toISOString();

  const sheetRowNumber = rowIndex + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${BLOG_SHEET}!A${sheetRowNumber}:G${sheetRowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [id, updatedSlug, updatedTitle, updatedDescription, updatedContent, publishedAt, updatedAt],
      ],
    },
  });

  cachedBlogPosts = null;

  return {
    id,
    slug: updatedSlug,
    title: updatedTitle,
    description: updatedDescription,
    content: updatedContent,
    publishedAt,
    updatedAt,
  };
}
