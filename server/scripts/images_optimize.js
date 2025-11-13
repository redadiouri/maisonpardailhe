#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const _ROOT = path.join(__dirname, '..');
const DEFAULT_IMG_DIR = path.join(__dirname, '..', '..', 'maisonpardailhe', 'img');
const IMG_DIR = process.env.TARGET_DIR ? path.resolve(process.env.TARGET_DIR) : DEFAULT_IMG_DIR;
const OUT_DIR = path.join(IMG_DIR, 'optimized');

const widths = [400, 800, 1200, 1600];
const webpQuality = 82;
const jpegQuality = 85;
async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

function isImage(name) {
  return /\.(jpe?g|png)$/i.test(name);
}

async function processImage(file) {
  const inputPath = path.join(IMG_DIR, file);
  const name = path.parse(file).name;
  const ext = path.parse(file).ext.toLowerCase();
  const meta = { original: inputPath, outputs: [] };

  try {
    const image = sharp(inputPath);
    const info = await image.metadata();

    const webpFilename = `${name}.webp`;
    const webpPath = path.join(OUT_DIR, webpFilename);
    await image.webp({ quality: webpQuality }).toFile(webpPath);
    meta.outputs.push({ format: 'webp', path: webpPath, width: info.width, height: info.height });

    for (const w of widths) {
      if (!info.width || info.width < w) continue;
      const resizedName = `${name}-${w}.webp`;
      const resizedPath = path.join(OUT_DIR, resizedName);
      await image.resize({ width: w }).webp({ quality: webpQuality }).toFile(resizedPath);
      meta.outputs.push({ format: 'webp', path: resizedPath, width: w });
    }

    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      const optimizedName = `${name}-opt${ext}`;
      const optimizedPath = path.join(OUT_DIR, optimizedName);
      if (ext === '.png') {
        await image.png({ compressionLevel: 9, quality: 85 }).toFile(optimizedPath);
      } else {
        await image.jpeg({ quality: jpegQuality, mozjpeg: true }).toFile(optimizedPath);
      }
      meta.outputs.push({
        format: ext.replace('.', ''),
        path: optimizedPath,
        width: info.width,
        height: info.height
      });
    }

    return meta;
  } catch (err) {
    console.error('Failed processing', inputPath, err && err.message);
    return { original: inputPath, error: err && String(err) };
  }
}

async function main() {
  console.log('Image optimizer — reading from', IMG_DIR);
  await ensureDir(OUT_DIR);
  const files = await fs.promises.readdir(IMG_DIR);
  const images = files.filter((f) => isImage(f) && !f.startsWith('.'));
  if (!images.length) {
    console.log('No source images found in', IMG_DIR);
    return;
  }

  const manifest = {};
  for (const img of images) {
    console.log('Optimizing', img);
    const result = await processImage(img);
    manifest[img] = result.outputs || result;
  }

  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Optimization complete — outputs in', OUT_DIR);
  console.log('Manifest written to', manifestPath);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}
