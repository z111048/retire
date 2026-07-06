/**
 * 從 assets/new/ 匯入素材並產生時間軸。
 *
 * 素材規則（由使用者整理）：
 *   - 資料夾名稱：`{章節序號}-{章節標題}`
 *   - 照片檔名：`{流水號}-{播放時顯示的字幕}.jpg`
 *   - 影片檔名：`{流水號}-{字幕}(剪輯HHMMSS至HHMMSS[及HHMMSS至HHMMSS...]).mov|mp4`
 *   - `0-影片封面-*.png`：封面圖
 *
 * 產出：
 *   - public/photos-orig/sN-NN.jpg   全解析度（render 用）
 *   - public/photos/sN-NN.jpg        壓縮版（網頁播放器用）+ cover.jpg
 *   - public/videos/sN-NNvK.mp4      依剪輯資訊切出的影片片段
 *   - data/timeline.json             照片時長自動配平至歌曲總長
 *   - data/filename-map.json         新檔名 → 原始檔名對照
 *
 * 章節標題/副標來自 data/copywriting.json 的 sections（依序對應資料夾序號）。
 */
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import sharp from 'sharp';
import type { Copywriting, Timeline, TimelineItem, TimelineSection } from '../src/types.js';

const FPS = 30;
const INTRO_S = 6;
const TITLE_S = 3.5; // 需與 src/constants.ts 的 SECTION_TITLE_DURATION_S 一致
const OUTRO_S = 21;

// 各章節照片節奏權重（1 = 基準，配平後仍貼齊歌曲總長）
// 1 十八姑娘（起點回憶）與 4 阿迪粉絲放慢、8 致局花（情緒收束）最慢、7 換我們歡送你（同質祝福照多）加快
const SECTION_WEIGHTS: Record<number, number> = { 1: 1.35, 4: 1.3, 7: 0.85, 8: 1.45 };

const ASSETS_DIR = path.resolve('assets/new');
const PHOTOS_DIR = path.resolve('public/photos');
const PHOTOS_ORIG_DIR = path.resolve('public/photos-orig');
const VIDEOS_DIR = path.resolve('public/videos');
const DATA_DIR = path.resolve('data');
const BGM_PATH = path.resolve('public/bgm.mp3');

const WEB_MAX_DIMENSION = 1280;
const WEB_JPEG_QUALITY = 82;

interface RawItem {
  ordinal: number;
  file: string;      // 原始檔名（含資料夾相對路徑）
  caption: string;
  isVideo: boolean;
  clipRanges: Array<{ start: number; end: number }>; // 秒
}

function hhmmssToSeconds(s: string): number {
  const h = parseInt(s.slice(0, 2), 10);
  const m = parseInt(s.slice(2, 4), 10);
  const sec = parseInt(s.slice(4, 6), 10);
  return h * 3600 + m * 60 + sec;
}

function probeDuration(file: string): number {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

function parseItem(fileName: string): RawItem | null {
  if (fileName.includes('(刪)')) {
    console.log(`  🚫 標記排除：${fileName}`);
    return null;
  }
  const m = fileName.match(/^(\d+)-(.+)\.(jpe?g|png|mov|mp4)$/i);
  if (!m) return null;
  const ordinal = parseInt(m[1], 10);
  let caption = m[2];
  const isVideo = /^(mov|mp4)$/i.test(m[3]);

  const clipRanges: Array<{ start: number; end: number }> = [];
  if (isVideo) {
    const clipMatch = caption.match(/[（(]剪輯([^)）]*)[)）]/);
    if (clipMatch) {
      for (const r of clipMatch[1].matchAll(/(\d{6})\s*[至\-~]\s*(\d{6})/g)) {
        clipRanges.push({ start: hhmmssToSeconds(r[1]), end: hhmmssToSeconds(r[2]) });
      }
      caption = caption.replace(clipMatch[0], '');
    }
    caption = caption.replace(/\s+/g, '');
  }
  return { ordinal, file: fileName, caption: caption.trim(), isVideo, clipRanges };
}

