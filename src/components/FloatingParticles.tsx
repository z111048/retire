import React from 'react';
import { useCurrentFrame } from 'remotion';

// filter: blur() and large boxShadow spreads force per-element GPU compositing layers.
// Use only opacity + transform for mobile performance.
const PARTICLE_DATA = [
  { x: 7,  size: 10, maxOp: 0.28, dur: 150, phase: 0,   color: '#FFE4A0' },
  { x: 22, size: 7,  maxOp: 0.22, dur: 178, phase: 37,  color: '#FFFFFF' },
  { x: 38, size: 14, maxOp: 0.18, dur: 132, phase: 71,  color: '#C9A84C' },
  { x: 55, size: 9,  maxOp: 0.25, dur: 163, phase: 13,  color: '#FFE4A0' },
  { x: 70, size: 7,  maxOp: 0.20, dur: 190, phase: 53,  color: '#FFFFFF' },
  { x: 84, size: 12, maxOp: 0.22, dur: 147, phase: 89,  color: '#C9A84C' },
  { x: 15, size: 8,  maxOp: 0.16, dur: 169, phase: 107, color: '#FFE4A0' },
  { x: 47, size: 6,  maxOp: 0.24, dur: 156, phase: 43,  color: '#FFFFFF' },
];

interface FloatingParticlesProps {
  count?: number;
  opacityScale?: number;
}

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({
  count = 6,
  opacityScale = 1,
}) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {PARTICLE_DATA.slice(0, count).map((p, i) => {
        const cycleFrame = (frame + p.phase) % p.dur;
        const progress = cycleFrame / p.dur;

        const y = 106 - progress * 118;
        const opacity = Math.sin(progress * Math.PI) * p.maxOp * opacityScale;
        const xDrift = Math.sin(progress * Math.PI * 2.2 + p.phase * 0.07) * 2;
        const scale = 0.6 + Math.sin(progress * Math.PI) * 0.4;

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
              // No filter:blur or large boxShadow — both create compositing layers per element
              boxShadow: `0 0 ${p.size}px ${Math.round(p.size * 0.6)}px ${p.color}40`,
            }}
          />
        );
      })}
    </div>
  );
};
