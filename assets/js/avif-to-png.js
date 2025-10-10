#!/usr/bin/env node
/**
 * Simple converter: AVIF -> PNG for a given apartment folder
 * Usage: node assets/js/avif-to-png.js assets/img/wohnungen/dus_airport
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function convertDir(dir){
  if(!fs.existsSync(dir)) throw new Error('Dir not found: '+dir);
  const files = fs.readdirSync(dir).filter(f=>/\.avif$/i.test(f));
  for (const f of files){
    const inPath = path.join(dir, f);
    const base = path.basename(f, path.extname(f));
    const outPath = path.join(dir, base + '.png');
    if(fs.existsSync(outPath)) { console.log('Skip existing', outPath); continue; }
    await sharp(inPath).png({ quality: 90, compressionLevel: 9, palette: false }).toFile(outPath);
    console.log('Converted', f, '->', path.basename(outPath));
  }
}

const target = process.argv[2];
if(!target){
  console.error('Usage: node assets/js/avif-to-png.js <folder>');
  process.exit(1);
}
convertDir(path.resolve(target)).catch(e=>{ console.error(e); process.exit(1); });
