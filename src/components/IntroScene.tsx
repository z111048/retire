import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';
import { photoSrc } from '../utils/photoSrc';
import { FRAME_RATE } from '../constants';
import { FloatingParticles } from './FloatingParticles';

interface IntroSceneProps {
  title: string;
  subtitle: string;
  date: string;
}

export const IntroScene: React.FC<IntroSceneProps> = ({ title, subtitle, date }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeOut = FRAME_RATE * 0.8;
  const containerOpacity = interpolate(
    frame,
    [durationInFrames - fadeOut, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const makeTextStyle = (startFrame: number) => ({
    opacity: interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    transform: `translateY(${interpolate(frame, [startFrame, startFrame + 20], [16, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })}px)`,
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        opacity: containerOpacity,
      }}
    >
      {/* Blurred background */}
      <Img
        src={photoSrc('cover.jpg')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'blur(12px) brightness(0.4)',
          transform: 'scale(1.1)',
        }}
      />

      {/* Cover photo centered */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Img
          src={photoSrc('cover.jpg')}
          style={{
            maxWidth: '50%',
            maxHeight: '60%',
            objectFit: 'contain',
            borderRadius: 12,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            opacity: interpolate(frame, [0, 20], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        />
      </div>

      {/* Overlay gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      {/* Floating bokeh particles */}
      <FloatingParticles count={12} opacityScale={0.7} />

      {/* Text block */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
        }}
      >
        <h1
          style={{
            ...makeTextStyle(0),
            fontSize: 90,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.2em',
            margin: 0,
            textShadow: '0 3px 12px rgba(0,0,0,0.8)',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            ...makeTextStyle(25),
            fontSize: 46,
            fontWeight: 400,
            color: '#F5E6C8',
            letterSpacing: '0.12em',
            margin: 0,
          }}
        >
          {subtitle}
        </p>
        <p
          style={{
            ...makeTextStyle(50),
            fontSize: 36,
            fontWeight: 300,
            color: '#D4C4A0',
            letterSpacing: '0.1em',
            margin: 0,
          }}
        >
          {date}
        </p>
      </div>
    </div>
  );
};
