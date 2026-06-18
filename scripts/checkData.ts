import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config({ override: true });

import type { Timeline, PhotoMetadata, Copywriting } from '../src/types.js';

const DATA_DIR = path.resolve('data');
const PUBLIC_PHOTOS_DIR = path.resolve('public/photos');

let errors = 0;
let warnings = 0;

function error(msg: string) {
  console.error(`[ERROR] ${msg}`);
  errors++;
}

function warn(msg: string) {
  console.warn(`[WARN]  ${msg}`);
  warnings++;
}

function info(msg: string) {
  console.log(`[OK]    ${msg}`);
}

function checkFileExists(filePath: string, label: string): boolean {
  if (!fs.existsSync(filePath)) {
    error(`找不到 ${label}：${filePath}`);
    return false;
  }
  return true;
}

function parseJsonFile<T>(filePath: string, label: string): T | null {
  if (!checkFileExists(filePath, label)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch (e) {
    error(`${label} JSON 解析失敗：${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

function main() {
  console.log('=== 資料驗證開始 ===\n');

  // Check required JSON files
  const metadataFile = path.join(DATA_DIR, 'photo-metadata.json');
  const timelineFile = path.join(DATA_DIR, 'timeline.json');
  const copywritingFile = path.join(DATA_DIR, 'copywriting.json');

  const metadata = parseJsonFile<PhotoMetadata[]>(metadataFile, 'photo-metadata.json');
  const timeline = parseJsonFile<Timeline>(timelineFile, 'timeline.json');
  const copywriting = parseJsonFile<Copywriting>(copywritingFile, 'copywriting.json');

  // Validate metadata
  if (metadata) {
    info(`photo-metadata.json：${metadata.length} 筆資料`);
    let missingFields = 0;
    for (const m of metadata) {
      if (!m.fileName || !m.scene || typeof m.importanceScore !== 'number') {
        missingFields++;
      }
    }
    if (missingFields > 0) {
      warn(`有 ${missingFields} 筆 metadata 缺少必要欄位`);
    }
  }

  // Validate timeline
  if (timeline) {
    const totalMin = Math.floor(timeline.totalDuration / 60);
    const totalSec = timeline.totalDuration % 60;
    info(`timeline.json：總時長 ${totalMin}分 ${totalSec}秒`);

    if (timeline.totalDuration < 300) {
      warn(`影片時長不足 5 分鐘（${totalMin}分${totalSec}秒），照片數量可能太少`);
    }
    if (timeline.totalDuration > 720) {
      warn(`影片時長超過 12 分鐘（${totalMin}分${totalSec}秒），建議縮短`);
    }

    const allTimelineFileNames = new Set<string>();
    let missingPhotos = 0;
    let captionTooLong = 0;

    for (const section of timeline.sections) {
      if (section.photos.length < 3) {
        warn(`段落「${section.title}」照片數量不足（${section.photos.length} 張，建議至少 3 張）`);
      }

      for (const photo of section.photos) {
        const photoPath = path.join(PUBLIC_PHOTOS_DIR, photo.fileName);
        if (!fs.existsSync(photoPath)) {
          error(`照片不存在：${photo.fileName}（段落：${section.title}）`);
          missingPhotos++;
        }
        allTimelineFileNames.add(photo.fileName);

        if (photo.caption && photo.caption.length > 20) {
          warn(`字幕過長（${photo.caption.length} 字）：${photo.caption}`);
          captionTooLong++;
        }
      }
    }

    if (missingPhotos === 0) info(`所有照片檔案存在於 public/photos/`);
    if (captionTooLong > 0) warn(`${captionTooLong} 個字幕超過 20 字，可能在影片中顯示不佳`);

    // Check for unused photos
    if (metadata) {
      const usablePhotos = metadata.filter(m => m.suggestedUse !== 'skip');
      const unusedCount = usablePhotos.filter(m => !allTimelineFileNames.has(m.fileName)).length;
      if (unusedCount > 0) {
        warn(`有 ${unusedCount} 張可用照片未被放入時間軸`);
      }
    }
  }

  // Validate copywriting
  if (copywriting) {
    const hasPlaceholder =
      copywriting.intro.subtitle.includes('○○') ||
      copywriting.intro.title.includes('○○');
    if (hasPlaceholder) {
      warn(`copywriting.json 中仍有未填寫的 ○○ 佔位符，請編輯 data/copywriting.json 填入姓名與單位`);
    } else {
      info(`copywriting.json：文案已填寫`);
    }
  }

  // Check cover photo
  const coverPath = path.join(PUBLIC_PHOTOS_DIR, 'cover.jpg');
  if (fs.existsSync(coverPath)) {
    info('封面圖 cover.jpg 存在');
  } else {
    warn('找不到 public/photos/cover.jpg，開場場景將無法顯示封面圖');
  }

  console.log(`\n=== 驗證結束 ===`);
  console.log(`錯誤：${errors} 個，警告：${warnings} 個`);

  if (errors > 0) {
    console.error('\n請修正以上錯誤後再執行 render。');
    process.exit(1);
  } else {
    console.log('\n資料驗證通過，可以開始 render！');
  }
}

main();
