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
      backgroundColor: '#111',
      overflow: 'hidden',
      position: 'relative',
      opacity,
    }}>
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

      {item.caption && <CaptionText text={item.caption} position="top" />}
    </div>
  );
};
