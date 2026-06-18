import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { FRAME_RATE } from '../constants';
import { FloatingParticles } from './FloatingParticles';

interface OutroSceneProps {
  line1: string;
  line2: string;
  line3: string;
  line4?: string;
  line5?: string;
}

export const OutroScene: React.FC<OutroSceneProps> = ({ line1, line2, line3, line4, line5 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeOutStart = durationInFrames - FRAME_RATE * 1.5;
  const lines = [line1, line2, line3, line4, line5].filter(Boolean) as string[];

  const containerOpacity = interpolate(
    frame,
    [0, 15, fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const whiteOverlay = interpolate(
    frame,
    [fadeOutStart, durationInFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const makeStyle = (index: number) => {
    const startFrame = index * 35;
    const isLast = index === lines.length - 1;
    return {
      opacity: interpolate(frame, [startFrame, startFrame + 25, fadeOutStart], [0, 1, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }),
      transform: `translateY(${interpolate(frame, [startFrame, startFrame + 25], [18, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })}px)`,
      fontSize: isLast ? 72 : 50,
      fontWeight: isLast ? 700 : 400,
      color: isLast ? '#C9A84C' : index < 2 ? '#3A2E1E' : '#5A4A32',
      letterSpacing: isLast ? '0.22em' : '0.1em',
      marginTop: isLast ? 24 : 0,
      marginBottom: isLast ? 0 : 8,
      marginLeft: 0,
      marginRight: 0,
    };
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FFF8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: containerOpacity,
        position: 'relative',
        fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
      }}
    >
      {/* Gold divider */}
      <div style={{
        width: 80,
        height: 2,
        background: 'linear-gradient(to right, transparent, #C9A84C, transparent)',
        marginBottom: 36,
        opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }} />

      {lines.map((line, i) => (
        <p key={i} style={{ margin: 0, textAlign: 'center', ...makeStyle(i) }}>
          {line}
        </p>
      ))}

      {/* Floating particles (gentle, warm) */}
      <FloatingParticles count={6} opacityScale={0.4} />

      {/* White fade-to-white overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#fff',
        opacity: whiteOverlay,
        pointerEvents: 'none',
      }} />
    </div>
  );
};
