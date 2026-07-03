import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config({ override: true });

import type { PhotoMetadata, Timeline, TimelineSection, TimelinePhoto, Copywriting } from '../src/types.js';
import {
  INTRO_DURATION_S,
  OUTRO_DURATION_S,
  SECTION_TITLE_DURATION_S,
  DEFAULT_PHOTO_DURATION_S,
  HIGH_IMPORTANCE_PHOTO_DURATION_S,
} from '../src/constants.js';

const DATA_DIR = path.resolve('data');
const METADATA_FILE = path.join(DATA_DIR, 'photo-metadata.json');
const COPYWRITING_FILE = path.join(DATA_DIR, 'copywriting.json');
const TIMELINE_FILE = path.join(DATA_DIR, 'timeline.json');

const SECTION_MAX_PHOTOS = 10;

const FAREWELL_KEYWORDS = ['退休', '榮退', '歡送', '離別', '畢業', '送別'];

type SectionId = 'career-journey' | 'teamwork' | 'events' | 'colleagues' | 'farewell';

function assignSection(meta: PhotoMetadata): SectionId {
  const tagStr = meta.tags.join('') + meta.summary + meta.caption;
  const isFarewellRelated = FAREWELL_KEYWORDS.some(kw => tagStr.includes(kw));

  switch (meta.scene) {
    case 'award':
      return 'career-journey';
    case 'work':
      return meta.importanceScore >= 4 ? 'career-journey' : 'colleagues';
    case 'group_photo':
    case 'dining':
      return 'colleagues';
    case 'event':
    case 'travel':
      return 'events';
    case 'celebration':
      return isFarewellRelated ? 'farewell' : 'events';
    case 'daily':
    case 'other':
    default:
      return 'teamwork';
  }
}

function photoDuration(meta: PhotoMetadata): number {
  return meta.importanceScore >= 4 ? HIGH_IMPORTANCE_PHOTO_DURATION_S : DEFAULT_PHOTO_DURATION_S;
}

function main() {
  if (!fs.existsSync(METADATA_FILE)) {
    console.error('錯誤：找不到 data/photo-metadata.json，請先執行 npm run analyze-photos');
    process.exit(1);
  }

  const metadata: PhotoMetadata[] = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
  const copywriting: Copywriting = JSON.parse(fs.readFileSync(COPYWRITING_FILE, 'utf-8'));

  const sectionBuckets: Record<SectionId, PhotoMetadata[]> = {
    'career-journey': [],
    'teamwork': [],
    'events': [],
    'colleagues': [],
    'farewell': [],
  };

  // Filter out skip photos, sort by importance score descending
  const usable = metadata
    .filter(m => m.suggestedUse !== 'skip' && m.importanceScore > 1)
    .sort((a, b) => b.importanceScore - a.importanceScore);

  console.log(`可用照片：${usable.length} / ${metadata.length}`);

  for (const meta of usable) {
    const sectionId = assignSection(meta);
    sectionBuckets[sectionId].push(meta);
  }

  // Build sections
  const sections: TimelineSection[] = [];
  let totalPhotoDuration = 0;

  for (const cwSection of copywriting.sections) {
    const sectionId = cwSection.id as SectionId;
    const bucket = sectionBuckets[sectionId] ?? [];

    // Cap at max photos
    const selected = bucket.slice(0, SECTION_MAX_PHOTOS);

    if (selected.length === 0) {
      console.warn(`警告：段落「${cwSection.title}」沒有照片`);
    }

    const photos: TimelinePhoto[] = selected.map(meta => ({
      fileName: meta.fileName,
      caption: meta.caption || meta.summary,
      duration: photoDuration(meta),
    }));

    const sectionPhotoDuration = photos.reduce((sum, p) => sum + p.duration, 0);
    totalPhotoDuration += sectionPhotoDuration;

    sections.push({
      id: sectionId,
      section: cwSection.title,
      title: cwSection.title,
      subtitle: cwSection.subtitle,
      photos,
    });

    console.log(`段落「${cwSection.title}」：${photos.length} 張照片，${sectionPhotoDuration}s`);
  }

  const sectionTitlesTotalDuration = copywriting.sections.length * SECTION_TITLE_DURATION_S;
  const totalDuration =
    INTRO_DURATION_S +
    sectionTitlesTotalDuration +
    totalPhotoDuration +
    OUTRO_DURATION_S;

  const timeline: Timeline = {
    totalDuration,
    sections,
  };

  fs.writeFileSync(TIMELINE_FILE, JSON.stringify(timeline, null, 2), 'utf-8');

  console.log(`\n時間軸已產生：data/timeline.json`);
  console.log(`  總時長：${Math.floor(totalDuration / 60)}分 ${totalDuration % 60}秒`);
  console.log(`  段落數：${sections.length}`);
  console.log(`  總照片數：${sections.reduce((s, sec) => s + sec.photos.length, 0)} 張`);
}

main();
