import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, OffthreadVideo } from 'remotion';
import { CaptionText } from './CaptionText';
import type { TimelineItem } from '../types';
import { FRAME_RATE } from '../constants';
import { videoSrc } from '../utils/photoSrc';

interface VideoSceneProps {
  item: TimelineItem;
}

// 影片片段場景：淡入淡出，保留原始聲音（背景音樂同時會被 RetirementVideo 壓低）
export const VideoScene: React.FC<VideoSceneProps> = ({ item }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeFrames = Math.min(15, Math.floor(durationInFrames / 4));
  const opacity = interpolate(
    frame,
    [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // 片段結尾把原始聲音也淡出，避免硬切
  const audioFade = FRAME_RATE * 0.5;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      // 背景本身永遠不透明——這個場景淡入淡出時若前一/後一個場景還沒真正結束
      // （例如 Outro 播到 296.2s 才結束，但緊接的片尾愛心手勢從 294s 就開始淡入），
      // 背景跟著變透明會讓底下還沒淡出的畫面穿透出來（曾經因此出過 bug）
      backgroundColor: '#111',
      overflow: 'hidden',
      position: 'relative',
    }}>
    <div style={{ width: '100%', height: '100%', position: 'relative', opacity }}>
      <OffthreadVideo
        src={videoSrc(item.fileName)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        volume={(f) =>
          interpolate(
            f,
            [0, audioFade, durationInFrames - audioFade, durationInFrames],
            [0, 1, 1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          )
        }
      />

      {/* Vignette overlay，與照片場景一致 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 45%, rgba(0,0,0,0.52) 100%)',
        pointerEvents: 'none',
      }} />

      {item.caption && <CaptionText text={item.caption} position="top-right" />}
    </div>
    </div>
  );
};
