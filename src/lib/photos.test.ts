import { describe, expect, it } from 'vitest';
import { getPhotoFolderUrl } from './photos';

describe('Photo Gateway Helper', () => {
  it('returns valid Drive URL for year slugs', () => {
    expect(getPhotoFolderUrl('2026')).toBe(
      'https://drive.google.com/drive/folders/11vCQu4kKDoU1-9bMQpvIZ3sBsVA7Jf4L',
    );
    expect(getPhotoFolderUrl('2025')).toBe(
      'https://drive.google.com/drive/folders/1T6eDcalbo7zXwskBWOblOUiwF8FPsoHl',
    );
    expect(getPhotoFolderUrl('2024')).toBe(
      'https://drive.google.com/drive/folders/1vzchomGFgx8eNgbRtywlmfmTQ4325N2v',
    );
  });

  it('handles trip and all slugs case-insensitively', () => {
    expect(getPhotoFolderUrl('europe-2023')).toBe(
      'https://drive.google.com/drive/folders/1EwMWzJfvQ-jTbRXlPz4C7PDVemAZUVCn',
    );
    expect(getPhotoFolderUrl('ALL')).toBe(
      'https://drive.google.com/drive/folders/1l3W8PcEjqKwX8_bSzLE4WSpWrB7rM7xg',
    );
  });

  it('returns null for nonexistent slugs or empty input', () => {
    expect(getPhotoFolderUrl(undefined)).toBeNull();
    expect(getPhotoFolderUrl('')).toBeNull();
    expect(getPhotoFolderUrl('nonexistent-year')).toBeNull();
  });
});
