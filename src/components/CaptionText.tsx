import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface CaptionTextProps {
  text: string;
  bottom?: number;
}

export const CaptionText: React.FC<CaptionTextProps> = ({ text, bottom = 60 }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20, 80, 100], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(frame, [0, 20], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        opacity,
        transform: `translateY(${translateY}px)`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          borderRadius: 8,
          padding: '12px 32px',
          maxWidth: '80%',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: 52,
            fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            lineHeight: 1.5,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
