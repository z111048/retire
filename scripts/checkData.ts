import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

import type { Timeline, Copywriting } from '../src/types.js';

const DATA_DIR = path.resolve('data');
const PUBLIC_PHOTOS_DIR = path.resolve('public/photos');
const PUBLIC_PHOTOS_ORIG_DIR = path.resolve('public/photos-orig');
const PUBLIC_VIDEOS_DIR = path.resolve('public/videos');

const FPS = 30;

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

function parseJsonFile<T>(filePath: string, label: string): T | null {
  if (!fs.existsSync(filePath)) {
    error(`找不到 ${label}：${filePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch (e) {
    error(`${label} JSON 解析失敗：${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

function main() {
  console.log('=== 資料驗證開始 ===\n');

  const timeline = parseJsonFile<Timeline>(path.join(DATA_DIR, 'timeline.json'), 'timeline.json');
  const copywriting = parseJsonFile<Copywriting>(path.join(DATA_DIR, 'copywriting.json'), 'copywriting.json');

  // Validate timeline
  if (timeline) {
    const totalMin = Math.floor(timeline.totalDuration / 60);
    const totalSec = Math.round(timeline.totalDuration % 60);
    info(`timeline.json：總時長 ${totalMin}分 ${totalSec}秒`);

    let missingFiles = 0;
    let captionTooLong = 0;
    let itemCount = 0;
    let sumFrames = 0;

    for (const section of timeline.sections) {
      if (section.photos.length === 0) {
        warn(`段落「${section.title}」沒有任何項目`);
      }

      for (const item of section.photos) {
        itemCount++;
        sumFrames += item.durationFrames;

        if (!Number.isInteger(item.durationFrames) || item.durationFrames <= 0) {
          error(`durationFrames 無效（${item.durationFrames}）：${item.fileName}`);
        }

        if (item.type === 'video') {
          if (!fs.existsSync(path.join(PUBLIC_VIDEOS_DIR, item.fileName))) {
            error(`影片不存在：videos/${item.fileName}（段落：${section.title}）`);
            missingFiles++;
          }
        } else if (item.type === 'heart-collage') {
          // 動態算繪場景，沒有實體照片檔，只需確認 Q 版大頭貼素材存在
          const avatarDir = path.resolve('public/qavatars');
          if (!fs.existsSync(avatarDir) || fs.readdirSync(avatarDir).length === 0) {
            error(`找不到 Q 版大頭貼素材：public/qavatars/（段落：${section.title}）`);
            missingFiles++;
          }
        } else {
          if (!fs.existsSync(path.join(PUBLIC_PHOTOS_ORIG_DIR, item.fileName))) {
            error(`照片不存在：photos-orig/${item.fileName}（段落：${section.title}）`);
            missingFiles++;
          }
          if (!fs.existsSync(path.join(PUBLIC_PHOTOS_DIR, item.fileName))) {
            warn(`網頁版壓縮照片不存在：photos/${item.fileName}（網頁播放器會缺圖）`);
          }
        }

        if (item.caption && item.caption.length > 24) {
          warn(`字幕過長（${item.caption.length} 字）：${item.caption}`);
          captionTooLong++;
        }
      }
    }

    if (missingFiles === 0) info(`所有 ${itemCount} 個項目的檔案都存在`);
    if (captionTooLong > 0) warn(`${captionTooLong} 個字幕超過 24 字，可能在影片中顯示不佳`);

    // 時長一致性：intro + titles + items + outro 應等於 totalDuration
    const expectedFrames = Math.round(timeline.totalDuration * FPS);
    const fixedFrames = (6 + timeline.sections.length * 3.5 + 21) * FPS;
    const actualFrames = fixedFrames + sumFrames;
    if (actualFrames !== expectedFrames) {
      warn(`場景總長（${(actualFrames / FPS).toFixed(1)}s）與 totalDuration（${timeline.totalDuration.toFixed(1)}s）不一致，差 ${((actualFrames - expectedFrames) / FPS).toFixed(2)}s`);
    } else {
      info(`場景總長與 totalDuration 一致（${(actualFrames / FPS).toFixed(1)}s）`);
    }

    // 背景音樂長度比對
    const bgmPath = path.resolve('public/bgm.mp3');
    if (fs.existsSync(bgmPath)) {
      try {
        const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', bgmPath], { encoding: 'utf-8' });
        const bgmDur = parseFloat(out.trim());
        const diff = Math.abs(bgmDur - timeline.totalDuration);
        if (diff > 2) {
          warn(`背景音樂長度（${bgmDur.toFixed(1)}s）與影片總長（${timeline.totalDuration.toFixed(1)}s）差 ${diff.toFixed(1)}s`);
        } else {
          info(`背景音樂長度與影片總長一致（差 ${diff.toFixed(2)}s）`);
        }
      } catch {
        warn('無法用 ffprobe 檢查 bgm.mp3 長度');
      }
    } else {
      error('找不到 public/bgm.mp3');
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

  // Check cover photo（開場用 cover-wide.jpg，一次性手動產生，見 scripts/importAssets.ts 註解）
  if (fs.existsSync(path.join(PUBLIC_PHOTOS_DIR, 'cover-wide.jpg'))) {
    info('封面圖 cover-wide.jpg 存在');
  } else {
    warn('找不到 public/photos/cover-wide.jpg，開場場景將無法顯示封面圖');
  }

  // Check lyrics timing
  const lyrics = parseJsonFile<Array<{ start: number; end: number; text: string }>>(
    path.join(DATA_DIR, 'lyrics-timing.json'), 'lyrics-timing.json'
  );
  if (lyrics) {
    if (lyrics.length === 0) {
      warn('lyrics-timing.json 是空的，影片不會顯示歌詞字幕（需提供歌詞後重新對時）');
    } else {
      info(`lyrics-timing.json：${lyrics.length} 句歌詞`);
      for (let i = 0; i < lyrics.length; i++) {
        if (lyrics[i].end <= lyrics[i].start) error(`歌詞第 ${i + 1} 句 end <= start`);
        if (i > 0 && lyrics[i].start < lyrics[i - 1].end) warn(`歌詞第 ${i + 1} 句與前一句時間重疊`);
      }
    }
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
