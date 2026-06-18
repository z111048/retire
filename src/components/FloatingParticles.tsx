import React from 'react';
import { useCurrentFrame } from 'remotion';

// Deterministic layout — avoids random drift between frames
const PARTICLE_DATA = [
  { x: 7,  size: 6,  maxOp: 0.32, dur: 150, phase: 0,   color: '#FFE4A0' },
  { x: 16, size: 4,  maxOp: 0.24, dur: 178, phase: 27,  color: '#FFFFFF' },
  { x: 25, size: 9,  maxOp: 0.18, dur: 132, phase: 54,  color: '#C9A84C' },
  { x: 34, size: 5,  maxOp: 0.28, dur: 163, phase: 81,  color: '#FFE4A0' },
  { x: 44, size: 7,  maxOp: 0.20, dur: 190, phase: 11,  color: '#FFFFFF' },
  { x: 53, size: 4,  maxOp: 0.30, dur: 147, phase: 38,  color: '#C9A84C' },
  { x: 62, size: 8,  maxOp: 0.16, dur: 182, phase: 65,  color: '#FFE4A0' },
  { x: 71, size: 5,  maxOp: 0.25, dur: 156, phase: 92,  color: '#FFFFFF' },
  { x: 80, size: 6,  maxOp: 0.22, dur: 169, phase: 19,  color: '#C9A84C' },
  { x: 90, size: 4,  maxOp: 0.29, dur: 138, phase: 46,  color: '#FFE4A0' },
  { x: 12, size: 7,  maxOp: 0.17, dur: 186, phase: 107, color: '#FFFFFF' },
  { x: 48, size: 5,  maxOp: 0.26, dur: 143, phase: 73,  color: '#C9A84C' },
  { x: 74, size: 9,  maxOp: 0.15, dur: 161, phase: 99,  color: '#FFE4A0' },
  { x: 93, size: 4,  maxOp: 0.23, dur: 174, phase: 25,  color: '#FFFFFF' },
];

interface FloatingParticlesProps {
  count?: number;
  opacityScale?: number;
}

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({
  count = 14,
  opacityScale = 1,
}) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {PARTICLE_DATA.slice(0, count).map((p, i) => {
        const cycleFrame = (frame + p.phase) % p.dur;
        const progress = cycleFrame / p.dur;

        const y = 108 - progress * 120; // float from 108% up to -12%
        const opacity = Math.sin(progress * Math.PI) * p.maxOp * opacityScale;
        const xDrift = Math.sin(progress * Math.PI * 2.2 + p.phase * 0.07) * 2.2;
        const scale = 0.55 + Math.sin(progress * Math.PI) * 0.45;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x + xDrift}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: p.color,
              opacity,
              transform: `scale(${scale})`,
              boxShadow: `0 0 ${p.size * 3}px ${p.size * 1.5}px ${p.color}55`,
              filter: `blur(${p.size * 0.28}px)`,
            }}
          />
        );
      })}
    </div>
  );
};
