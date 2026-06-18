import React from 'react';
import { Composition, continueRender, delayRender, staticFile } from 'remotion';
import { RetirementVideo } from './RetirementVideo';
import timeline from '../data/timeline.json';
import copywriting from '../data/copywriting.json';
import { FRAME_RATE } from './constants';
import type { Timeline, Copywriting } from './types';

const typedTimeline = timeline as unknown as Timeline;
const typedCopywriting = copywriting as unknown as Copywriting;

// Wait for fonts to load before rendering
const fontHandle = delayRender('Loading fonts');

const fontStyle = document.createElement('style');
fontStyle.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap');
`;
document.head.appendChild(fontStyle);

document.fonts.ready.then(() => {
  continueRender(fontHandle);
});

const totalFrames = Math.max(
  Math.ceil(typedTimeline.totalDuration * FRAME_RATE),
  FRAME_RATE * 5 // minimum 5 seconds
);

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="RetirementVideo"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={RetirementVideo as React.ComponentType<any>}
      durationInFrames={totalFrames}
      fps={FRAME_RATE}
      width={1920}
      height={1080}
      defaultProps={{
        timeline: typedTimeline,
        copywriting: typedCopywriting,
        audioSrc: staticFile('bgm.mp3'),
      }}
    />
  );
};
