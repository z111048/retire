import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';
import { CaptionText } from './CaptionText';
import type { TimelinePhoto } from '../types';
import { FRAME_RATE } from '../constants';
import { photoSrc, origPhotoSrc } from '../utils/photoSrc';

// Per-photo timing:
//   0           → FADE_IN    : AI photo fades in (快速, 0.3s)
//   FADE_IN     → CROSS_START: AI photo held at full opacity
//   CROSS_START → CROSS_END  : AI fades out, original fades in (cross-fade 0.7s)
//   CROSS_END   → END-FADE   : Original photo held
//   END-FADE    → END        : Original fades out (0.4s)

const FADE_IN_S    = 0.3;
const CROSS_DUR_S  = 0.7;
const FADE_OUT_S   = 0.4;
const CROSS_SPLIT  = 0.50; // cross-fade starts at 50% of total duration

interface PhotoSceneProps {
  photo: TimelinePhoto;
}

export const PhotoScene: React.FC<PhotoSceneProps> = ({ photo }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeInEnd    = Math.round(FADE_IN_S * FRAME_RATE);
  const crossStart   = Math.round(durationInFrames * CROSS_SPLIT);
  const crossEnd     = Math.min(crossStart + Math.round(CROSS_DUR_S * FRAME_RATE), durationInFrames - 2);
  const fadeOutStart = Math.round(durationInFrames - FADE_OUT_S * FRAME_RATE);

  // AI photo: fades in fast → held → fades out during crossfade
  const aiOpacity = interpolate(
    frame,
    [0, fadeInEnd, crossStart, crossEnd],
    [0, 1,         1,          0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Original photo: invisible → fades in during crossfade → held → fades out
  const origOpacity = interpolate(
    frame,
    [crossStart, crossEnd, fadeOutStart, durationInFrames],
    [0,          1,         1,            0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Ken Burns: slow continuous zoom
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.07], {
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
    }}>
      {/* Phase 1: AI artistic photo — appears FIRST */}
      <div style={{ position: 'absolute', inset: 0, opacity: aiOpacity }}>
        <Img src={photoSrc(photo.fileName)} style={imgStyle} />
      </div>

      {/* Phase 2: Original real photo — appears AFTER crossfade */}
      <div style={{ position: 'absolute', inset: 0, opacity: origOpacity }}>
        <Img src={origPhotoSrc(photo.fileName)} style={imgStyle} />
        {photo.caption && <CaptionText text={photo.caption} />}
      </div>
    </div>
  );
};
