import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { HANDWRITING_FONT } from '../utils/fonts';
import { HERSELF_AVATAR_INDICES } from '../utils/herselfAvatars';

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

// ── 版面與節奏參數（集中管理，要調效果改這裡） ──────────────────────────
// 每頁的網格排列：14欄×7列＝98張/頁，586張分6頁。tile 尺寸跟舊版跑馬燈同級
// （120px 上下），是實測過「看得清楚」的大小；再大每頁塞不下、頁數變多，
// 每頁停留時間就得縮短，反而更看不清楚——這組數字是在固定18秒內
// 「單張大小 × 每頁停留時間」的平衡點。
const COLS = 14;
const ROWS = 7;
const PER_PAGE = COLS * ROWS; // 98
const TILE = 118;
const GAP = 12;
/** 頁與頁之間交叉淡化的長度（frame）。柔和換頁用，不要太長，吃掉停留時間。 */
const CROSSFADE_FRAMES = 14;
/** 每頁極輕微的放大幅度（Ken Burns 的最小化版本）：讓靜止畫面保有一點生命力，
 *  幅度小到不影響辨識。不位移、不旋轉，照片本身完全定住。 */
const PAGE_SCALE_TO = 1.02;
/** 頂部標題列高度（沿用舊版跑馬燈的設計，字幕全程固定顯示、下方漸層保持易讀） */
const HEADER_HEIGHT = 160;

// 指定要提前到第1頁第幾格（1-based）的照片編號，其餘照片維持原本相對順序
// （只是被擠開一格），不是重新洗牌——沿用舊版跑馬燈 FEATURED 的設計。
const FEATURED: Array<{ photoNumber: number; position: number }> = [
  { photoNumber: 371, position: 2 },
];

/** 秀燕姐本人照片開始佔據「每列中間兩格」的起點：第1頁第2列（0-based row 1）。
 *  第1頁第1列維持一般照片（使用者指定）。 */
const HERSELF_COLUMN_LEFT = COLS / 2 - 1; // 第7欄（0-based 6）
const HERSELF_START_ROW_PAGE0 = 1;

/** 把 FEATURED 指定的照片編號搬到指定位置（1-based），回傳「顯示順序 -> 照片編號」對照表。 */
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

/**
 * 建立「顯示格位 -> 照片編號」對照表，一次涵蓋三個排版規則（使用者指定）：
 * 1. 秀燕姐本人的78張（HERSELF_AVATAR_INDICES）集中排在每列最中間兩格
 *    （第7、8欄），從第1頁第2列開始依序往後放、放到沒為止——放完後剩下的
 *    中間格位（最後一頁末2列共4格）回歸一般照片。
 * 2. 其餘照片依原本順序（含 FEATURED 371 在第1頁第2格）填滿剩下的格位。
 * 3. 586張排6頁×98格會剩2個空格：複製第1頁最前面兩張（頭像0與371）補滿，
 *    第1頁原位不動，這兩張會在片中出現兩次。
 */
function buildDisplayOrder(avatarCount: number, totalSlots: number): number[] {
  const herselfQueue = Array.from(HERSELF_AVATAR_INDICES).sort((a, b) => a - b);
  const base = buildAvatarOrder(avatarCount);
  const othersQueue = base.filter((idx) => !HERSELF_AVATAR_INDICES.has(idx));

  const display: number[] = new Array(totalSlots).fill(-1);
  let h = 0;
  for (let slot = 0; slot < totalSlots && h < herselfQueue.length; slot++) {
    const page = Math.floor(slot / PER_PAGE);
    const i = slot % PER_PAGE;
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    if (page === 0 && row < HERSELF_START_ROW_PAGE0) continue;
    if (col === HERSELF_COLUMN_LEFT || col === HERSELF_COLUMN_LEFT + 1) {
      display[slot] = herselfQueue[h++];
    }
  }
  let o = 0;
  for (let slot = 0; slot < totalSlots; slot++) {
    if (display[slot] !== -1) continue;
    // othersQueue 用完後剩下的空格（正好2個、在最後一頁尾端），用第1頁最前面
    // 兩張（base[0]=頭像0、base[1]=FEATURED 371）複製填補
    display[slot] = o < othersQueue.length ? othersQueue[o++] : base[slot - totalSlots + 2];
  }
  return display;
}

/**
 * 片尾彩蛋：586張Q版頭像分成數頁，像相簿一樣一頁一頁靜止呈現，頁間柔和
 * 交叉淡化。取代前一版的3D攝影機穿梭照片牆——那版視覺上有電影感，但照片
 * 一直在移動、多數又在景深遠處，實際上看不清楚內容；而「看清楚每個人」
 * 才是這段片尾的核心目的。每頁靜止約3秒、單張118px（與更早的跑馬燈同級、
 * 實測可辨識的大小），6頁涵蓋全部586張，影片總長不變。
 */
