import React from 'react';
import { Sequence, useVideoConfig, Audio } from 'remotion';
import {
  FRAME_RATE, INTRO_DURATION_S, OUTRO_DURATION_S,
  SECTION_TITLE_DURATION_S,
} from './constants';
import { IntroScene } from './components/IntroScene';
import { SectionTitleScene } from './components/SectionTitleScene';
import { PhotoScene } from './components/PhotoScene';
import { OutroScene } from './components/OutroScene';
import { LyricsOverlay } from './components/LyricsOverlay';
import { staticFile } from 'remotion';
import lyricsTiming from '../data/lyrics-timing.json';
import type { RetirementVideoProps } from './types';

export const RetirementVideo: React.FC<RetirementVideoProps> = ({ timeline, copywriting, audioSrc }) => {
  useVideoConfig();

  const sequences: React.ReactNode[] = [];
  let currentFrame = 0;
  let globalPhotoIndex = 0;

  // Suppress lyric overlay during non-photo scenes (intro, section titles, outro)
  const suppressRanges: [number, number][] = [];

  const bgmSrc = audioSrc ?? staticFile('bgm.mp3');
  sequences.push(
    <Audio key="bgm" src={bgmSrc} volume={0.65} />
  );

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

  // Sections — section title + photos (no dedicated lyric scenes)
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

    for (let pi = 0; pi < section.photos.length; pi++) {
      const photo = section.photos[pi];
      const photoFrames = photo.duration * FRAME_RATE;
      sequences.push(
        <Sequence key={`${section.id}-${photo.fileName}`} from={currentFrame} durationInFrames={photoFrames}>
          <PhotoScene photo={photo} index={globalPhotoIndex} />
        </Sequence>
      );
      currentFrame += photoFrames;
      globalPhotoIndex++;
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

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#111', position: 'relative' }}>
      {sequences}
      {/* Lyrics overlay: always on top, timed to audio */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <LyricsOverlay lyrics={lyricsTiming} suppressRanges={suppressRanges} />
      </div>
    </div>
  );
};
