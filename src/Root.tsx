import React from 'react';
import { Composition, staticFile } from 'remotion';
import { RetirementVideo } from './RetirementVideo';
import timeline from '../data/timeline.json';
import copywriting from '../data/copywriting.json';
import { FRAME_RATE } from './constants';
import { loadCustomFonts } from './utils/fonts';
import { getOutputDurationS } from './utils/duration';
import type { Timeline, Copywriting } from './types';

const typedTimeline = timeline as unknown as Timeline;
const typedCopywriting = copywriting as unknown as Copywriting;

// 不用 delayRender 阻塞等待字型（試過幾種寫法都可能讓高併發 render 卡死甚至當機，
// 詳見 utils/fonts.ts 的說明）。只註冊 @font-face 並提前觸發載入，讓瀏覽器自己
// 用 font-display: block 處理，換取 render 可靠度。
loadCustomFonts();

const totalFrames = Math.max(
  Math.ceil(getOutputDurationS(typedTimeline) * FRAME_RATE),
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
