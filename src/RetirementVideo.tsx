import React from 'react';
import { Sequence, useVideoConfig, Audio, interpolate } from 'remotion';
import {
  FRAME_RATE, INTRO_DURATION_S, OUTRO_DURATION_S,
  SECTION_TITLE_DURATION_S, HEART_START_S, HEART_DURATION_S,
  CREDITS_START_S, CREDITS_DURATION_S,
  FINALE_START_S, FINALE_DURATION_S, AVATAR_COUNT,
  FINAL_CLIP_START_S, FINAL_CLIP_DURATION_S,
  SECTION_ACCENTS, DEFAULT_SECTION_ACCENT,
} from './constants';
import { IntroScene } from './components/IntroScene';
import { SectionTitleScene } from './components/SectionTitleScene';
import { PhotoScene } from './components/PhotoScene';
import { VideoScene } from './components/VideoScene';
import { HeartCollageScene } from './components/HeartCollageScene';
import { OutroScene } from './components/OutroScene';
import { CreditsScene } from './components/CreditsScene';
import { FinaleAvatarWallScene } from './components/FinaleAvatarWallScene';
import { LyricsOverlay } from './components/LyricsOverlay';
import { staticFile } from 'remotion';
import lyricsTiming from '../data/lyrics-timing.json';
import type { RetirementVideoProps } from './types';

const BGM_VOLUME = 0.65;
// 影片片段播放時保留片段原音，背景音樂壓到 10%
const BGM_DUCK = 0.10;
const DUCK_RAMP_FRAMES = 15;

