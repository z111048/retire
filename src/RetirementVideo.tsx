import React from 'react';
import { Sequence, useVideoConfig, Audio } from 'remotion';
import {
  FRAME_RATE, INTRO_DURATION_S, OUTRO_DURATION_S,
  SECTION_TITLE_DURATION_S, LYRIC_DURATION_S,
} from './constants';
import { IntroScene } from './components/IntroScene';
import { SectionTitleScene } from './components/SectionTitleScene';
import { LyricScene } from './components/LyricScene';
import { PhotoScene } from './components/PhotoScene';
import { OutroScene } from './components/OutroScene';
import { staticFile } from 'remotion';
import type { RetirementVideoProps } from './types';

export const RetirementVideo: React.FC<RetirementVideoProps> = ({ timeline, copywriting, audioSrc }) => {
  useVideoConfig();

  const sequences: React.ReactNode[] = [];
  let currentFrame = 0;
  let globalPhotoIndex = 0;

  // Background music — audioSrc passed from PlayerApp (Vite) or Root (Remotion Studio)
  const bgmSrc = audioSrc ?? staticFile('bgm.mp3');
  sequences.push(
    <Audio key="bgm" src={bgmSrc} volume={0.65} />
  );

  // Intro
  const introFrames = INTRO_DURATION_S * FRAME_RATE;
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

  // Sections
  const cwSectionMap = Object.fromEntries(
    copywriting.sections.map(s => [s.id, s])
  );

  for (const section of timeline.sections) {
    const cw = cwSectionMap[section.id];
    const titleFrames = SECTION_TITLE_DURATION_S * FRAME_RATE;

    sequences.push(
      <Sequence key={`title-${section.id}`} from={currentFrame} durationInFrames={titleFrames}>
        <SectionTitleScene title={section.title} subtitle={section.subtitle} />
      </Sequence>
    );
    currentFrame += titleFrames;

    // Lyric card after title (if lyric exists)
    if (cw?.lyric) {
      const lyricFrames = LYRIC_DURATION_S * FRAME_RATE;
      sequences.push(
        <Sequence key={`lyric-${section.id}`} from={currentFrame} durationInFrames={lyricFrames}>
          <LyricScene lyric={cw.lyric} sectionTitle={section.title} />
        </Sequence>
      );
      currentFrame += lyricFrames;
    }

    // Photos
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
    <div style={{ width: '100%', height: '100%', backgroundColor: '#111' }}>
      {sequences}
    </div>
  );
};
