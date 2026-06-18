/**
 * generate-artistic-photos.mjs
 *
 * Generates AI artistic versions of all 37 timeline photos using Codex CLI.
 * - Resumable: progress tracked in data/artistic-gen-progress.json
 * - Overwrites public/photos/<safeName> with AI-generated version
 * - Each section uses different art styles to keep viewers engaged
 *
 * Usage:
 *   node scripts/generate-artistic-photos.mjs
 *   node scripts/generate-artistic-photos.mjs --dry-run   # show prompts only
 *   node scripts/generate-artistic-photos.mjs --ids 104_11_14-4.jpg,IMG_5950.jpg
 *   node scripts/generate-artistic-photos.mjs --retry-failed
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CODEX_DIR = path.join(os.homedir(), '.codex', 'generated_images');
const PROGRESS_FILE = path.join(ROOT, 'data', 'artistic-gen-progress.json');
const PHOTOS_DIR = path.join(ROOT, 'public', 'photos');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const RETRY_FAILED = args.includes('--retry-failed');
const IDS_ARG = args.find(a => a.startsWith('--ids='))?.slice(6)?.split(',').map(s => s.trim());

// ─────────────────────────────────────────────
// Art style rotation — keeps every photo surprising
// ─────────────────────────────────────────────
const SECTION_STYLES = {
  'career-journey': [
    'Studio Ghibli film still style, soft watercolor backgrounds, expressive anime faces',
    'vintage Taiwanese retro poster illustration, bold outlines, warm sepia tones with red accents',
    'watercolor illustration with ink outlines, loose brushstrokes, soft pastel palette',
    'Hayao Miyazaki animation style, detailed backgrounds, gentle colors',
    'Japanese ukiyo-e woodblock print style, flat colors, bold outlines',
  ],
  'teamwork': [
    'Pixar 3D animation style, exaggerated expressions, warm lighting',
    'bold flat vector illustration, bright primary colors, thick outlines',
  ],
  'events': [
    'retro pop art poster (Andy Warhol style), bold colors, halftone dots, graphic silhouettes',
    'chibi anime kawaii style, big sparkling eyes, super deformed cute proportions, colorful',
    'Pixar 3D animation style, bright cheerful lighting, exaggerated happy expressions',
    'vintage travel poster illustration, art deco style, bold geometric shapes',
    'comic book panel style, bold speech bubbles, dynamic lines, vibrant colors',
    'Studio Ghibli celebration scene style, magical sparkles, warm golden light',
    'retro 80s neon arcade style, pixel art characters with smooth backgrounds',
    'whimsical storybook illustration style, rounded shapes, pastel rainbow colors',
    'bold flat vector illustration, confetti explosion, bright joyful colors',
    'Japanese shojo manga style, sparkles and flowers, expressive eyes, soft pink tones',
  ],
  'colleagues': [
    'chibi kawaii anime style, super deformed cute proportions, pastel colors, big smiles',
    'Pixar 3D animation style, warm lighting, exaggerated happy expressions, colorful',
    'retro 70s cartoon style, thick outlines, flat bold colors, funky patterns',
    'watercolor group portrait with whimsical details and floating hearts',
    'comic strip style with bold speech bubbles saying friendly greetings',
    'Studio Ghibli group scene, detailed warm interior, glowing soft light',
    'sticker sheet illustration style, each person a cute character sticker',
    'retro Soviet propaganda poster style but happy and colorful with hearts',
    'Japanese festival scene style, lanterns and cherry blossoms, vibrant',
    'bold modern illustration style, geometric shapes, bright gradient colors',
  ],
  'farewell': [
    'warm impressionist oil painting, golden sunset light, soft brushstrokes, emotional',
    'Studio Ghibli farewell scene, glowing light, emotional expressions, beautiful sky',
    'watercolor and gold leaf illustration, celebratory confetti, warm glowing tones',
    'Japanese shojo manga style, sparkles, flowers, teary happy expressions',
    'vintage illustrated greeting card style, pastel florals, elegant script banners',
    'Pixar emotional scene style, cinematic warm lighting, heartfelt expressions',
    'retro photo-booth strip illustration, fun poses, decorative star/heart frames',
    'oil painting portrait style with soft bokeh background, dignified and warm',
    'whimsical confetti party illustration, streamers everywhere, big celebration energy',
    'ukiyo-e cherry blossom scene style, petals falling, graceful figures',
  ],
};

// Scene descriptions in English for each metadata scene type
const SCENE_DESCRIPTIONS = {
  work: 'colleagues in a government office, smiling warmly at the camera, professional yet friendly atmosphere',
  group_photo: 'group photo of happy Asian women colleagues, big smiles, arms around each other, joyful energy',
  celebration: 'joyful celebration gathering, women colleagues celebrating with happy expressions, festive atmosphere',
  event: 'outdoor group gathering or event, colleagues enjoying activities together, cheerful smiles',
  dining: 'colleagues enjoying a meal together at a restaurant, warm and lively atmosphere, happy conversation',
  daily: 'casual everyday office moment, natural and warm interaction between colleagues',
  award: 'formal award ceremony moment, proud and happy expressions, official recognition',
  travel: 'colleagues on an outing or trip, scenic background, tourist poses, big happy smiles',
  other: 'group of happy Asian women colleagues, smiling together, warm and friendly',
};

// Funny/surprising twist elements to add variety
const TWIST_ELEMENTS = [
  'with tiny cartoon stars and sparkles floating around them',
  'with exaggerated giant smiles that take up half their faces',
  'with a tiny secret agent in the background no one notices',
  'with golden confetti raining from above',
  'with each person wearing a tiny invisible crown that only glows slightly',
  'with the background subtly transforming into a magical landscape',
  'with a tiny rainbow bridge connecting them symbolizing friendship',
  'with floating emoji hearts and stars around everyone',
  'with a mischievous cat photobombing in the corner',
  'with dramatic cinematic lighting making it look like an epic movie scene',
  'with everyone\'s hair gently blowing in an imaginary heroic wind',
  'with small flower petals falling gently around the group',
];

function buildPrompt(meta, style, twist) {
  const sceneDesc = SCENE_DESCRIPTIONS[meta.scene] || SCENE_DESCRIPTIONS.other;
  return `$imagegen ${style}, ${sceneDesc}, ${twist}, no text, no watermark, no border, high quality illustration, beautiful composition, vibrant and warm colors`;
}

// ─────────────────────────────────────────────
// Core Codex runner
// ─────────────────────────────────────────────
const QUOTA_RE = /rate[- ]?limit|insufficient[_-]?(quota|credit)|too many requests|\b(HTTP|status)[^\d]{0,5}429\b/i;

async function findNewPngSince(startMs) {
  let best = null;
  const dirs = await fs.readdir(CODEX_DIR).catch(() => []);
  for (const d of dirs) {
    const dPath = path.join(CODEX_DIR, d);
    const files = await fs.readdir(dPath).catch(() => []);
    for (const f of files) {
      if (!f.startsWith('ig_') || !f.endsWith('.png')) continue;
      const full = path.join(dPath, f);
      const stat = await fs.stat(full).catch(() => null);
      if (stat && stat.mtimeMs >= startMs) {
        if (!best || stat.mtimeMs > best.mtimeMs) {
          best = { path: full, mtimeMs: stat.mtimeMs };
        }
      }
    }
  }
  return best?.path || null;
}

function runCodex(prompt, timeoutMs = 5 * 60 * 1000) {
  return new Promise((resolve) => {
    const child = spawn(
      'codex',
      ['exec', '--enable', 'image_generation', '-s', 'workspace-write',
       '--skip-git-repo-check', prompt],
      { cwd: os.tmpdir(), stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const out = [], err = [];
    child.stdout.on('data', d => { out.push(d); process.stdout.write('.'); });
    child.stderr.on('data', d => err.push(d));
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('close', code => {
      clearTimeout(timer);
      resolve({
        code,
        stdout: Buffer.concat(out).toString(),
        stderr: Buffer.concat(err).toString(),
      });
    });
  });
}

async function compressToJpeg(filePath) {
  const tmp = filePath + '.compress.tmp';
  await sharp(filePath)
    .rotate()
    .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(tmp);
  await fs.rename(tmp, filePath);
}

async function generateOne(prompt, outPath) {
  const startMs = Date.now() - 500;
  const { code, stdout, stderr } = await runCodex(prompt);
  process.stdout.write('\n');

  if (code !== 0) {
    const combined = stdout + stderr;
    if (QUOTA_RE.test(combined)) return { ok: false, reason: 'quota' };
    return { ok: false, reason: `exit ${code}`, detail: stderr.slice(0, 200) };
  }

  const newest = await findNewPngSince(startMs);
  if (!newest) {
    return { ok: false, reason: 'no_png', detail: 'codex ran but no new PNG found — check $imagegen prefix' };
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.copyFile(newest, outPath);
  return { ok: true, source: newest };
}

// ─────────────────────────────────────────────
// Progress tracking
// ─────────────────────────────────────────────
async function loadProgress() {
  try {
    return JSON.parse(await fs.readFile(PROGRESS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

async function saveProgress(progress) {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

// ─────────────────────────────────────────────
// Build job list from timeline
// ─────────────────────────────────────────────
async function buildJobs() {
  const timeline = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'timeline.json'), 'utf-8'));
  const metadata = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'photo-metadata.json'), 'utf-8'));
  const metaMap = Object.fromEntries(metadata.map(m => [m.fileName, m]));

  const jobs = [];
  for (const section of timeline.sections) {
    const styles = SECTION_STYLES[section.id] || SECTION_STYLES['colleagues'];
    section.photos.forEach((photo, idx) => {
      const meta = metaMap[photo.fileName] || { scene: 'other', summary: '' };
      const style = styles[idx % styles.length];
      const twist = TWIST_ELEMENTS[(jobs.length) % TWIST_ELEMENTS.length];
      const prompt = buildPrompt(meta, style, twist);
      jobs.push({
        fileName: photo.fileName,
        section: section.id,
        sectionTitle: section.title,
        prompt,
        outPath: path.join(PHOTOS_DIR, photo.fileName.replace(/\.(jpg|jpeg)$/i, '.png')),
        outPathJpg: path.join(PHOTOS_DIR, photo.fileName),
      });
    });
  }
  return jobs;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  console.log('=== 退休影片藝術風格圖片生成 ===\n');

  const jobs = await buildJobs();
  const progress = await loadProgress();

  let filtered = jobs;
  if (IDS_ARG) {
    filtered = jobs.filter(j => IDS_ARG.includes(j.fileName));
    console.log(`篩選 ${filtered.length} 張照片`);
  } else if (RETRY_FAILED) {
    filtered = jobs.filter(j => progress[j.fileName]?.status === 'failed');
    console.log(`重試 ${filtered.length} 張失敗照片`);
  } else {
    filtered = jobs.filter(j => !progress[j.fileName] || progress[j.fileName].status !== 'done');
    const done = jobs.length - filtered.length;
    if (done > 0) console.log(`已完成 ${done}/${jobs.length}，繼續剩餘 ${filtered.length} 張`);
  }

  if (DRY_RUN) {
    console.log('\n--- DRY RUN：列出所有 prompt ---\n');
    jobs.forEach((j, i) => {
      console.log(`[${i + 1}/${jobs.length}] ${j.fileName}`);
      console.log(`  段落: ${j.sectionTitle}`);
      console.log(`  Prompt: ${j.prompt}\n`);
    });
    return;
  }

  if (filtered.length === 0) {
    console.log('所有照片已生成完成！');
    return;
  }

  console.log(`待生成: ${filtered.length} 張，預估 ${Math.ceil(filtered.length * 1.5)} 分鐘\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < filtered.length; i++) {
    const job = filtered[i];
    const num = `[${i + 1}/${filtered.length}]`;
    console.log(`${num} 生成: ${job.fileName}`);
    console.log(`  段落: ${job.sectionTitle}`);
    console.log(`  風格: ${job.prompt.slice(10, 80)}...`);
    process.stdout.write('  進度: ');

    const result = await generateOne(job.prompt, job.outPath);

    if (result.ok) {
      // Rename PNG to .jpg (keeps original filename expected by timeline)
      if (job.outPath !== job.outPathJpg) {
        try { await fs.rename(job.outPath, job.outPathJpg); } catch {}
      }
      // Compress: PNG 3MB → JPEG ~200KB
      await compressToJpeg(job.outPathJpg);
      const stat = await fs.stat(job.outPathJpg);
      const kb = Math.round(stat.size / 1024);
      progress[job.fileName] = { status: 'done', generatedAt: new Date().toISOString() };
      console.log(`  ✓ 完成 → ${path.basename(job.outPathJpg)} (${kb}KB)`);
      successCount++;
    } else {
      if (result.reason === 'quota') {
        console.log('\n  ⚠ 配額限制，暫停 60 秒後繼續…');
        progress[job.fileName] = { status: 'failed', reason: result.reason };
        await saveProgress(progress);
        await new Promise(r => setTimeout(r, 60_000));
        i--; // retry same item
        continue;
      }
      console.log(`  ✗ 失敗: ${result.reason}${result.detail ? ' — ' + result.detail : ''}`);
      progress[job.fileName] = { status: 'failed', reason: result.reason };
      failCount++;
    }

    await saveProgress(progress);
    console.log('');
  }

  console.log(`\n=== 完成 ===`);
  console.log(`成功: ${successCount}，失敗: ${failCount}`);
  if (failCount > 0) {
    console.log(`重試失敗: node scripts/generate-artistic-photos.mjs --retry-failed`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
