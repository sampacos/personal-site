import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(__dirname, '../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ASSETS_DIR = path.join(ROOT_DIR, 'src/assets');

describe('Icon Asset Verification and Compression Benchmarks', () => {
  describe('Favicon & Small Asset Limits (< 10 KB)', () => {
    const faviconAssets = [
      { file: 'favicon.ico', maxSize: 10 * 1024, expectedMagic: [0x00, 0x00, 0x01, 0x00] },
      {
        file: 'favicon-16x16.png',
        maxSize: 10 * 1024,
        expectedMagic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      },
      {
        file: 'favicon-32x32.png',
        maxSize: 10 * 1024,
        expectedMagic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      },
      {
        file: 'favicon.png',
        maxSize: 10 * 1024,
        expectedMagic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      },
    ];

    for (const { file, maxSize, expectedMagic } of faviconAssets) {
      it(`${file} exists, is under ${maxSize / 1024}KB, and has valid header`, () => {
        const filePath = path.join(PUBLIC_DIR, file);
        expect(fs.existsSync(filePath), `Expected ${file} to exist in public/`).toBe(true);

        const stats = fs.statSync(filePath);
        expect(
          stats.size,
          `${file} size (${stats.size} B) exceeds max allowed size of ${maxSize} B`,
        ).toBeLessThanOrEqual(maxSize);

        const buffer = fs.readFileSync(filePath);
        const header = Array.from(buffer.subarray(0, expectedMagic.length));
        expect(header).toEqual(expectedMagic);
      });
    }
  });

  describe('Site Icon Compression Limits (< 100 KB)', () => {
    const siteAssets = [
      {
        dir: PUBLIC_DIR,
        file: 'apple-touch-icon.png',
        maxSize: 100 * 1024,
        type: 'png',
      },
      {
        dir: PUBLIC_DIR,
        file: 'icon-192.png',
        maxSize: 100 * 1024,
        type: 'png',
      },
      {
        dir: PUBLIC_DIR,
        file: 'icon.jpg',
        maxSize: 100 * 1024,
        type: 'jpeg',
      },
      {
        dir: ASSETS_DIR,
        file: 'icon.jpg',
        maxSize: 100 * 1024,
        type: 'jpeg',
      },
      {
        dir: PUBLIC_DIR,
        file: 'icon.webp',
        maxSize: 100 * 1024,
        type: 'webp',
      },
      {
        dir: PUBLIC_DIR,
        file: 'favicon.svg',
        maxSize: 100 * 1024,
        type: 'svg',
      },
    ];

    for (const { dir, file, maxSize, type } of siteAssets) {
      const relDir = dir === PUBLIC_DIR ? 'public' : 'src/assets';
      it(`${relDir}/${file} exists and satisfies < 100KB compression benchmark`, () => {
        const filePath = path.join(dir, file);
        expect(fs.existsSync(filePath), `Expected ${relDir}/${file} to exist`).toBe(true);

        const stats = fs.statSync(filePath);
        expect(
          stats.size,
          `${relDir}/${file} size (${stats.size} B) exceeds max benchmark of ${maxSize} B`,
        ).toBeLessThanOrEqual(maxSize);

        const buffer = fs.readFileSync(filePath);

        if (type === 'png') {
          const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
          expect(Array.from(buffer.subarray(0, pngMagic.length))).toEqual(pngMagic);
        } else if (type === 'jpeg') {
          expect(Array.from(buffer.subarray(0, 3))).toEqual([0xff, 0xd8, 0xff]);
        } else if (type === 'webp') {
          expect(buffer.subarray(0, 4).toString('ascii')).toBe('RIFF');
          expect(buffer.subarray(8, 12).toString('ascii')).toBe('WEBP');
        } else if (type === 'svg') {
          const content = buffer.toString('utf-8');
          expect(content).toContain('<svg');
          expect(content).toContain('</svg>');
        }
      });
    }

    it('public/icon-512.png exists, is valid PNG, and within reasonable PWA size limits (< 500KB)', () => {
      const filePath = path.join(PUBLIC_DIR, 'icon-512.png');
      expect(fs.existsSync(filePath)).toBe(true);
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeLessThanOrEqual(500 * 1024);

      const buffer = fs.readFileSync(filePath);
      const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      expect(Array.from(buffer.subarray(0, pngMagic.length))).toEqual(pngMagic);
    });
  });

  describe('Web Manifest Compliance', () => {
    it('public/site.webmanifest exists, is valid JSON, and references valid icons with correct MIME types', () => {
      const manifestPath = path.join(PUBLIC_DIR, 'site.webmanifest');
      expect(fs.existsSync(manifestPath), 'site.webmanifest must exist').toBe(true);

      const content = fs.readFileSync(manifestPath, 'utf-8');
      interface ManifestIcon {
        src: string;
        sizes: string;
        type: string;
      }
      interface WebManifest {
        name: string;
        short_name: string;
        icons: ManifestIcon[];
        theme_color?: string;
        background_color?: string;
        display?: string;
      }

      let parsed: WebManifest;
      expect(() => {
        parsed = JSON.parse(content) as WebManifest;
      }).not.toThrow();

      parsed = JSON.parse(content) as WebManifest;
      expect(parsed.name).toBeDefined();
      expect(parsed.short_name).toBeDefined();
      expect(Array.isArray(parsed.icons)).toBe(true);
      expect(parsed.icons.length).toBeGreaterThan(0);

      for (const icon of parsed.icons) {
        expect(icon.src).toMatch(/^\//);
        expect(icon.sizes).toMatch(/^\d+x\d+$/);
        expect(icon.type).toBe('image/png');

        const resolvedIconPath = path.join(PUBLIC_DIR, icon.src.replace(/^\//, ''));
        expect(
          fs.existsSync(resolvedIconPath),
          `Manifest icon ${icon.src} must exist at ${resolvedIconPath}`,
        ).toBe(true);
      }
    });
  });

  describe('BaseHead Meta Tags Compliance', () => {
    it('BaseHead.astro includes all required icon links and manifest', () => {
      const baseHeadPath = path.join(ROOT_DIR, 'src/components/BaseHead.astro');
      expect(fs.existsSync(baseHeadPath)).toBe(true);
      const content = fs.readFileSync(baseHeadPath, 'utf-8');

      expect(content).toContain(
        'rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"',
      );
      expect(content).toContain(
        'rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"',
      );
      expect(content).toContain('rel="icon" href="/favicon.ico"');
      expect(content).toContain(
        'rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"',
      );
      expect(content).toContain('rel="manifest" href="/site.webmanifest"');
      expect(content).toContain("image = '/icon-512.png'");
    });
  });
});
