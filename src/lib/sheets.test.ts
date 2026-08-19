import { describe, expect, it } from 'vitest';
import {
  getBlogPostBySlug,
  getBlogPosts,
  getGoogleSheetsCredentials,
  getRecommendations,
  INITIAL_SEED_BLOG_POSTS,
  INITIAL_SEED_ITEMS,
} from './sheets';

describe('Google Sheets Storage Adapter', () => {
  it('parses Google Sheets credentials correctly', () => {
    const creds = getGoogleSheetsCredentials();
    expect(typeof creds.spreadsheetId).toBe('string');
    expect(typeof creds.clientEmail).toBe('string');
    expect(typeof creds.privateKey).toBe('string');
  });

  it('returns fallback seed recommendations when credentials are unconfigured in test environment', async () => {
    const items = await getRecommendations(true);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(INITIAL_SEED_ITEMS.length);
    expect(items.some((i) => i.title === 'jetski2013')).toBe(true);
  });

  it('returns fallback seed blog posts when credentials are unconfigured in test environment', async () => {
    const posts = await getBlogPosts(true);
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBeGreaterThanOrEqual(INITIAL_SEED_BLOG_POSTS.length);
    expect(posts.some((p) => p.slug === 'welcome')).toBe(true);
  });

  it('finds blog post by slug correctly', async () => {
    const post = await getBlogPostBySlug('welcome', true);
    expect(post).not.toBeNull();
    expect(post?.slug).toBe('welcome');
    expect(post?.title).toBe('welcome to pacos.nyc');
  });
});
