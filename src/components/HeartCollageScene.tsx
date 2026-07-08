import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { computeHeartSlots } from '../utils/heartLayout';
import { KAI_FONT } from '../utils/fonts';

interface HeartCollageSceneProps {
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

// 決定性的假隨機數（Remotion 禁止 Math.random()，每幀重算結果要一致）
function seededRandom(seed: number): number {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// 這次改成依 durationInFrames 比例計算，而非寫死 frame 數——
// 場景時長已經改過好幾次（407→293→現在的 4s=120 frames），每次都要手動等比例
// 重算很容易出錯，乾脆讓節奏隨時長自動縮放。比例基準取自最早用 407 frames 調校出來的版本：
// containerFadeIn 15/407、containerFadeOut 25/407、STAGGER 260/407、FLY 26/407、
// jitter 20/407、CAPTION_START 320/407、captionFadeIn 25/407。
const CONTAINER_FADE_IN_RATIO = 15 / 407;
const CONTAINER_FADE_OUT_RATIO = 25 / 407;
const STAGGER_RATIO = 260 / 407;
const FLY_RATIO = 26 / 407;
const JITTER_RATIO = 20 / 407;
const CAPTION_START_RATIO = 320 / 407;
const CAPTION_FADE_IN_RATIO = 25 / 407;

export const HeartCollageScene: React.FC<HeartCollageSceneProps> = ({ avatarCount, caption }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const slots = React.useMemo(() => computeHeartSlots(avatarCount), [avatarCount]);

  const containerFadeIn = Math.max(4, Math.round(durationInFrames * CONTAINER_FADE_IN_RATIO));
  const containerFadeOutWindow = Math.max(6, Math.round(durationInFrames * CONTAINER_FADE_OUT_RATIO));
  const STAGGER_FRAMES = durationInFrames * STAGGER_RATIO;
  const FLY_FRAMES = durationInFrames * FLY_RATIO;
  const JITTER_FRAMES = durationInFrames * JITTER_RATIO;
  const CAPTION_START = durationInFrames * CAPTION_START_RATIO;
  const captionFadeIn = Math.max(6, Math.round(durationInFrames * CAPTION_FADE_IN_RATIO));

  const fadeOutStart = durationInFrames - containerFadeOutWindow;
  const containerOpacity = interpolate(
    frame,
    [0, containerFadeIn, fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // 版面：Python 版原始畫布是 1920x1080，這裡直接沿用同座標系置中
  const offsetX = (width - 1920) / 2;
  const offsetY = (height - 1080) / 2;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        // 背景本身永遠不透明——這層蓋在 Outro 尾段上，如果背景也跟著淡入淡出，
        // 淡出瞬間會讓還沒淡出的 Outro 文字穿透出來（曾經因此出過 bug）
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, #FFFDF6 0%, #FFF4E0 45%, #FFF0D8 100%)',
      }}
    >
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        opacity: containerOpacity,
      }}
    >
      {slots.map((slot, i) => {
        if (i >= avatarCount) return null;
        const startDelay = (i / avatarCount) * STAGGER_FRAMES + seededRandom(i) * JITTER_FRAMES;
        const progress = interpolate(frame, [startDelay, startDelay + FLY_FRAMES], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: (t) => 1 - (1 - t) * (1 - t) * (1 - t), // ease-out cubic
        });

        // 起始位置：以畫面中心為圓心、大半徑隨機角度散開，像從四面八方聚攏過來
        const angle = seededRandom(i * 7 + 1) * Math.PI * 2;
        const dist = 900 + seededRandom(i * 13 + 2) * 500;
        const startX = 960 + Math.cos(angle) * dist;
        const startY = 540 + Math.sin(angle) * dist;

        const x = interpolate(progress, [0, 1], [startX, slot.x]);
        const y = interpolate(progress, [0, 1], [startY, slot.y]);
        const scale = interpolate(progress, [0, 1], [0.3, 1]);
        const opacity = interpolate(frame, [startDelay, startDelay + FLY_FRAMES * 0.6], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const inner = slot.size - 6;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: offsetX + x - slot.size / 2,
              top: offsetY + y - slot.size / 2,
              width: slot.size,
              height: slot.size,
              transform: `scale(${scale})`,
              opacity,
              background: '#fff8f0',
              borderRadius: 4,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              padding: 3,
            }}
          >
            <Img
              src={avatarSrc(i)}
              style={{ width: inner, height: inner, objectFit: 'cover', borderRadius: 2, display: 'block' }}
            />
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: offsetY + 60,
          display: 'flex',
          justifyContent: 'center',
          opacity: interpolate(frame, [CAPTION_START, CAPTION_START + captionFadeIn], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <span
          style={{
            fontFamily: KAI_FONT,
            fontSize: 44,
            fontWeight: 500,
            color: '#8a6a3a',
            letterSpacing: '0.1em',
            textShadow: '0 2px 8px rgba(255,255,255,0.8)',
          }}
        >
          {caption}
        </span>
      </div>
    </div>
    </div>
  );
};
