#!/usr/bin/env node
/**
 * images_optimize.js
 *
 * Simple image optimization script using sharp.
 * - Reads images from ../maisonpardailhe/img (relative to server/)
 * - Produces WebP variants and resized widths into ../maisonpardailhe/img/optimized/
 * - Writes a manifest JSON mapping original -> generated files
 *
 * Usage (from server/):
 *   node scripts/images_optimize.js
 *
 * Environment:
 *   - TARGET_DIR: optional path to the images directory (default ../maisonpardailhe/img)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const DEFAULT_IMG_DIR = path.join(__dirname, '..', '..', 'maisonpardailhe', 'img');
const IMG_DIR = process.env.TARGET_DIR ? path.resolve(process.env.TARGET_DIR) : DEFAULT_IMG_DIR;
const OUT_DIR = path.join(IMG_DIR, 'optimized');

const widths = [400, 800, 1200];
const webpQuality = 80;

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

    // Write a WebP version at original size
    const webpFilename = `${name}.webp`;
    const webpPath = path.join(OUT_DIR, webpFilename);
    await image.webp({ quality: webpQuality }).toFile(webpPath);
    meta.outputs.push({ format: 'webp', path: webpPath, width: info.width, height: info.height });

    // Generate resized WebP variants for target widths
    for (const w of widths) {
      if (!info.width || info.width < w) continue; // skip upscaling
      const resizedName = `${name}-${w}.webp`;
      const resizedPath = path.join(OUT_DIR, resizedName);
      await image.resize({ width: w }).webp({ quality: webpQuality }).toFile(resizedPath);
      meta.outputs.push({ format: 'webp', path: resizedPath, width: w });
    }

    // For JPEG/PNG originals also produce an optimized original-format copy (optional)
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      const optimizedName = `${name}-opt${ext}`;
      const optimizedPath = path.join(OUT_DIR, optimizedName);
      if (ext === '.png') {
        await image.png({ compressionLevel: 8 }).toFile(optimizedPath);
      } else {
        await image.jpeg({ quality: 82 }).toFile(optimizedPath);
      }
      meta.outputs.push({ format: ext.replace('.', ''), path: optimizedPath, width: info.width, height: info.height });
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
  const images = files.filter(f => isImage(f) && !f.startsWith('.'));
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
  main().catch(err => { console.error(err); process.exit(2); });
}
