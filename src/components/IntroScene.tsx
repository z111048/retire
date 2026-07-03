import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';
import { photoSrc } from '../utils/photoSrc';
import { FRAME_RATE } from '../constants';
import { FloatingParticles } from './FloatingParticles';
import { HANDWRITING_FONT, KAI_FONT } from '../utils/fonts';

interface IntroSceneProps {
  title: string;
  subtitle: string;
  date: string;
}

// 開場：16:9 全幅水彩底圖（人物在右側），標題文字置於左側留白區
export const IntroScene: React.FC<IntroSceneProps> = ({ title, subtitle, date }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeOut = FRAME_RATE * 0.8;
  const containerOpacity = interpolate(
    frame,
    [0, 15, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // 底圖緩慢放大，讓畫面有生命力
  const bgScale = interpolate(frame, [0, durationInFrames], [1.0, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
        backgroundColor: '#f6ead9',
      }}
    >
      {/* 16:9 全幅底圖（右側人物） */}
      <Img
        src={photoSrc('cover-wide.jpg')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${bgScale})`,
          transformOrigin: '70% 50%',
        }}
      />

      {/* 左側輕柔提亮，讓文字更清楚 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to right, rgba(255,250,240,0.55) 0%, rgba(255,250,240,0.25) 40%, transparent 62%)',
        }}
      />

      {/* Floating bokeh particles */}
      <FloatingParticles count={6} opacityScale={0.5} />

      {/* 文字區：置於左側留白 */}
      <div
        style={{
          position: 'absolute',
          left: '6.5%',
          top: 0,
          bottom: 0,
          width: '52%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 26,
          fontFamily: KAI_FONT,
        }}
      >
        <h1
          style={{
            ...makeTextStyle(0),
            fontFamily: HANDWRITING_FONT,
            fontSize: 100,
            fontWeight: 400,
            color: '#6d532a',
            letterSpacing: '0.12em',
            whiteSpace: 'nowrap',
            margin: 0,
            textShadow: '0 2px 14px rgba(255,255,255,0.9), 0 1px 2px rgba(109,83,42,0.25)',
          }}
        >
          {title}
        </h1>
        <div
          style={{
            ...makeTextStyle(22),
            width: 340,
            height: 3,
            background: 'linear-gradient(to right, #C9A84C, rgba(201,168,76,0))',
            borderRadius: 2,
          }}
        />
        <p
          style={{
            ...makeTextStyle(28),
            fontSize: 48,
            fontWeight: 600,
            color: '#87683a',
            letterSpacing: '0.1em',
            margin: 0,
            textShadow: '0 1px 10px rgba(255,255,255,0.85)',
          }}
        >
          {subtitle}
        </p>
        <p
          style={{
            ...makeTextStyle(52),
            fontSize: 36,
            fontWeight: 300,
            color: '#a08a5f',
            letterSpacing: '0.14em',
            margin: 0,
          }}
        >
          {date}
        </p>
      </div>
    </div>
  );
};
