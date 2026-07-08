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

const COLS = 14;
const TILE = 120; // 接近 public/qavatars/ 原始 140px，放大顯示但避免升頻模糊
const GAP = 10;

// 捲動固定用這個速度（不是用總距離除以總時長反推），時間到就結束，
// 不需要剛好捲完——580人的頭像牆本來就比畫面能容納的內容多很多，
// 捲到哪算哪，比硬要在有限時間內全部跑完、被迫加速更自然。
// 190px/s 是最早（頭像放大之前）設計時就用的舒適速度基準，沿用同一個標準。
const SCROLL_SPEED_PX_PER_S = 190;

// 指定要提前到跑馬燈第幾張（1-based）的照片編號，其餘照片仍維持原本的相對順序
// （只是被擠開一格），不是整排重新洗牌。
const FEATURED: Array<{ photoNumber: number; position: number }> = [
  { photoNumber: 371, position: 2 },
];

/** 把 FEATURED 指定的照片編號搬到指定位置（1-based），回傳「畫面位置 -> 照片編號」的對照表。 */
function buildAvatarOrder(avatarCount: number): number[] {
  const order = Array.from({ length: avatarCount }, (_, i) => i);
  for (const { photoNumber, position } of FEATURED) {
    const from = order.indexOf(photoNumber);
    if (from === -1) continue;
    order.splice(from, 1);
    order.splice(position - 1, 0, photoNumber);
  }
  return order;
}

// 片尾彩蛋：全體 Q 版大頭貼像電影演職員名單一樣由下往上緩緩捲動
export const FinaleAvatarWallScene: React.FC<FinaleAvatarWallSceneProps> = ({ avatarCount, caption }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height, fps } = useVideoConfig();

  const avatarOrder = React.useMemo(() => buildAvatarOrder(avatarCount), [avatarCount]);

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

  // 從畫面底部下方以固定速度往上捲，捲到哪算哪，不用剛好在場景結束時捲完
  const pxPerFrame = SCROLL_SPEED_PX_PER_S / fps;
  const scrollY = Math.max(height + 40 - frame * pxPerFrame, -(gridHeight + 40));

  const offsetX = (width - gridWidth) / 2;

  // 虛擬化：580 張圖同時全部掛在 DOM 上很浪費（畫面同時間頂多看得到 50-70 張），
  // 只渲染目前捲動位置附近可能看得到的列，其餘不掛載，捲動時多留 2 列當緩衝避免邊緣露白
  const ROW_BUFFER = 2;
  const minVisibleRow = Math.max(0, Math.floor((-scrollY - TILE) / (TILE + GAP)) - ROW_BUFFER);
  const maxVisibleRow = Math.min(rows - 1, Math.ceil((height - scrollY) / (TILE + GAP)) + ROW_BUFFER);

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
          if (row < minVisibleRow || row > maxVisibleRow) return null;
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
                // 580 顆頭像各自套 boxShadow 會逐一觸發 GPU 合成層，改用便宜很多的 border
                border: '1px solid rgba(0,0,0,0.25)',
              }}
            >
              <Img src={avatarSrc(avatarOrder[i])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
