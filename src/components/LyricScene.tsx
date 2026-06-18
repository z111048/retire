import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { FRAME_RATE } from '../constants';

interface LyricSceneProps {
  lyric: string;
  sectionTitle: string;
}

export const LyricScene: React.FC<LyricSceneProps> = ({ lyric, sectionTitle }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const lines = lyric.split('\n').filter(l => l.trim());
  const fadeOutStart = durationInFrames - FRAME_RATE * 0.8;

  const containerOpacity = interpolate(
    frame,
    [0, 12, fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const makeLineOpacity = (index: number) => {
    const startFrame = 15 + index * 22;
    return interpolate(
      frame,
      [startFrame, startFrame + 18, fadeOutStart, durationInFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  };

  const makeLineY = (index: number) => {
    const startFrame = 15 + index * 22;
    return interpolate(
      frame,
      [startFrame, startFrame + 18],
      [14, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1a1208 0%, #2a1f0e 50%, #1a1208 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: containerOpacity,
        fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative top border */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 120,
        height: 2,
        background: 'linear-gradient(to right, transparent, #C9A84C, transparent)',
        opacity: interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }} />

      {/* Section title label */}
      <p style={{
        color: '#C9A84C',
        fontSize: 30,
        letterSpacing: '0.3em',
        margin: '0 0 48px',
        fontWeight: 300,
        opacity: interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        {sectionTitle}
      </p>

      {/* Lyric lines */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {lines.map((line, i) => (
          <p
            key={i}
            style={{
              color: i % 2 === 0 ? '#F5E6C8' : '#D4C4A0',
              fontSize: 46,
              fontWeight: i % 2 === 0 ? 400 : 300,
              letterSpacing: '0.12em',
              margin: 0,
              opacity: makeLineOpacity(i),
              transform: `translateY(${makeLineY(i)}px)`,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {line}
          </p>
        ))}
      </div>

      {/* Decorative bottom border */}
      <div style={{
        position: 'absolute',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 120,
        height: 2,
        background: 'linear-gradient(to right, transparent, #C9A84C, transparent)',
        opacity: interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }} />
    </div>
  );
};
