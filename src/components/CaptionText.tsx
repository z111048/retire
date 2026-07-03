import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { KAI_FONT } from '../utils/fonts';

interface CaptionTextProps {
  text: string;
  position?: 'top' | 'bottom' | 'top-right';
}

export const CaptionText: React.FC<CaptionTextProps> = ({ text, position = 'bottom' }) => {
  const frame = useCurrentFrame();

  // 只淡入不淡出——場景元件（PhotoScene/VideoScene）會對整個畫面做淡出，
  // 場景時長從 2 秒到 19 秒不等，字幕須全程可見
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const offset = 48;
  const isTop = position === 'top' || position === 'top-right';
  const translateY = isTop
    ? interpolate(frame, [0, 20], [-12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(frame, [0, 20], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const positionStyle = isTop
    ? { top: offset }
    : { bottom: offset };

  const gradientStyle = isTop
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
        justifyContent: position === 'top-right' ? 'flex-end' : 'center',
        paddingRight: position === 'top-right' ? 44 : 0,
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
            fontSize: 40,
            fontFamily: KAI_FONT,
            fontWeight: 500,
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
