import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const PHOTOS_DIR = path.resolve('public/photos');
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 82;

async function compress(filePath: string): Promise<{ before: number; after: number }> {
  const before = fs.statSync(filePath).size;
  const tmp = filePath + '.tmp';

  await sharp(filePath)
    .rotate() // auto-rotate based on EXIF
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(tmp);

  fs.renameSync(tmp, filePath);
  const after = fs.statSync(filePath).size;
  return { before, after };
}

async function main() {
  const files = fs.readdirSync(PHOTOS_DIR).filter(f => /\.(jpg|jpeg)$/i.test(f));
  console.log(`壓縮 ${files.length} 張照片（最大 ${MAX_DIMENSION}px，品質 ${JPEG_QUALITY}）\n`);

  let totalBefore = 0;
  let totalAfter = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(PHOTOS_DIR, file);
    try {
      const { before, after } = await compress(filePath);
      totalBefore += before;
      totalAfter += after;
      const saved = Math.round((1 - after / before) * 100);
      if ((i + 1) % 10 === 0 || i === files.length - 1) {
        console.log(`[${i + 1}/${files.length}] ${file} — ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(1)}MB (-${saved}%)`);
      }
    } catch (err) {
      console.error(`  ✗ ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n完成！`);
  console.log(`  壓縮前：${(totalBefore / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  壓縮後：${(totalAfter / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  節省：${Math.round((1 - totalAfter / totalBefore) * 100)}%`);
}

main().catch(err => { console.error(err); process.exit(1); });
