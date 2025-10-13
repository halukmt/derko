#!/usr/bin/env node
/**
 * Image Optimization Script (sharp based)
 * Generates AVIF & WebP responsive variants for images.
 *
 * Apartments: For each PNG in assets/img/wohnungen/<apt>/ create sizes: 400, 800, 1200 (except if source smaller).
 * Allgemein:  For each PNG/JPG in assets/img/allgemein/ create sizes: 400, 800, 1200 (except if source smaller).
 * Output filenames: <basename>-400.webp, <basename>-400.avif, ...
 * Existing optimized files are skipped unless --force specified.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..', '..');
const IMG_WOHNUNGEN_DIR = path.join(ROOT, 'assets', 'img', 'wohnungen');
const IMG_ALLGEMEIN_DIR = path.join(ROOT, 'assets', 'img', 'allgemein');
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
  // Additionally, for files named 'main', emit unsuffixed main.avif/webp to enable simple <picture> usage without srcset
  if (base === 'main'){
    for (const fmt of ['webp','avif']){
      const outName = `main.${fmt}`;
      const outPath = path.join(dir, outName);
      if(!FORCE && fs.existsSync(outPath)) continue;
      let pipeline = sharp(full);
      if(fmt==='webp') pipeline = pipeline.webp({ quality: 78, effort: 4 });
      else pipeline = pipeline.avif({ quality: 50, effort: 4 });
      await pipeline.toFile(outPath);
      console.log('Generated', path.relative(ROOT, outPath));
    }
  }
}

async function optimizeWohnungen(onlySub){
  if(!fs.existsSync(IMG_WOHNUNGEN_DIR)) return;
  const candidates = onlySub ? [onlySub] : fs.readdirSync(IMG_WOHNUNGEN_DIR);
  const apartments = candidates.filter(f=>{
    const p = path.join(IMG_WOHNUNGEN_DIR,f);
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  });
  for (const apt of apartments){
    const dir = path.join(IMG_WOHNUNGEN_DIR, apt);
    const files = fs.readdirSync(dir).filter(f=>/\.(png|jpe?g)$/i.test(f));
    for (const f of files){
      try{ await optimizeFile(path.join(dir,f)); } catch(e){ console.warn('Skip', f, e.message); }
    }
  }
}

async function optimizeAllgemein(){
  if(!fs.existsSync(IMG_ALLGEMEIN_DIR)) return;
  const files = fs.readdirSync(IMG_ALLGEMEIN_DIR).filter(f=>/\.(png|jpe?g)$/i.test(f));
  for (const f of files){
    try{ await optimizeFile(path.join(IMG_ALLGEMEIN_DIR,f)); } catch(e){ console.warn('Skip', f, e.message); }
  }
}

async function run(){
  // Optional arg: a specific wohnungen subfolder name; passing 'allgemein' optimizes only common images
  // Properly parse CLI args: ignore node executable and script path
  const userArgs = process.argv.slice(2).filter(a => a !== '--force');
  const only = userArgs.length ? userArgs[0] : undefined;
  if(only && /allgemein/i.test(only)){
    await optimizeAllgemein();
  } else {
    await optimizeWohnungen(only ? path.basename(only) : undefined);
    await optimizeAllgemein();
  }
  console.log('Done.');
}
run().catch(e=>{ console.error(e); process.exit(1); });
