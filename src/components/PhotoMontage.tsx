import React from 'react';
import { useCurrentFrame, interpolate, Img } from 'remotion';
import type { TimelinePhoto } from '../types';
import { FRAME_RATE, MONTAGE_PHOTO_DURATION_S } from '../constants';
import { photoSrc } from '../utils/photoSrc';

interface PhotoMontageProps {
  photos: TimelinePhoto[];
}

export const PhotoMontage: React.FC<PhotoMontageProps> = ({ photos }) => {
  const frame = useCurrentFrame();
  const framesPerPhoto = Math.floor(MONTAGE_PHOTO_DURATION_S * FRAME_RATE);
  const currentIndex = Math.min(Math.floor(frame / framesPerPhoto), photos.length - 1);
  const localFrame = frame - currentIndex * framesPerPhoto;

  const crossFadeFrames = Math.floor(FRAME_RATE * 0.2);

  const opacity = interpolate(
    localFrame,
    [0, crossFadeFrames, framesPerPhoto - crossFadeFrames, framesPerPhoto],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const photo = photos[currentIndex];
  if (!photo) return null;

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#111', position: 'relative' }}>
      <Img
        src={photoSrc(photo.fileName)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity,
        }}
      />
    </div>
  );
};
