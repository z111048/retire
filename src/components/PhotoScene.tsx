import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';
import { CaptionText } from './CaptionText';
import type { TimelinePhoto } from '../types';
import { FRAME_RATE } from '../constants';
import { photoSrc } from '../utils/photoSrc';

interface PhotoSceneProps {
  photo: TimelinePhoto;
}

export const PhotoScene: React.FC<PhotoSceneProps> = ({ photo }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeFrames = Math.min(FRAME_RATE * 0.5, Math.floor(durationInFrames * 0.15));

  const opacity = interpolate(
    frame,
    [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#111',
        overflow: 'hidden',
        position: 'relative',
        opacity,
      }}
    >
      <Img
        src={photoSrc(photo.fileName)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      />
      {photo.caption && <CaptionText text={photo.caption} />}
    </div>
  );
};