export const RetirementVideo: React.FC<RetirementVideoProps> = ({ timeline, copywriting, audioSrc }) => {
  useVideoConfig();

  const sequences: React.ReactNode[] = [];
  let currentFrame = 0;
  let globalPhotoIndex = 0;

  // 只有兩種情況才需要蓋掉底部歌詞：intro 期間本來就沒有任何歌詞會 active（第一句從
  // 11.31s 才開始，intro 只到6s，純粹保險不影響任何東西）；愛心拼貼是唯一場景本身在
  // 同一個「畫面下方置中」位置已經有自己的字幕（大家的心，都圍繞著妳），會跟歌詞疊字。
  // 其餘場景（章節標題卡、影片片段、Outro祝福語、製作團隊名單、片尾跑馬燈）都實際
  // render 畫面確認過，底部區域是空的，歌詞疊在上面沒有文字衝突，之前整段都關掉歌詞
  // 反而讓不少句歌詞被截斷甚至完全消失（片尾祝福那幾句幾乎全被蓋掉的重災區）。
  const suppressRanges: [number, number][] = [];
  // 影片片段的 frame 區間，用來 duck 背景音樂
  const videoRanges: [number, number][] = [];

  // Intro
  const introFrames = INTRO_DURATION_S * FRAME_RATE;
  suppressRanges.push([0, INTRO_DURATION_S]);
  sequences.push(
    <Sequence key="intro" from={currentFrame} durationInFrames={introFrames}>
      <IntroScene
        title={copywriting.intro.title}
        subtitle={copywriting.intro.subtitle}
        date={copywriting.intro.date}
      />
    </Sequence>
  );
  currentFrame += introFrames;

  // Sections — section title + photos/video clips
  for (const section of timeline.sections) {
    const titleFrames = SECTION_TITLE_DURATION_S * FRAME_RATE;
    sequences.push(
      <Sequence key={`title-${section.id}`} from={currentFrame} durationInFrames={titleFrames}>
        <SectionTitleScene
          title={section.title}
          subtitle={section.subtitle}
          accentColor={SECTION_ACCENTS[section.id] ?? DEFAULT_SECTION_ACCENT}
        />
      </Sequence>
    );
    currentFrame += titleFrames;

    for (const item of section.photos) {
      const itemFrames = item.durationFrames;
      if (item.type === 'video') {
        videoRanges.push([currentFrame, currentFrame + itemFrames]);
        sequences.push(
          <Sequence key={`${section.id}-${item.fileName}`} from={currentFrame} durationInFrames={itemFrames}>
            <VideoScene item={item} />
          </Sequence>
        );
      } else {
        sequences.push(
          <Sequence key={`${section.id}-${item.fileName}`} from={currentFrame} durationInFrames={itemFrames}>
            <PhotoScene photo={item} index={globalPhotoIndex} sectionId={section.id} />
          </Sequence>
        );
        globalPhotoIndex++;
      }
      currentFrame += itemFrames;
    }
  }

  // Outro
  const outroFrames = OUTRO_DURATION_S * FRAME_RATE;
  sequences.push(
    <Sequence key="outro" from={currentFrame} durationInFrames={outroFrames}>
      <OutroScene
        line1={copywriting.outro.line1}
        line2={copywriting.outro.line2}
        line3={copywriting.outro.line3}
        line4={copywriting.outro.line4}
        line5={copywriting.outro.line5}
      />
    </Sequence>
  );
  currentFrame += outroFrames;

  // 愛心拼貼 — Q版大頭貼飛入組成愛心，固定在絕對時間點播放（疊在 Outro 尾段上，
  // 此時最後一句祝福語已顯示完畢），緊接在 Credits 之前
  if (copywriting.heartCollage) {
    const heartStartFrame = Math.round(HEART_START_S * FRAME_RATE);
    const heartFrames = Math.round(HEART_DURATION_S * FRAME_RATE);
    suppressRanges.push([HEART_START_S, HEART_START_S + HEART_DURATION_S]);
    sequences.push(
      <Sequence key="heart-collage" from={heartStartFrame} durationInFrames={heartFrames}>
        <HeartCollageScene avatarCount={AVATAR_COUNT} caption={copywriting.heartCollage.caption} />
      </Sequence>
    );
  }

  // Credits — 製作團隊名單，固定在絕對時間點播放（愛心拼貼結束後緊接）
  if (copywriting.credits) {
    const creditsStartFrame = Math.round(CREDITS_START_S * FRAME_RATE);
    const creditsFrames = CREDITS_DURATION_S * FRAME_RATE;
    sequences.push(
      <Sequence key="credits" from={creditsStartFrame} durationInFrames={creditsFrames}>
        <CreditsScene title={copywriting.credits.title} lines={copywriting.credits.lines} />
      </Sequence>
    );
  }

  // 片尾愛心手勢 — 秀燕姐Q版插畫比愛心（Google Flow 生成），固定在絕對時間點（Credits 結束後緊接）
  const finalClipStartFrame = Math.round(FINAL_CLIP_START_S * FRAME_RATE);
  const finalClipFrames = Math.round(FINAL_CLIP_DURATION_S * FRAME_RATE);
  sequences.push(
    <Sequence key="final-clip" from={finalClipStartFrame} durationInFrames={finalClipFrames}>
      <VideoScene item={{ type: 'video', fileName: 'finale-heart-gesture.mp4', caption: '', durationFrames: finalClipFrames }} />
    </Sequence>
  );

  // Finale — 片尾彩蛋，全體Q版大頭貼跑馬燈，全片最後一段，播放到剛好 5:20 結束
  const finaleStartFrame = Math.round(FINALE_START_S * FRAME_RATE);
  const finaleFrames = Math.round(FINALE_DURATION_S * FRAME_RATE);
  sequences.push(
    <Sequence key="finale" from={finaleStartFrame} durationInFrames={finaleFrames}>
      <FinaleAvatarWallScene avatarCount={AVATAR_COUNT} caption="感謝這些年，有妳真好" />
    </Sequence>
  );

  const bgmSrc = audioSrc ?? staticFile('bgm.mp3');
  const bgmVolume = (f: number): number => {
    let factor = 1;
    for (const [start, end] of videoRanges) {
      factor = Math.min(factor, interpolate(
        f,
        [start - DUCK_RAMP_FRAMES, start, end, end + DUCK_RAMP_FRAMES],
        [1, BGM_DUCK, BGM_DUCK, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      ));
    }
    return BGM_VOLUME * factor;
  };

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#111', position: 'relative' }}>
      <Audio key="bgm" src={bgmSrc} volume={bgmVolume} />
      {sequences}
      {/* Lyrics overlay: always on top, timed to audio */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <LyricsOverlay lyrics={lyricsTiming} suppressRanges={suppressRanges} />
      </div>
    </div>
  );
};
