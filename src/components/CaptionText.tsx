import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface CaptionTextProps {
  text: string;
  position?: 'top' | 'bottom';
}

export const CaptionText: React.FC<CaptionTextProps> = ({ text, position = 'bottom' }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20, 80, 100], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const offset = 48;
  const translateY = position === 'top'
    ? interpolate(frame, [0, 20], [-12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(frame, [0, 20], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const positionStyle = position === 'top'
    ? { top: offset }
    : { bottom: offset };

  const gradientStyle = position === 'top'
    ? { background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }
    : { background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' };

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        ...positionStyle,
        display: 'flex',
        justifyContent: 'center',
        opacity,
        transform: `translateY(${translateY}px)`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          borderRadius: 8,
          padding: '10px 28px',
          maxWidth: '80%',
          ...gradientStyle,
        }}
      >
        <span
          style={{
            color: '#F5E6C8',
            fontSize: 38,
            fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
            fontWeight: 400,
            letterSpacing: '0.1em',
            textShadow: '0 2px 10px rgba(0,0,0,0.95)',
            lineHeight: 1.5,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
