import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { HANDWRITING_FONT } from '../utils/fonts';

interface FinaleAvatarWallSceneProps {
  avatarCount: number;
  caption: string;
}

declare global {
  interface Window {
    __REMOTION_BASE__?: string;
  }
}

function avatarSrc(idx: number): string {
  const file = `qavatars/${String(idx).padStart(4, '0')}.jpg`;
  if (typeof window !== 'undefined' && window.__REMOTION_BASE__) {
    return window.__REMOTION_BASE__ + file;
  }
  return staticFile(file);
}

const COLS = 20;
const TILE = 84;
const GAP = 8;

// 片尾彩蛋：全體 Q 版大頭貼像電影演職員名單一樣由下往上緩緩捲動
export const FinaleAvatarWallScene: React.FC<FinaleAvatarWallSceneProps> = ({ avatarCount, caption }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const rows = Math.ceil(avatarCount / COLS);
  const gridWidth = COLS * (TILE + GAP);
  const gridHeight = rows * (TILE + GAP);

  const fadeOutStart = durationInFrames - 25;
  const containerOpacity = interpolate(
    frame,
    [0, 20, fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // 從畫面底部下方捲動到頂部上方，經典跑馬燈式尾生名單效果
  const scrollY = interpolate(
    frame,
    [0, durationInFrames],
    [height + 40, -(gridHeight + 40)],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const offsetX = (width - gridWidth) / 2;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        opacity: containerOpacity,
        background: '#1c1712',
      }}
    >
      <div style={{ position: 'absolute', left: offsetX, top: scrollY, width: gridWidth, height: gridHeight }}>
        {Array.from({ length: avatarCount }, (_, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: col * (TILE + GAP),
                top: row * (TILE + GAP),
                width: TILE,
                height: TILE,
                borderRadius: 6,
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              }}
            >
              <Img src={avatarSrc(i)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          );
        })}
      </div>

      {/* 頂部標題：固定不隨捲動，底下加漸層讓文字在移動背景上仍清楚 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 160,
          background: 'linear-gradient(to bottom, rgba(28,23,18,0.95) 0%, rgba(28,23,18,0.75) 60%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: HANDWRITING_FONT,
            fontSize: 52,
            fontWeight: 400,
            color: '#F5E6C8',
            letterSpacing: '0.15em',
            textShadow: '0 2px 10px rgba(0,0,0,0.6)',
          }}
        >
          {caption}
        </span>
      </div>

      {/* 底部漸層，讓捲動畫面淡入淡出更柔和 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 140,
          background: 'linear-gradient(to top, #1c1712 0%, transparent 100%)',
        }}
      />
    </div>
  );
};
