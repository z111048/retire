import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';
import { CaptionText } from './CaptionText';
import type { TimelinePhoto } from '../types';
import { FRAME_RATE } from '../constants';
import { origPhotoSrc } from '../utils/photoSrc';

// 4 transition types rotate across photos:
//   0 — slide from right + fade
//   1 — slide from left + fade
//   2 — scale up from 92% + fade (zoom-in reveal)
//   3 — slide from bottom + fade

const ENTER_FRAMES = 20; // ~0.67s entrance

interface PhotoSceneProps {
  photo: TimelinePhoto;
  index: number;
}

export const PhotoScene: React.FC<PhotoSceneProps> = ({ photo, index }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const type = index % 4;
  const fadeOutStart = durationInFrames - Math.min(FRAME_RATE * 0.45, 13);

  // --- Opacity (all types) ---
  const opacity = interpolate(
    frame,
    [0, ENTER_FRAMES, fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // --- Ken Burns scale (all types, subtle) ---
  const kbScale = interpolate(frame, [0, durationInFrames], [1.0, 1.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // --- Entrance transform per type ---
  let translateX = 0;
  let translateY = 0;
  let entryScale = 1;

  const enterProgress = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
  });

  if (type === 0) {
    // Slide from right
    translateX = interpolate(enterProgress, [0, 1], [80, 0]);
  } else if (type === 1) {
    // Slide from left
    translateX = interpolate(enterProgress, [0, 1], [-80, 0]);
  } else if (type === 2) {
    // Scale up reveal
    entryScale = interpolate(enterProgress, [0, 1], [0.94, 1]);
  } else {
    // Slide from bottom
    translateY = interpolate(enterProgress, [0, 1], [60, 0]);
  }

  const finalScale = kbScale * entryScale;
  const transform = `translate(${translateX}px, ${translateY}px) scale(${finalScale})`;

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
          transformOrigin: 'center center',
        }}
      />
      {photo.caption && <CaptionText text={photo.caption} />}
    </div>
  );
};
