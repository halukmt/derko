#!/usr/bin/env node
/**
 * Image Optimization Script (sharp based)
 * Generates AVIF & WebP responsive variants for apartment images.
 *
 * For each PNG in assets/img/wohnungen/<apt>/ we create sizes: 400, 800, 1200 (except if source smaller).
 * Output filenames: <basename>-400.webp, <basename>-400.avif, ...
 * Existing optimized files are skipped unless --force specified.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'assets', 'img', 'wohnungen');
const TARGET_WIDTHS = [400,800,1200];
const FORCE = process.argv.includes('--force');

async function optimizeFile(full){
  const dir = path.dirname(full);
  const base = path.basename(full, path.extname(full));
  const input = sharp(full);
  const meta = await input.metadata();
  for (const w of TARGET_WIDTHS){
    if(meta.width && meta.width < w) continue; // don't upscale
    for (const fmt of ['webp','avif']){
      const outName = `${base}-${w}.${fmt}`;
      const outPath = path.join(dir, outName);
      if(!FORCE && fs.existsSync(outPath)) continue;
      let pipeline = sharp(full).resize({ width: w });
      if(fmt==='webp') pipeline = pipeline.webp({ quality: 78, effort: 4 });
      else pipeline = pipeline.avif({ quality: 50, effort: 4 });
      await pipeline.toFile(outPath);
      console.log('Generated', path.relative(ROOT, outPath));
    }
  }
}

async function run(){
  if(!fs.existsSync(IMG_DIR)) throw new Error('Image dir missing: '+IMG_DIR);
  const apartments = fs.readdirSync(IMG_DIR).filter(f=>fs.statSync(path.join(IMG_DIR,f)).isDirectory());
  for (const apt of apartments){
    const dir = path.join(IMG_DIR, apt);
    const files = fs.readdirSync(dir).filter(f=>/\.png$/i.test(f));
    for (const f of files){
      try{ await optimizeFile(path.join(dir,f)); } catch(e){ console.warn('Skip', f, e.message); }
    }
  }
  console.log('Done.');
}
run().catch(e=>{ console.error(e); process.exit(1); });
