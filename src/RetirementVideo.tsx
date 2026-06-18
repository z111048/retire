import React from 'react';
import { Sequence, useVideoConfig } from 'remotion';
import { FRAME_RATE, INTRO_DURATION_S, OUTRO_DURATION_S, SECTION_TITLE_DURATION_S } from './constants';
import { IntroScene } from './components/IntroScene';
import { SectionTitleScene } from './components/SectionTitleScene';
import { PhotoScene } from './components/PhotoScene';
import { OutroScene } from './components/OutroScene';
import type { Timeline } from './types';
import type { Copywriting } from './types';

interface RetirementVideoProps {
  timeline: Timeline;
  copywriting: Copywriting;
}

export const RetirementVideo: React.FC<RetirementVideoProps> = ({ timeline, copywriting }) => {
  useVideoConfig(); // keep for context

  const sections = timeline.sections;
  const sequences: React.ReactNode[] = [];

  let currentFrame = 0;

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
  for (const section of sections) {
    const titleFrames = SECTION_TITLE_DURATION_S * FRAME_RATE;

    sequences.push(
      <Sequence key={`title-${section.id}`} from={currentFrame} durationInFrames={titleFrames}>
        <SectionTitleScene title={section.title} subtitle={section.subtitle} />
      </Sequence>
    );
    currentFrame += titleFrames;

    for (const photo of section.photos) {
      const photoFrames = photo.duration * FRAME_RATE;
      sequences.push(
        <Sequence key={`${section.id}-${photo.fileName}`} from={currentFrame} durationInFrames={photoFrames}>
          <PhotoScene photo={photo} />
        </Sequence>
      );
      currentFrame += photoFrames;
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
      />
    </Sequence>
  );

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#111' }}>
      {sequences}
    </div>
  );
};
