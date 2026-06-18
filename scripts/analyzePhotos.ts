import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ override: true });

import type { PhotoMetadata, FilenameMap } from '../src/types.js';

const IMAGES_DIR = path.resolve('images');
const PUBLIC_PHOTOS_DIR = path.resolve('public/photos');
const DATA_DIR = path.resolve('data');
const METADATA_FILE = path.join(DATA_DIR, 'photo-metadata.json');
const FILENAME_MAP_FILE = path.join(DATA_DIR, 'filename-map.json');
const COVER_SRC = path.resolve('影片封面.jpg');

const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const DELAY_MS = 900;
const MAX_RETRIES = 3;
const BATCH_SAVE_EVERY = 5;

const ANALYSIS_PROMPT = `你是一位退休紀念影片的策劃助理。請仔細分析這張照片，並以JSON格式回傳分析結果。

這是一位台灣政府機關公務員的榮退紀念影片，拍攝時間跨越數十年的公職生涯。

請根據照片內容回傳以下JSON（不要有任何額外說明，只回傳純JSON）：

{
  "summary": "一句話描述照片內容（繁體中文，20字以內）",
  "scene": "work或event或group_photo或celebration或daily或award或dining或travel或other（只能選其中一個）",
  "peopleCount": 照片中人數（數字，0代表無人）,
  "mood": ["溫馨", "歡樂", "正式", "懷念"]中選1-3個最符合的,
  "tags": ["標籤1", "標籤2"]（2-5個關鍵字標籤，繁體中文）,
  "possiblePeriod": "推測時期，例如：民國90年代、2010年代、近期等",
  "importanceScore": 1到5的整數,
  "caption": "適合在影片中顯示的繁體中文字幕（15字以內，溫馨有感情）",
  "suggestedUse": "main或montage或skip（只能選其中一個）",
  "confidence": 0到1的小數
}

評分標準：
- importanceScore 5：清晰的人物合照、重要儀式、感人時刻
- importanceScore 4：活動記錄、工作情景、同事互動
- importanceScore 3：一般活動照
- importanceScore 2：模糊、角度差、或難以辨識的照片
- importanceScore 1：重複、純風景、或與主題無關

suggestedUse 判斷：
- main：建議作為主要展示
- montage：適合快速蒙太奇片段
- skip：建議不使用（模糊/重複/無關）

請避免猜測個人姓名，重點在場景、情緒與整體氛圍。`;

function safeFileName(original: string): string {
  const ext = path.extname(original).toLowerCase();
  const base = path.basename(original, path.extname(original));
  const safeStem = base.replace(/[^\w\-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return (safeStem || 'photo') + '.jpg';
}

function shortHash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').slice(0, 6);
}

function buildFilenameMap(originals: string[]): FilenameMap {
  const map: FilenameMap = {};
  const usedSafe = new Map<string, string[]>();

  for (const orig of originals) {
    const safe = safeFileName(orig);
    if (!usedSafe.has(safe)) usedSafe.set(safe, []);
    usedSafe.get(safe)!.push(orig);
  }

  for (const [safe, group] of usedSafe.entries()) {
    if (group.length === 1) {
      map[group[0]] = safe;
    } else {
      for (const orig of group) {
        const ext = '.jpg';
        const stem = safe.replace(/\.jpg$/, '');
        map[orig] = `${stem}_${shortHash(orig)}${ext}`;
      }
    }
  }

  return map;
}

function loadExistingMetadata(): Map<string, PhotoMetadata> {
  if (!fs.existsSync(METADATA_FILE)) return new Map();
  const arr: PhotoMetadata[] = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
  return new Map(arr.map(m => [m.fileName, m]));
}

function saveMetadata(map: Map<string, PhotoMetadata>): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(METADATA_FILE, JSON.stringify(Array.from(map.values()), null, 2), 'utf-8');
}

function loadExistingFilenameMap(): FilenameMap {
  if (!fs.existsSync(FILENAME_MAP_FILE)) return {};
  return JSON.parse(fs.readFileSync(FILENAME_MAP_FILE, 'utf-8'));
}

