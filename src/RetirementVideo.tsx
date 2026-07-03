import React from 'react';
import { Sequence, useVideoConfig, Audio, interpolate } from 'remotion';
import {
  FRAME_RATE, INTRO_DURATION_S, OUTRO_DURATION_S,
  SECTION_TITLE_DURATION_S,
} from './constants';
import { IntroScene } from './components/IntroScene';
import { SectionTitleScene } from './components/SectionTitleScene';
import { PhotoScene } from './components/PhotoScene';
import { VideoScene } from './components/VideoScene';
import { OutroScene } from './components/OutroScene';
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

  // Suppress lyric overlay during non-photo scenes (intro, section titles, videos, outro)
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
    const titleStartSec = currentFrame / FRAME_RATE;
    suppressRanges.push([titleStartSec, titleStartSec + SECTION_TITLE_DURATION_S]);
    sequences.push(
      <Sequence key={`title-${section.id}`} from={currentFrame} durationInFrames={titleFrames}>
        <SectionTitleScene title={section.title} subtitle={section.subtitle} />
      </Sequence>
    );
    currentFrame += titleFrames;

    for (const item of section.photos) {
      const itemFrames = item.durationFrames;
      if (item.type === 'video') {
        videoRanges.push([currentFrame, currentFrame + itemFrames]);
        suppressRanges.push([currentFrame / FRAME_RATE, (currentFrame + itemFrames) / FRAME_RATE]);
        sequences.push(
          <Sequence key={`${section.id}-${item.fileName}`} from={currentFrame} durationInFrames={itemFrames}>
            <VideoScene item={item} />
          </Sequence>
        );
      } else {
        sequences.push(
          <Sequence key={`${section.id}-${item.fileName}`} from={currentFrame} durationInFrames={itemFrames}>
            <PhotoScene photo={item} index={globalPhotoIndex} />
          </Sequence>
        );
        globalPhotoIndex++;
      }
      currentFrame += itemFrames;
    }
  }

  // Outro
  const outroFrames = OUTRO_DURATION_S * FRAME_RATE;
  suppressRanges.push([currentFrame / FRAME_RATE, (currentFrame + outroFrames) / FRAME_RATE]);
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
