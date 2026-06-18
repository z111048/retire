import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';
import { CaptionText } from './CaptionText';
import type { TimelinePhoto } from '../types';
import { FRAME_RATE } from '../constants';
import { photoSrc, origPhotoSrc } from '../utils/photoSrc';

interface PhotoSceneProps {
  photo: TimelinePhoto;
}

// Timeline for each photo:
//   Phase 1  0% – 45%  : AI art photo (Ken Burns scale-in)
//   Crossfade 40% – 55%: AI fades out, original fades in simultaneously
//   Phase 2  50% – 100%: Original photo (Ken Burns scale continues)
//   Fade     last 15%  : overall fade to black for next scene

export const PhotoScene: React.FC<PhotoSceneProps> = ({ photo }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const crossStart = Math.floor(durationInFrames * 0.40);
  const crossEnd   = Math.floor(durationInFrames * 0.58);
  const fadeStart  = Math.floor(durationInFrames * 0.85);

  // Overall scene fade-in / fade-out
  const sceneFadeIn  = Math.min(FRAME_RATE * 0.4, 12);
  const sceneOpacity = interpolate(
    frame,
    [0, sceneFadeIn, fadeStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // AI photo: visible in phase 1, fades out during crossfade
  const aiOpacity = interpolate(
    frame,
    [0, sceneFadeIn, crossStart, crossEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Original photo: invisible in phase 1, fades in during crossfade
  const origOpacity = interpolate(
    frame,
    [crossStart, crossEnd, fadeStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Ken Burns: slow zoom throughout entire duration
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#111',
      overflow: 'hidden',
      position: 'relative',
      opacity: sceneOpacity,
    }}>
      {/* Phase 1: AI artistic photo */}
      <div style={{ position: 'absolute', inset: 0, opacity: aiOpacity }}>
        <Img src={photoSrc(photo.fileName)} style={imgStyle} />
      </div>

      {/* Phase 2: Original photo */}
      <div style={{ position: 'absolute', inset: 0, opacity: origOpacity }}>
        <Img src={origPhotoSrc(photo.fileName)} style={imgStyle} />
      </div>

      {/* Caption shows only during original photo phase */}
      {photo.caption && origOpacity > 0 && (
        <div style={{ opacity: origOpacity }}>
          <CaptionText text={photo.caption} />
        </div>
      )}
    </div>
  );
};
