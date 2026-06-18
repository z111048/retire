import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { FRAME_RATE } from '../constants';

interface OutroSceneProps {
  line1: string;
  line2: string;
  line3: string;
}

export const OutroScene: React.FC<OutroSceneProps> = ({ line1, line2, line3 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const holdStart = durationInFrames - FRAME_RATE * 1.5;

  // Fade to white at the very end
  const overlayOpacity = interpolate(
    frame,
    [holdStart, durationInFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const makeLineStyle = (startFrame: number) => ({
    opacity: interpolate(frame, [startFrame, startFrame + 25, holdStart], [0, 1, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    transform: `translateY(${interpolate(frame, [startFrame, startFrame + 25], [20, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })}px)`,
  });

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
        position: 'relative',
        fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
      }}
    >
      <div style={{ ...makeLineStyle(0), textAlign: 'center', marginBottom: 24 }}>
        <p
          style={{
            fontSize: 44,
            fontWeight: 500,
            color: '#3A2E1E',
            letterSpacing: '0.1em',
            margin: 0,
          }}
        >
          {line1}
        </p>
      </div>

      <div style={{ ...makeLineStyle(30), textAlign: 'center', marginBottom: 24 }}>
        <p
          style={{
            fontSize: 38,
            fontWeight: 400,
            color: '#5A4A32',
            letterSpacing: '0.08em',
            margin: 0,
          }}
        >
          {line2}
        </p>
      </div>

      <div style={{ ...makeLineStyle(60), textAlign: 'center', marginTop: 16 }}>
        <p
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#C9A84C',
            letterSpacing: '0.2em',
            margin: 0,
          }}
        >
          {line3}
        </p>
      </div>

      {/* White fade overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#fff',
          opacity: overlayOpacity,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
