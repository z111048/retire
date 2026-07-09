import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { computeConcentricRingSlots, computeHeartOutlinePoints, HEART_CENTER } from '../utils/heartLayout';
import type { HeartSlot } from '../utils/heartLayout';
import { KAI_FONT } from '../utils/fonts';
import { HERSELF_AVATAR_INDICES } from '../utils/herselfAvatars';

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

function centerPortraitSrc(): string {
  const file = 'images/heart-center-portrait.png';
  if (typeof window !== 'undefined' && window.__REMOTION_BASE__) {
    return window.__REMOTION_BASE__ + file;
  }
  return staticFile(file);
}

// 中央人像挖空區域尺寸，頭像組成的愛心會繞著這塊區域排列
const CENTER_PORTRAIT_SIZE = { width: 330, height: 358 }; // 跟 public/images/heart-center-portrait.jpg 等比例(600x650)

// 實際擺放的頭像數量：用可填區面積（約456788px²）跑覆蓋率模擬選出來的，
// 580 張全部塞進去要嘛覆蓋率不夠（不重疊，坑坑巴巴）、要嘛得靠明顯重疊硬湊
// （看起來很擠、頭像疊頭像）。520 在 heartLayout.ts 的重疊係數下能配到約95%
// 覆蓋率，重疊幅度小到只是「緊貼」，不是「疊在一起」，是兩者間最好的平衡點。
const HEART_TILE_TARGET = 520;
const AVATAR_SHUFFLE_SEED = 20260708; // 固定種子，同一支影片每次重算結果要一致

// 決定性的假隨機數（Remotion 禁止 Math.random()，每幀重算結果要一致）
function seededRandom(seed: number): number {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// 排列演算法算出的格數（依覆蓋率計算，見 heartLayout.ts）比 580 張頭像池小，
// 所以改成從池子裡「隨機抽 N 張」而不是固定取前 N 張——用同一套 seededRandom
// 做 Fisher-Yates，確保每次重算（同一支影片的每一幀）抽到的組合都一樣。
function seededShuffledIndices(poolSize: number, count: number, seed: number): number[] {
  const arr = Array.from({ length: poolSize }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i * 97) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

// 字幕要先出現，大頭貼在字幕出現之後才飛入組成愛心，而不是等飛入完成才顯示字幕。
const FLY_FRAMES = 12; // 單顆頭像飛入所需時間（固定，跟時長無關）
const JITTER_FRAMES = 12; // 飛入起始時間的隨機抖動範圍（固定）

/** 單顆頭像的飛入動畫＋渲染，愛心外框跟輪廓環繞層共用同一套邏輯 */
function renderAvatarTile(
  i: number,
  avatarIdx: number,
  slot: HeartSlot,
  frame: number,
  totalTiles: number,
  STAGGER_FRAMES: number,
  offsetX: number,
  offsetY: number
) {
  const startDelay = (i / totalTiles) * STAGGER_FRAMES + seededRandom(i) * JITTER_FRAMES;
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
  const isHerself = HERSELF_AVATAR_INDICES.has(avatarIdx);
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
        // 580 顆頭像各自套 boxShadow 會逐一觸發 GPU 合成層（跟 FloatingParticles.tsx
        // 避免的原因一樣，但這裡數量多了近100倍），改用便宜很多的 border 做邊框效果
        // 秀燕姐本人混在人群裡的頭像，用金框特別標出來（不排除，是「她也在人群中」的畫面）
        border: isHerself ? '2px solid #FFD24C' : '1px solid rgba(0,0,0,0.12)',
        boxShadow: isHerself ? '0 0 6px rgba(255, 210, 76, 0.7)' : 'none',
        padding: 3,
      }}
    >
      <Img
        src={avatarSrc(avatarIdx)}
        style={{ width: inner, height: inner, objectFit: 'cover', borderRadius: 2, display: 'block' }}
      />
    </div>
  );
}
const CAPTION_FADE_FRAMES = 8; // 字幕淡入時間
const CAPTION_START_FRAMES = 10; // 字幕在容器淡入後很快就出現
const CONTAINER_FADE_IN_FRAMES = 8;
const CONTAINER_FADE_OUT_FRAMES = 15;

export const HeartCollageScene: React.FC<HeartCollageSceneProps> = ({ avatarCount, caption }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const slots = React.useMemo(
    () => computeConcentricRingSlots(CENTER_PORTRAIT_SIZE, HEART_TILE_TARGET),
    []
  );
  // 從 580 張頭像池裡隨機抽出跟排列格數一樣多的照片（不重複），而不是固定取前 N 張
  const avatarIndices = React.useMemo(
    () => seededShuffledIndices(avatarCount, slots.length, AVATAR_SHUFFLE_SEED),
    [avatarCount, slots.length]
  );
  // 愛心外框線的座標點固定不變（只跟 HEART_CENTER/HEART_SPAN 有關），只需算一次
  const heartOutline = React.useMemo(() => computeHeartOutlinePoints(), []);

  const containerFadeIn = CONTAINER_FADE_IN_FRAMES;
  const containerFadeOutWindow = CONTAINER_FADE_OUT_FRAMES;
  const fadeOutStart = durationInFrames - containerFadeOutWindow;

  // 頭像飛入的總時間窗：字幕先出現後，頭像才開始飛入，依時長比例（上限220 frames）
  const STAGGER_FRAMES = Math.min(durationInFrames * 0.4, 220, Math.max(20, fadeOutStart - JITTER_FRAMES - FLY_FRAMES - 5));

  const captionFadeIn = CAPTION_FADE_FRAMES;
  const CAPTION_START = CAPTION_START_FRAMES;
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
      {/* 愛心外框：畫在所有頭像「最後面」墊底，同心圓環排列在最外緣本來就會因為頭像
          是一顆顆離散方塊而卡出鋸齒，這層貼齊愛心曲線的底色＋邊框線會從縫隙裡透出來，
          把鋸齒感收束成一個完整、有邊界的愛心形狀，視覺上更像「大家圍在一起」。 */}
      <svg
        style={{ position: 'absolute', left: offsetX, top: offsetY, width: 1920, height: 1080, overflow: 'visible' }}
        viewBox="0 0 1920 1080"
      >
        <polygon
          points={heartOutline.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="rgba(255, 231, 194, 0.55)"
          stroke="#d9ae6b"
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </svg>

      {slots.map((slot, i) =>
        renderAvatarTile(i, avatarIndices[i], slot, frame, slots.length, STAGGER_FRAMES, offsetX, offsetY)
      )}

      {/* 中央人像：秀燕姐本人，已去背取出精確輪廓，直接融入背景不需要卡片外框 */}
      <div
        style={{
          position: 'absolute',
          left: offsetX + HEART_CENTER.x - CENTER_PORTRAIT_SIZE.width / 2,
          top: offsetY + HEART_CENTER.y - CENTER_PORTRAIT_SIZE.height / 2,
          width: CENTER_PORTRAIT_SIZE.width,
          height: CENTER_PORTRAIT_SIZE.height,
          opacity: interpolate(frame, [CAPTION_START, CAPTION_START + captionFadeIn * 2], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <Img
          src={centerPortraitSrc()}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>

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
