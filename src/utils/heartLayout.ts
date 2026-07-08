// 愛心形狀排列演算法，對應 scripts/buildHeartCollage.py 的邏輯（保持一致，
// 這樣視覺上跟原本靜態版愛心拼貼的整體輪廓一樣）。

export interface HeartSlot {
  x: number;
  y: number;
  size: number;
}

const HEART_CENTER = { x: 960, y: 570 };
const HEART_SPAN = { w: 1300, h: 1140 };

function heartInside(nx: number, ny: number): boolean {
  const x = nx;
  const y = -ny; // 影像座標 y 向下，翻轉讓愛心尖端朝下
  return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;
}

function collectCenters(tile: number): Array<[number, number]> {
  const cols = Math.floor(HEART_SPAN.w / tile);
  const rows = Math.floor(HEART_SPAN.h / tile);
  const centers: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = HEART_CENTER.x - HEART_SPAN.w / 2 + (c + 0.5) * tile;
      const py = HEART_CENTER.y - HEART_SPAN.h / 2 + (r + 0.5) * tile;
      const nx = (px - HEART_CENTER.x) / ((HEART_SPAN.w / 2) * 0.62);
      const ny = (py - HEART_CENTER.y) / ((HEART_SPAN.h / 2) * 0.62);
      if (heartInside(nx, ny)) centers.push([px, py]);
    }
  }
  return centers;
}

/** 找出讓愛心內格數最接近 targetCount 的 tile 大小，回傳排好的槽位陣列（依 y 再 x 排序，順序穩定）。 */
export function computeHeartSlots(targetCount: number): HeartSlot[] {
  let best: { tile: number; centers: Array<[number, number]> } | null = null;
  for (let tile = 14; tile < 60; tile++) {
    const centers = collectCenters(tile);
    if (!best || Math.abs(centers.length - targetCount) < Math.abs(best.centers.length - targetCount)) {
      best = { tile, centers };
    }
    if (centers.length < targetCount) break;
  }
  const { tile, centers } = best!;
  centers.sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
  return centers.map(([x, y]) => ({ x, y, size: tile }));
}