function parseGeminiJson(text: string): object | null {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzeWithGemini(
  model: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']>,
  imagePath: string,
  fileName: string,
  retryCount = 0
): Promise<PhotoMetadata | null> {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  const mimeType = mimeMap[ext] ?? 'image/jpeg';

  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');

  const prompt = retryCount > 0
    ? ANALYSIS_PROMPT + '\n\n重要：只回傳純JSON，不要markdown格式，不要任何說明文字。'
    : ANALYSIS_PROMPT;

  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      { text: prompt },
    ]);
    const text = result.response.text();
    const parsed = parseGeminiJson(text) as Record<string, unknown> | null;

    if (!parsed) {
      if (retryCount < MAX_RETRIES) {
        console.warn(`  [重試 ${retryCount + 1}] JSON 解析失敗，重試中...`);
        await delay(2000 * (retryCount + 1));
        return analyzeWithGemini(model, imagePath, fileName, retryCount + 1);
      }
      throw new Error('無法解析 Gemini 回應為 JSON');
    }

    const id = `photo_${shortHash(fileName)}_${Date.now().toString(36)}`;

    return {
      id,
      fileName,
      path: `/photos/${fileName}`,
      summary: String(parsed.summary ?? ''),
      scene: (parsed.scene as PhotoMetadata['scene']) ?? 'other',
      peopleCount: Number(parsed.peopleCount ?? 0),
      mood: Array.isArray(parsed.mood) ? parsed.mood.map(String) : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
      possiblePeriod: String(parsed.possiblePeriod ?? ''),
      importanceScore: Math.min(5, Math.max(1, Number(parsed.importanceScore ?? 3))),
      caption: String(parsed.caption ?? ''),
      suggestedUse: (parsed.suggestedUse as PhotoMetadata['suggestedUse']) ?? 'main',
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.5))),
    };
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      const waitMs = 2000 * Math.pow(2, retryCount);
      console.warn(`  [重試 ${retryCount + 1}] API 錯誤，等待 ${waitMs / 1000}s 後重試...`);
      await delay(waitMs);
      return analyzeWithGemini(model, imagePath, fileName, retryCount + 1);
    }
    console.error(`  [失敗] ${fileName}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('錯誤：請在 .env 設定 GEMINI_API_KEY');
    process.exit(1);
  }

  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  fs.mkdirSync(PUBLIC_PHOTOS_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Collect all image files
  const imageFiles = fs.readdirSync(IMAGES_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return SUPPORTED_EXTS.has(ext);
  });

  const allOriginals = [...imageFiles];
  const hasCover = fs.existsSync(COVER_SRC);

  console.log(`找到 ${imageFiles.length} 張照片${hasCover ? ' + 1 張封面' : ''}`);

  // Build / update filename map
  const existingMap = loadExistingFilenameMap();
  const newMap = buildFilenameMap(allOriginals);
  const filenameMap: FilenameMap = { ...newMap };

  // Handle cover image separately
  if (hasCover) {
    filenameMap['影片封面.jpg'] = 'cover.jpg';
    const coverDst = path.join(PUBLIC_PHOTOS_DIR, 'cover.jpg');
    if (!fs.existsSync(coverDst)) {
      fs.copyFileSync(COVER_SRC, coverDst);
      console.log('已複製封面圖 → public/photos/cover.jpg');
    }
  }

  // Copy photos to public/photos/
  let copiedCount = 0;
  for (const orig of imageFiles) {
    const safeName = filenameMap[orig];
    const srcPath = path.join(IMAGES_DIR, orig);
    const dstPath = path.join(PUBLIC_PHOTOS_DIR, safeName);
    if (!fs.existsSync(dstPath)) {
      fs.copyFileSync(srcPath, dstPath);
      copiedCount++;
    }
  }
  if (copiedCount > 0) {
    console.log(`已複製 ${copiedCount} 張照片到 public/photos/`);
  }

  // Save filename map
  fs.writeFileSync(FILENAME_MAP_FILE, JSON.stringify(filenameMap, null, 2), 'utf-8');
  console.log('已更新 data/filename-map.json');

  // Load existing metadata (cache)
  const metadataMap = loadExistingMetadata();
  const alreadyAnalyzed = new Set(Array.from(metadataMap.values()).map(m => m.fileName));

  const toAnalyze = imageFiles
    .map(orig => ({ orig, safe: filenameMap[orig] }))
    .filter(({ safe }) => !alreadyAnalyzed.has(safe));

  console.log(`\n需要分析 ${toAnalyze.length} 張照片（已快取 ${alreadyAnalyzed.size} 張）`);

  if (toAnalyze.length === 0) {
    console.log('所有照片都已分析完畢。');
    return;
  }

  let processedCount = 0;
  let errorCount = 0;

  for (const { orig, safe } of toAnalyze) {
    processedCount++;
    const srcPath = path.join(IMAGES_DIR, orig);
    const progress = `[${processedCount}/${toAnalyze.length}]`;

    console.log(`${progress} 分析中: ${orig}`);

    const metadata = await analyzeWithGemini(model, srcPath, safe);

    if (metadata) {
      metadataMap.set(safe, metadata);
      console.log(`  ✓ ${metadata.summary} (重要度: ${metadata.importanceScore}, 用途: ${metadata.suggestedUse})`);
    } else {
      errorCount++;
      // Save a placeholder entry so we skip it next time
      const placeholder: PhotoMetadata = {
        id: `photo_err_${shortHash(orig)}`,
        fileName: safe,
        path: `/photos/${safe}`,
        summary: '（分析失敗）',
        scene: 'other',
        peopleCount: 0,
        mood: [],
        tags: [],
        possiblePeriod: '',
        importanceScore: 1,
        caption: '',
        suggestedUse: 'skip',
        confidence: 0,
      };
      metadataMap.set(safe, placeholder);
      console.log(`  ✗ 分析失敗，已標記為 skip`);
    }

    // Batch save every N photos
    if (processedCount % BATCH_SAVE_EVERY === 0) {
      saveMetadata(metadataMap);
      console.log(`  [已儲存進度 ${processedCount}/${toAnalyze.length}]`);
    }

    // Rate limiting delay
    if (processedCount < toAnalyze.length) {
      await delay(DELAY_MS);
    }
  }

  saveMetadata(metadataMap);

  console.log(`\n分析完成！`);
  console.log(`  成功：${toAnalyze.length - errorCount} 張`);
  console.log(`  失敗：${errorCount} 張`);
  console.log(`  總計：${metadataMap.size} 筆資料已存入 data/photo-metadata.json`);
}

main().catch(err => {
  console.error('執行失敗:', err);
  process.exit(1);
});