export const FinaleAvatarWallScene: React.FC<FinaleAvatarWallSceneProps> = ({ avatarCount, caption }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const pageCount = Math.ceil(avatarCount / PER_PAGE);
  const totalSlots = pageCount * PER_PAGE;
  const displayOrder = React.useMemo(
    () => buildDisplayOrder(avatarCount, totalSlots),
    [avatarCount, totalSlots]
  );
  // 每頁時長平均分配整段場景；交叉淡化跟下一頁重疊，不佔額外時間
  const pageFrames = durationInFrames / pageCount;

  // 場景整體淡入淡出，跟其他場景一致的手法
  const fadeOutStart = durationInFrames - 20;
  const containerOpacity = interpolate(frame, [0, 15, fadeOutStart, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 網格置中：水平置中於全寬，垂直置中於標題列以下的剩餘空間
  const gridWidth = COLS * TILE + (COLS - 1) * GAP;
  const gridHeight = ROWS * TILE + (ROWS - 1) * GAP;
  const offsetX = (width - gridWidth) / 2;
  const offsetY = HEADER_HEIGHT + (height - HEADER_HEIGHT - gridHeight) / 2;

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
      {Array.from({ length: pageCount }, (_, page) => {
        const pageStart = page * pageFrames;
        const pageEnd = (page + 1) * pageFrames;
        const isLast = page === pageCount - 1;
        // 只渲染目前可見的頁（含交叉淡化重疊期），其他頁不掛載——同一時間 DOM 上
        // 最多兩頁（~196張圖），跟舊版跑馬燈的虛擬化量級相同
        if (frame < pageStart - CROSSFADE_FRAMES || (!isLast && frame > pageEnd + CROSSFADE_FRAMES)) {
          return null;
        }
        // 換頁交叉淡化：淡入與淡出各自獨立內插再相乘（每段輸入都只有兩個嚴格遞增
        // 的點，不會踩到 interpolate 要求輸入嚴格遞增的限制）。首頁不淡入（交給
        // 場景整體淡入）、末頁不淡出（停留到場景結束）。
        // 注意：下一頁的淡入區間刻意提前到自己起點「之前」（pageStart - CF ~
        // pageStart），跟上一頁的淡出區間（pageEnd - CF ~ pageEnd，兩者是同一段
        // 時間）完全重疊，才是真正的交叉淡化——若淡入放在起點之後，兩段變成
        // 一前一後不重疊，換頁瞬間畫面會先暗掉再亮起來（實測踩過這個雷）。
        const fadeInOpacity =
          page === 0
            ? 1
            : interpolate(frame, [pageStart - CROSSFADE_FRAMES, pageStart], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
        const fadeOutOpacity = isLast
          ? 1
          : interpolate(frame, [pageEnd - CROSSFADE_FRAMES, pageEnd], [1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
        const pageOpacity = fadeInOpacity * fadeOutOpacity;
        // 極輕微的整頁放大：從1到1.02，線性即可（幅度太小，緩動差異看不出來）
        const pageScale = interpolate(frame, [pageStart, isLast ? durationInFrames : pageEnd], [1, PAGE_SCALE_TO], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        // 空格已在 buildDisplayOrder 用複製照片補滿，每一頁都是滿版98格
        const first = page * PER_PAGE;
        const count = PER_PAGE;

        return (
          <div
            key={page}
            style={{
              position: 'absolute',
              left: offsetX,
              top: offsetY,
              width: gridWidth,
              height: gridHeight,
              opacity: pageOpacity,
              transform: `scale(${pageScale})`,
              transformOrigin: '50% 50%',
            }}
          >
            {Array.from({ length: count }, (_, i) => {
              const avatarIdx = displayOrder[first + i];
              const isHerself = HERSELF_AVATAR_INDICES.has(avatarIdx);
              const col = i % COLS;
              const row = Math.floor(i / COLS);
              return (
                <div
                  key={avatarIdx}
                  style={{
                    position: 'absolute',
                    left: col * (TILE + GAP),
                    top: row * (TILE + GAP),
                    width: TILE,
                    height: TILE,
                    borderRadius: 6,
                    overflow: 'hidden',
                    // 586顆頭像各自套 boxShadow 會逐一觸發 GPU 合成層，改用便宜的 border——
                    // 只有秀燕姐本人（見 HERSELF_AVATAR_INDICES）才用金框特別標出，
                    // 不是排除她，是「她也在人群中」的畫面，每頁只有幾張不影響效能。
                    border: isHerself ? '3px solid #FFD24C' : '1px solid rgba(0,0,0,0.25)',
                    boxShadow: isHerself ? '0 0 8px rgba(255, 210, 76, 0.7)' : 'none',
                  }}
                >
                  <Img src={avatarSrc(avatarIdx)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              );
            })}
          </div>
        );
      })}

      {/* 頂部標題：固定不動，底下加漸層讓文字在頁面切換時仍清楚（沿用舊版設計） */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_HEIGHT,
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
    </div>
  );
};
