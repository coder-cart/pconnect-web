import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = path.join(root, 'public', 'brand');
const iconsDir = path.join(root, 'public', 'icons');
const source = path.join(brandDir, '_source-mark-black.png');

const meta = await sharp(source).metadata();
console.log('source', meta.width, meta.height, meta.format, 'alpha=' + meta.hasAlpha);

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  // Remove near-black canvas only; keep white / blue / teal / yellow.
  if (r < 28 && g < 28 && b < 28) {
    data[i + 3] = 0;
  }
}

const transparent = await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
}).png().toBuffer();

const trimmed = await sharp(transparent).trim({ threshold: 8 }).png().toBuffer();
const trimMeta = await sharp(trimmed).metadata();
console.log('trimmed', trimMeta.width, trimMeta.height);

const transparentBg = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = 1024;
const pad = Math.round(canvas * 0.12);
const inner = canvas - pad * 2;
const logoOnCanvas = await sharp(trimmed)
  .resize(inner, inner, { fit: 'contain', background: transparentBg })
  .png()
  .toBuffer();
const mark1024 = await sharp({
  create: { width: canvas, height: canvas, channels: 4, background: transparentBg },
})
  .composite([{ input: logoOnCanvas, gravity: 'centre' }])
  .png()
  .toBuffer();

const markPath = path.join(brandDir, 'colabdeck-mark.png');
await sharp(mark1024).toFile(markPath);
await sharp(mark1024).resize(512, 512).png().toFile(path.join(brandDir, 'colabdeck-lockup.png'));
await sharp(mark1024).resize(512, 512).png().toFile(path.join(brandDir, 'colabdeck-lockup-dark.png'));

await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: { r: 15, g: 17, b: 21, alpha: 1 },
  },
})
  .composite([
    {
      input: await sharp(mark1024).resize(360, 360).png().toBuffer(),
      gravity: 'centre',
    },
  ])
  .png()
  .toFile(path.join(brandDir, 'colabdeck-og.png'));

async function writeIcon(size, out, bg) {
  const logoSize = Math.round(size * (bg ? 0.62 : 0.78));
  const logo = await sharp(mark1024)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const background = bg ?? { r: 0, g: 0, b: 0, alpha: 0 };
  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(out);
}

fs.mkdirSync(iconsDir, { recursive: true });

await writeIcon(32, path.join(root, 'public', 'favicon.png'));
await writeIcon(192, path.join(iconsDir, 'icon-192.png'));
await writeIcon(512, path.join(iconsDir, 'icon-512.png'));

const purple = { r: 61, g: 58, b: 223, alpha: 1 };
await writeIcon(192, path.join(iconsDir, 'icon-192-maskable.png'), purple);
await writeIcon(512, path.join(iconsDir, 'icon-512-maskable.png'), purple);
await writeIcon(512, path.join(iconsDir, 'icon-512-dark.png'), {
  r: 15,
  g: 17,
  b: 21,
  alpha: 1,
});

console.log('brand assets written');
for (const rel of [
  'public/brand/colabdeck-mark.png',
  'public/favicon.png',
  'public/icons/icon-192.png',
  'public/icons/icon-512.png',
  'public/icons/icon-192-maskable.png',
  'public/icons/icon-512-maskable.png',
]) {
  const m = await sharp(path.join(root, rel)).metadata();
  console.log(rel, `${m.width}x${m.height}`, 'alpha=' + m.hasAlpha);
}