function cutClip(src: string, dest: string, start: number, end: number) {
  if (fs.existsSync(dest)) {
    console.log(`  ↷ 已存在，略過剪輯：${path.basename(dest)}`);
    return;
  }
  console.log(`  ✂ 剪輯 ${path.basename(src)} ${start}s–${end}s → ${path.basename(dest)}`);
  execFileSync('ffmpeg', [
    '-y', '-ss', String(start), '-to', String(end), '-i', src,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart',
    dest,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
}

async function compressToWeb(src: string, dest: string, maxDim = WEB_MAX_DIMENSION, quality = WEB_JPEG_QUALITY) {
  await sharp(src)
    .rotate()
    .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toFile(dest);
}

async function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`找不到素材目錄 ${ASSETS_DIR}，請先解壓縮素材 zip。`);
    process.exit(1);
  }
  if (!fs.existsSync(BGM_PATH)) {
    console.error(`找不到 ${BGM_PATH}，請先放入背景音樂。`);
    process.exit(1);
  }
  for (const dir of [PHOTOS_DIR, PHOTOS_ORIG_DIR, VIDEOS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const copywriting = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'copywriting.json'), 'utf-8')
  ) as Copywriting;

  const songDuration = probeDuration(BGM_PATH);
  console.log(`歌曲長度：${songDuration.toFixed(1)}s`);

  const filenameMap: Record<string, string> = {};

  // ---- 封面 ----
  const coverFile = fs.readdirSync(ASSETS_DIR).find(f => /^0-.*封面.*\.(png|jpe?g)$/i.test(f));
  if (coverFile) {
    await compressToWeb(path.join(ASSETS_DIR, coverFile), path.join(PHOTOS_DIR, 'cover.jpg'), 1920, 88);
    filenameMap['cover.jpg'] = coverFile;
    console.log(`封面：${coverFile} → photos/cover.jpg`);
  } else {
    console.warn('⚠ 找不到封面檔（0-影片封面-*.png）');
  }

  // ---- 掃描章節資料夾 ----
  const sectionDirs = fs.readdirSync(ASSETS_DIR)
    .filter(d => fs.statSync(path.join(ASSETS_DIR, d)).isDirectory())
    .map(d => ({ dir: d, num: parseInt(d.split('-')[0], 10), title: d.replace(/^\d+-/, '') }))
    .filter(d => Number.isFinite(d.num))
    .sort((a, b) => a.num - b.num);

  if (sectionDirs.length !== copywriting.sections.length) {
    console.warn(`⚠ 資料夾數（${sectionDirs.length}）與 copywriting.sections 數（${copywriting.sections.length}）不一致，將依序對應。`);
  }

  const sections: TimelineSection[] = [];
  let photoCount = 0;

  for (const [secIndex, { dir, num, title }] of sectionDirs.entries()) {
    const meta = copywriting.sections[secIndex];
    const items = fs.readdirSync(path.join(ASSETS_DIR, dir))
      .map(parseItem)
      .filter((x): x is RawItem => x !== null)
      .sort((a, b) => a.ordinal - b.ordinal || a.file.localeCompare(b.file, 'zh-Hant'));

    const timelineItems: TimelineItem[] = [];
    let seq = 0;

    for (const item of items) {
      seq++;
      const srcPath = path.join(ASSETS_DIR, dir, item.file);

      if (item.isVideo) {
        if (item.clipRanges.length === 0) {
          const dur = probeDuration(srcPath);
          item.clipRanges.push({ start: 0, end: Math.min(dur, 30) });
          console.warn(`⚠ ${item.file} 檔名無剪輯資訊，取前 ${item.clipRanges[0].end}s`);
        }
        item.clipRanges.forEach((range, k) => {
          const newName = `s${num}-${String(seq).padStart(2, '0')}v${k + 1}.mp4`;
          cutClip(srcPath, path.join(VIDEOS_DIR, newName), range.start, range.end);
          filenameMap[newName] = path.join(dir, item.file);
          timelineItems.push({
            type: 'video',
            fileName: newName,
            caption: item.caption,
            durationFrames: Math.round((range.end - range.start) * FPS),
          });
        });
      } else {
        const newName = `s${num}-${String(seq).padStart(2, '0')}.jpg`;
        fs.copyFileSync(srcPath, path.join(PHOTOS_ORIG_DIR, newName));
        await compressToWeb(srcPath, path.join(PHOTOS_DIR, newName));
        filenameMap[newName] = path.join(dir, item.file);
        timelineItems.push({
          type: 'photo',
          fileName: newName,
          caption: item.caption,
          durationFrames: 0, // 稍後配平
        });
        photoCount++;
      }
    }

    sections.push({
      id: meta?.id ?? `sec${num}`,
      section: title,
      title: meta?.title ?? title,
      subtitle: meta?.subtitle ?? '',
      photos: timelineItems,
    });
    console.log(`章節 ${num}「${title}」：${timelineItems.length} 個項目`);
  }

  // ---- 照片時長配平：讓影片總長貼齊歌曲長度 ----
  const totalFrames = Math.floor(songDuration * FPS);
  const fixedFrames =
    INTRO_S * FPS +
    sections.length * TITLE_S * FPS +
    OUTRO_S * FPS +
    sections.flatMap(s => s.photos).filter(i => i.type === 'video')
      .reduce((sum, i) => sum + i.durationFrames, 0);

  const photoBudget = totalFrames - fixedFrames;
  if (photoBudget < photoCount * FPS * 1.5) {
    console.warn(`⚠ 照片時間預算不足（平均 ${(photoBudget / photoCount / FPS).toFixed(2)}s/張），節奏會偏快`);
  }

  interface Slot { item: TimelineItem; weight: number }
  const slots: Slot[] = [];
  sections.forEach((sec, i) => {
    const weight = SECTION_WEIGHTS[sectionDirs[i].num] ?? 1;
    for (const item of sec.photos) {
      if (item.type !== 'video') slots.push({ item, weight });
    }
  });
  const totalWeight = slots.reduce((s, x) => s + x.weight, 0);
  const unit = photoBudget / totalWeight;
  for (const slot of slots) slot.item.durationFrames = Math.round(slot.weight * unit);

  // 修正四捨五入造成的殘差，從最後幾張每張 ±1 frame
  let drift = slots.reduce((s, x) => s + x.item.durationFrames, 0) - photoBudget;
  for (let i = slots.length - 1; drift !== 0 && i >= 0; i--) {
    const step = Math.sign(drift);
    slots[i].item.durationFrames -= step;
    drift -= step;
  }

  const timeline: Timeline = {
    totalDuration: totalFrames / FPS,
    sections,
  };

  fs.writeFileSync(path.join(DATA_DIR, 'timeline.json'), JSON.stringify(timeline, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'filename-map.json'), JSON.stringify(filenameMap, null, 2));

  const videoCount = sections.flatMap(s => s.photos).filter(i => i.type === 'video').length;
  const avg = (slots.reduce((s, x) => s + x.item.durationFrames, 0) / slots.length / FPS).toFixed(2);
  console.log(`\n完成！${photoCount} 張照片（平均 ${avg}s/張）、${videoCount} 段影片片段`);
  console.log(`影片總長 ${(totalFrames / FPS).toFixed(1)}s（歌曲 ${songDuration.toFixed(1)}s）`);
}

main().catch(err => { console.error(err); process.exit(1); });
