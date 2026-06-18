import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface LyricSceneProps {
  lyric: string;
  sectionTitle: string;
}

export const LyricScene: React.FC<LyricSceneProps> = ({ lyric, sectionTitle }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const lines = lyric.split('\n').filter(l => l.trim());

  // Adaptive timing: fit all lines within available frames
  const fadeOutFrames = Math.floor(durationInFrames * 0.2);   // last 20% fades out
  const fadeInEnd = Math.floor(durationInFrames * 0.08);       // first 8% fades in
  const activeEnd = durationInFrames - fadeOutFrames;
  const activeStart = fadeInEnd;
  const activeWindow = activeEnd - activeStart;
  const stagger = lines.length > 1 ? Math.floor(activeWindow / (lines.length + 0.5)) : 0;

  const containerOpacity = interpolate(
    frame,
    [0, fadeInEnd, activeEnd, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const makeLineOpacity = (index: number) => {
    const startFrame = activeStart + index * stagger;
    const endFrame = Math.min(startFrame + Math.floor(stagger * 0.6), activeEnd);
    return interpolate(
      frame,
      [startFrame, Math.min(startFrame + 14, endFrame), activeEnd, durationInFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  };

  const makeLineY = (index: number) => {
    const startFrame = activeStart + index * stagger;
    return interpolate(
      frame,
      [startFrame, Math.min(startFrame + 14, durationInFrames)],
      [14, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  };

  return (
    <div style={{
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
    }}>
      {/* Decorative top border */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 120,
        height: 2,
        background: 'linear-gradient(to right, transparent, #C9A84C, transparent)',
        opacity: interpolate(frame, [0, fadeInEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }} />

      {/* Section title label */}
      <p style={{
        color: '#C9A84C',
        fontSize: 30,
        letterSpacing: '0.3em',
        margin: '0 0 48px',
        fontWeight: 300,
        opacity: interpolate(frame, [0, fadeInEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        {sectionTitle}
      </p>

      {/* Lyric lines */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        {lines.map((line, i) => (
          <p key={i} style={{
            color: i % 2 === 0 ? '#F5E6C8' : '#D4C4A0',
            fontSize: 46,
            fontWeight: i % 2 === 0 ? 400 : 300,
            letterSpacing: '0.12em',
            margin: 0,
            opacity: makeLineOpacity(i),
            transform: `translateY(${makeLineY(i)}px)`,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
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
        opacity: interpolate(frame, [0, fadeInEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }} />
    </div>
  );
};
