import React from 'react';
import { Composition, staticFile } from 'remotion';
import { RetirementVideo } from './RetirementVideo';
import timeline from '../data/timeline.json';
import copywriting from '../data/copywriting.json';
import { FRAME_RATE, FINALE_START_S, FINALE_DURATION_S } from './constants';
import { loadCustomFonts } from './utils/fonts';
import type { Timeline, Copywriting } from './types';

const typedTimeline = timeline as unknown as Timeline;
const typedCopywriting = copywriting as unknown as Copywriting;

// 不用 delayRender 阻塞等待字型（試過幾種寫法都可能讓高併發 render 卡死甚至當機，
// 詳見 utils/fonts.ts 的說明）。只註冊 @font-face 並提前觸發載入，讓瀏覽器自己
// 用 font-display: block 處理，換取 render 可靠度。
loadCustomFonts();

// Credits／Finale 都是疊在絕對時間點播放，不是接在內容之後，
// 所以總長取「內容本身」跟「Finale 結束時間」（目前最晚的區塊）兩者較大值，而非相加
const finaleEndS = FINALE_START_S + FINALE_DURATION_S;
const totalFrames = Math.max(
  Math.ceil(typedTimeline.totalDuration * FRAME_RATE),
  Math.ceil(finaleEndS * FRAME_RATE),
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
