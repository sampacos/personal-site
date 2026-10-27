import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { putMock, astroEnv } = vi.hoisted(() => ({
  putMock: vi.fn(),
  astroEnv: { token: 'vercel_blob_rw_test_token' as string | undefined },
}));

vi.mock('@vercel/blob', () => ({ put: putMock }));
vi.mock('astro:env/server', () => ({
  get BLOB_READ_WRITE_TOKEN() {
    return astroEnv.token;
  },
}));

const { bakePhotoSrc, uploadBakePhoto } = await import('./bakes');

describe('uploadBakePhoto (Vercel Blob)', () => {
  beforeEach(() => {
    putMock.mockReset();
    putMock.mockResolvedValue({
      url: 'https://abc123.blob.vercel-storage.com/bakes/bake-1-aB3.jpg',
      pathname: 'bakes/bake-1-aB3.jpg',
      contentType: 'image/jpeg',
    });
    astroEnv.token = 'vercel_blob_rw_test_token';
  });

  afterEach(() => {
    astroEnv.token = 'vercel_blob_rw_test_token';
  });

  const fakeFile = (bytes = 10, type = 'image/jpeg') => ({
    type,
    size: bytes,
    arrayBuffer: async () => new ArrayBuffer(bytes),
  });

  it('uploads to the bakes/ prefix with the right content type and returns the URL', async () => {
    const url = await uploadBakePhoto(fakeFile());
    expect(url).toBe('https://abc123.blob.vercel-storage.com/bakes/bake-1-aB3.jpg');

    const [pathname, body, options] = putMock.mock.calls[0] as unknown as [
      string,
      Buffer,
      { access: string; contentType: string; token: string },
    ];
    expect(pathname).toMatch(/^bakes\/bake-\d+-[a-z0-9]+\.jpg$/);
    expect(body).toBeInstanceOf(Buffer);
    expect(options.access).toBe('public');
    expect(options.contentType).toBe('image/jpeg');
    expect(options.token).toBe('vercel_blob_rw_test_token');
  });

  it('maps each allowed mime type to a matching file extension', async () => {
    const cases: Array<[string, string]> = [
      ['image/png', 'png'],
      ['image/webp', 'webp'],
      ['image/gif', 'gif'],
      ['image/jpeg', 'jpg'],
    ];
    for (const [mime, ext] of cases) {
      putMock.mockResolvedValueOnce({ url: 'https://abc123.blob.vercel-storage.com/x' });
      await uploadBakePhoto(fakeFile(10, mime));
      const [pathname] = putMock.mock.calls.at(-1) as unknown as [string];
      expect(pathname.endsWith(`.${ext}`)).toBe(true);
    }
  });

  it('rejects unsupported file types before any blob call', async () => {
    await expect(uploadBakePhoto(fakeFile(10, 'application/pdf'))).rejects.toThrow(
      'Unsupported file type or size',
    );
    expect(putMock).not.toHaveBeenCalled();
  });

  it('rejects oversized files before any blob call', async () => {
    await expect(uploadBakePhoto(fakeFile(10 * 1024 * 1024 + 1))).rejects.toThrow(
      'Unsupported file type or size',
    );
    expect(putMock).not.toHaveBeenCalled();
  });

  it('throws a clear error when the blob token is missing', async () => {
    astroEnv.token = undefined;
    await expect(uploadBakePhoto(fakeFile())).rejects.toThrow('Blob storage is not configured');
    expect(putMock).not.toHaveBeenCalled();
  });
});

describe('bakePhotoSrc', () => {
  it('passes full URLs through unchanged', () => {
    expect(bakePhotoSrc('https://abc123.blob.vercel-storage.com/bakes/x.jpg')).toBe(
      'https://abc123.blob.vercel-storage.com/bakes/x.jpg',
    );
  });

  it('resolves legacy bare Drive file IDs to renderable URLs', () => {
    expect(bakePhotoSrc('abcFileId123')).toBe('https://lh3.googleusercontent.com/d/abcFileId123');
  });
});
