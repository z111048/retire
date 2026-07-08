import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { FloatingParticles } from './FloatingParticles';
import { HANDWRITING_FONT, KAI_FONT } from '../utils/fonts';
import type { CreditsLine } from '../types';

interface CreditsSceneProps {
  title: string;
  lines: CreditsLine[];
}

const STAGGER_FRAMES = 16;
const FADE_IN_FRAMES = 20;

export const CreditsScene: React.FC<CreditsSceneProps> = ({ title, lines }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeOutStart = durationInFrames - 25;
  const containerOpacity = interpolate(
    frame,
    [0, 15, fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const titleStart = 0;
  const listStart = 20;

  const lineStyle = (index: number) => {
    const start = listStart + index * STAGGER_FRAMES;
    return {
      opacity: interpolate(frame, [start, start + FADE_IN_FRAMES], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }),
      transform: `translateY(${interpolate(frame, [start, start + FADE_IN_FRAMES], [14, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })}px)`,
    };
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        // 背景本身永遠不透明——這層蓋在 Outro 尾段上，如果背景也跟著淡入淡出，
        // 淡出瞬間會讓還沒淡出的 Outro 文字穿透出來（曾經因此出過 bug）
        backgroundColor: '#FFF8F0',
        position: 'relative',
      }}
    >
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: containerOpacity,
        position: 'relative',
      }}
    >
      <h2
        style={{
          fontFamily: HANDWRITING_FONT,
          fontSize: 64,
          fontWeight: 400,
          color: '#3A2E1E',
          letterSpacing: '0.2em',
          margin: '0 0 40px',
          opacity: interpolate(frame, [titleStart, titleStart + FADE_IN_FRAMES], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {title}
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          fontFamily: KAI_FONT,
        }}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              ...lineStyle(i),
              display: 'flex',
              alignItems: 'baseline',
              gap: 20,
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: 30,
                color: '#8a7350',
                letterSpacing: '0.08em',
                minWidth: 190,
                textAlign: 'right',
              }}
            >
              {l.role}
            </span>
            <span
              style={{
                fontSize: 34,
                color: '#3A2E1E',
                fontWeight: 500,
                letterSpacing: '0.08em',
              }}
            >
              {l.names}
            </span>
          </div>
        ))}
      </div>

      <FloatingParticles count={6} opacityScale={0.35} />
    </div>
    </div>
  );
};
