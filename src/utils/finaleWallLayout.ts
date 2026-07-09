/**
 * 計算每張照片在 3D 世界座標中的固定位置（跟時間無關，useMemo 只算一次）。
 *
 * 版面邏輯：先排成 cols 欄的網格決定 X/Y；深度（Z）則是每張獨立、連續分布的
 * 隨機值（見下面 computeWallLayout 內的說明）——原本試過用「(row+col) 對深度
 * 層數取餘數」分成幾個離散棋盤式深度帶，實測發現人眼對格線規律極敏感，即使
 * 幅度調小，整片牆還是會被讀成一道道對角線紋路，改成連續隨機分布才沒有這個
 * 問題，細節見 finaleWallConfig.ts 的 depthRangePx 註解。
 */
import { FINALE_WALL_CONFIG } from './finaleWallConfig';

export interface WallTile {
  avatarIdx: number;
  x: number;
  y: number;
  z: number;
  /** 固定的隨機傾斜（rotateZ），營造隨性的照片牆手感 */
  tiltDeg: number;
  /** 固定的隨機小角度側傾（rotateY），加強立體感 */
  yawDeg: number;
  floatAmplitudePx: number;
  floatPeriodS: number;
  /** 0~2π，讓每張照片的飄浮相位錯開，避免全部同步 */
  floatPhase: number;
}

export interface WallBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

// 決定性的假隨機數（Remotion 禁止 Math.random()，每幀重算結果要一致）；
// 沿用專案裡 HeartCollageScene.tsx 已經在用的同一套演算法，保持風格一致。
function seededRandom(seed: number): number {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * priorityAvatarIndices：想讓哪些 avatarIdx 排進最靠近攝影機起點、最早被看清楚
 * 的深度層（對應舊版跑馬燈 FEATURED「提前到第幾張」的設計意圖，3D 牆裡改成
 * 「排進最前面的深度層」而不是「線性捲動順序的第幾個」，語意對應但實作方式
 * 因應新的空間排列邏輯而調整）。長度可以小於 avatarCount，其餘照片依原本
 * avatarIdx 順序接著排。
 */
export function computeWallLayout(
  avatarCount: number,
  priorityAvatarIndices: number[] = []
): { tiles: WallTile[]; bounds: WallBounds } {
  const { layout, motion } = FINALE_WALL_CONFIG;
  const { cols, colGapPx, rowGapPx, depthRangePx } = layout;
  const rows = Math.ceil(avatarCount / cols);

  const prioritySet = new Set(priorityAvatarIndices.filter((i) => i < avatarCount));
  const order = [
    ...priorityAvatarIndices.filter((i) => i < avatarCount),
    ...Array.from({ length: avatarCount }, (_, i) => i).filter((i) => !prioritySet.has(i)),
  ];

  const tiles: WallTile[] = [];
  const bounds: WallBounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };

  order.forEach((avatarIdx, seqIdx) => {
    const row = Math.floor(seqIdx / cols);
    const col = seqIdx % cols;

    const x = (col - (cols - 1) / 2) * colGapPx;
    const y = (row - (rows - 1) / 2) * rowGapPx;

    // 每張獨立、連續分布的隨機深度：兩個獨立隨機數取平均，讓分布呈鐘型（多數
    // 照片集中在中間深度、少數在最前/最後），比均勻隨機更像自然層次，也完全
    // 沒有可辨識的格線圖案（見 finaleWallConfig.ts depthRangePx 的註解）。
    // priorityAvatarIndices（見本函式上方註解）強制排到最前面（z 最大＝離攝影機
    // 起點最近），不用隨機分布，確保「提前被看清楚」的意圖穩定生效。
    const isPriority = seqIdx < priorityAvatarIndices.length;
    const depthSample = (seededRandom(avatarIdx * 13 + 7) + seededRandom(avatarIdx * 41 + 19)) / 2;
    const z = isPriority ? depthRangePx * 0.45 : (depthSample - 0.5) * depthRangePx;

    const tiltDeg = (seededRandom(avatarIdx * 31 + 3) - 0.5) * 2 * motion.staticTiltDeg;
    const yawDeg = (seededRandom(avatarIdx * 53 + 11) - 0.5) * 2 * (motion.staticTiltDeg * 0.6);
    const [minPeriod, maxPeriod] = motion.floatPeriodRangeS;
    const floatPeriodS = minPeriod + seededRandom(avatarIdx * 71 + 17) * (maxPeriod - minPeriod);
    const floatPhase = seededRandom(avatarIdx * 97 + 23) * Math.PI * 2;

    tiles.push({
      avatarIdx,
      x,
      y,
      z,
      tiltDeg,
      yawDeg,
      floatAmplitudePx: motion.floatAmplitudePx,
      floatPeriodS,
      floatPhase,
    });

    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
    bounds.minZ = Math.min(bounds.minZ, z);
    bounds.maxZ = Math.max(bounds.maxZ, z);
  });

  return { tiles, bounds };
}

/**
 * 依牆的實際尺寸與畫面比例，算出「拉遠到什麼距離才能把整片牆收進畫面」的下限，
 * 取代憑感覺猜一個常數——版面參數（欄數／間距／深度層數）以後如果調整，拉遠
 * 距離會自動跟著算，不用每次改版面都手動重新試。
 *
 * 推導：CSS perspective 投影下，元素的螢幕縮放比例 scale = P / (P - z)，
 * 其中 z 是元素相對透視原點的有效深度（此處 = 牆面座標 - 攝影機距離）。
 * 要讓牆的整體寬／高投影後收進 targetSize 以內，兩個方向都要滿足，取較嚴格者；
 * 另外要涵蓋離攝影機「最近」那一層（bounds.maxZ），否則前排照片會被拉遠拉出畫面外。
 */
export function computeRequiredPullBackDistance(
  bounds: WallBounds,
  perspectivePx: number,
  viewportWidth: number,
  viewportHeight: number,
  marginRatio = 1.25 // 額外留白，避免牆的邊緣剛好貼著畫面邊界
): number {
  const { tileSizePx } = FINALE_WALL_CONFIG.layout;
  const wallWidth = bounds.maxX - bounds.minX + tileSizePx;
  const wallHeight = bounds.maxY - bounds.minY + tileSizePx;

  // scale <= 1/marginRatio  =>  P/(P - z) <= 1/marginRatio  =>  z <= P - P*marginRatio
  // 這裡 z = bounds.maxZ - distance（最靠近攝影機那層的有效深度），解出 distance 下限：
  // distance >= bounds.maxZ - (P - P*marginRatio) = bounds.maxZ + P*(marginRatio - 1)
  const zForWidth = (wallWidth * marginRatio) / viewportWidth;
  const zForHeight = (wallHeight * marginRatio) / viewportHeight;
  const scaleFactor = Math.max(zForWidth, zForHeight); // 目標：牆的投影尺寸 * scaleFactor <= 對應視窗尺寸
  const distanceForFit = perspectivePx * scaleFactor - perspectivePx + bounds.maxZ;

  return Math.max(distanceForFit, FINALE_WALL_CONFIG.camera.pullBackZMin);
}
