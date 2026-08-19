export const PHOTO_FOLDERS: Record<string, string> = {
  '2026': 'https://drive.google.com/drive/folders/11vCQu4kKDoU1-9bMQpvIZ3sBsVA7Jf4L',
  '2025': 'https://drive.google.com/drive/folders/1T6eDcalbo7zXwskBWOblOUiwF8FPsoHl',
  '2024': 'https://drive.google.com/drive/folders/1vzchomGFgx8eNgbRtywlmfmTQ4325N2v',
  'europe-2023': 'https://drive.google.com/drive/folders/1EwMWzJfvQ-jTbRXlPz4C7PDVemAZUVCn',
  '2023-europe-trip': 'https://drive.google.com/drive/folders/1EwMWzJfvQ-jTbRXlPz4C7PDVemAZUVCn',
  '2023': 'https://drive.google.com/drive/folders/1EwMWzJfvQ-jTbRXlPz4C7PDVemAZUVCn',
  all: 'https://drive.google.com/drive/folders/1l3W8PcEjqKwX8_bSzLE4WSpWrB7rM7xg',
};

export function getPhotoFolderUrl(slug: string | undefined): string | null {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();
  return PHOTO_FOLDERS[normalized] || null;
}
