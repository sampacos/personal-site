import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const defaultInput = path.resolve('src/assets/icon.jpg');
const inputPath = process.argv[2] || defaultInput;

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

const publicDir = path.resolve('public');
const assetsDir = path.resolve('src/assets');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

async function generate() {
  console.log(`Processing source image: ${inputPath}`);

  // 1. Generate multi-resolution ICO (16x16, 32x32, 48x48)
  const icoSizes = [16, 32, 48];
  const pngBuffers = [];
  for (const size of icoSizes) {
    const buf = await sharp(inputPath)
      .resize(size, size, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    pngBuffers.push({ size, buf });
  }

  const headerLen = 6;
  const dirEntryLen = 16;
  let offset = headerLen + icoSizes.length * dirEntryLen;

  const header = Buffer.alloc(headerLen);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(icoSizes.length, 4); // count

  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntryLen);
    entry.writeUInt8(item.size, 0);
    entry.writeUInt8(item.size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(item.buf.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += item.buf.length;
  }

  const icoBuf = Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buf)]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);
  console.log(`✔ Generated public/favicon.ico (${icoBuf.length} bytes)`);

  // 2. Standalone PNG icons
  const f32 = await sharp(inputPath).resize(32, 32).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), f32);
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), f32);
  console.log(`✔ Generated public/favicon-32x32.png & favicon.png (${f32.length} bytes)`);

  const f16 = await sharp(inputPath).resize(16, 16).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), f16);
  console.log(`✔ Generated public/favicon-16x16.png (${f16.length} bytes)`);

  const appleTouch = await sharp(inputPath)
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);
  console.log(`✔ Generated public/apple-touch-icon.png (${appleTouch.length} bytes)`);

  const pwa192 = await sharp(inputPath).resize(192, 192).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), pwa192);
  console.log(`✔ Generated public/icon-192.png (${pwa192.length} bytes)`);

  const pwa512 = await sharp(inputPath).resize(512, 512).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), pwa512);
  console.log(`✔ Generated public/icon-512.png (${pwa512.length} bytes)`);

  // 3. Compressed high-res site icon (WebP & JPEG) for site use / OpenGraph
  const siteIconJpg = await sharp(inputPath)
    .resize(800, 800)
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon.jpg'), siteIconJpg);
  fs.writeFileSync(path.join(assetsDir, 'icon.jpg'), siteIconJpg);
  console.log(`✔ Generated public/icon.jpg & src/assets/icon.jpg (${siteIconJpg.length} bytes)`);

  const siteIconWebp = await sharp(inputPath).resize(800, 800).webp({ quality: 80 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon.webp'), siteIconWebp);
  console.log(`✔ Generated public/icon.webp (${siteIconWebp.length} bytes)`);

  // 4. Update favicon.svg with embedded compressed icon
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="100%" height="100%">
  <image width="192" height="192" href="data:image/png;base64,${pwa192.toString('base64')}" />
</svg>
`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  console.log(`✔ Generated public/favicon.svg (embedded compressed vector-compatible icon)`);
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
