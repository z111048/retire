import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';
import { CaptionText } from './CaptionText';
import { FloatingParticles } from './FloatingParticles';
import type { TimelinePhoto } from '../types';
import { FRAME_RATE } from '../constants';
import { origPhotoSrc } from '../utils/photoSrc';

// 4 transition types rotate across photos:
//   0 — slide from right + fade
//   1 — slide from left + fade
//   2 — scale up from 92% + fade (zoom-in reveal)
//   3 — slide from bottom + fade
// Ken Burns origins cycle: TL, TR, BL, BR, Center

const ENTER_FRAMES = 20;

const KB_CONFIGS = [
  { origin: '40% 40%', startScale: 1.0, endScale: 1.07 }, // zoom in, top-left focus
  { origin: '60% 40%', startScale: 1.07, endScale: 1.0 }, // zoom out, top-right focus
  { origin: '40% 60%', startScale: 1.0, endScale: 1.07 }, // zoom in, bottom-left focus
  { origin: '60% 60%', startScale: 1.07, endScale: 1.0 }, // zoom out, bottom-right focus
  { origin: 'center center', startScale: 1.0, endScale: 1.06 }, // zoom in, center
];

interface PhotoSceneProps {
  photo: TimelinePhoto;
  index: number;
  sectionId?: string;
}

export const PhotoScene: React.FC<PhotoSceneProps> = ({ photo, index, sectionId }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // "今天換我們歡送你" 章節正好是全曲副歌高潮（見 data/lyrics-timing.json 204~247s），
  // 畫面氛圍稍微加強一點粒子數量呼應情緒最高點，其他章節維持原本的低耗能數量
  const particleCount = sectionId === 'our-turn' ? 8 : 6;
  // 每 4 張輪替一次字幕位置，避免 82 張照片全程都固定同一個角落
  const captionPosition = index % 4 === 3 ? 'bottom' : 'top-right';

  const kb = KB_CONFIGS[index % KB_CONFIGS.length];
  const fadeOutStart = durationInFrames - Math.min(FRAME_RATE * 0.45, 13);

  // --- Opacity (all types) ---
  const opacity = interpolate(
    frame,
    [0, ENTER_FRAMES, fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // --- Ken Burns scale (varied origin + direction per photo) ---
  const kbScale = interpolate(frame, [0, durationInFrames], [kb.startScale, kb.endScale], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // --- Entrance：純 fade + 極輕微 zoom（節奏快時大幅 slide 會顯得躁動）---
  const enterProgress = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
  });
  const entryScale = interpolate(enterProgress, [0, 1], [0.975, 1]);

  const transform = `scale(${kbScale * entryScale})`;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#111',
      overflow: 'hidden',
      position: 'relative',
      opacity,
    }}>
      <Img
        src={origPhotoSrc(photo.fileName)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          transform,
          transformOrigin: kb.origin,
        }}
      />

      {/* Warm amber tint at bottom */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(180,120,30,0.18) 0%, transparent 40%)',
        pointerEvents: 'none',
      }} />

      {/* Vignette overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 45%, rgba(0,0,0,0.52) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Floating bokeh particles — keep count low for mobile perf */}
      <FloatingParticles count={particleCount} opacityScale={0.8} />

      {photo.caption && <CaptionText text={photo.caption} position={captionPosition} />}
    </div>
  );
};
