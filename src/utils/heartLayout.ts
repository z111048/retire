// 愛心形狀排列演算法，對應 scripts/buildHeartCollage.py 的邏輯（保持一致，
// 這樣視覺上跟原本靜態版愛心拼貼的整體輪廓一樣）。

import silhouetteData from '../../data/heart-silhouette-contour.json';

export interface HeartSlot {
  x: number;
  y: number;
  size: number;
}

export const HEART_CENTER = { x: 960, y: 570 };
const HEART_SPAN = { w: 1300, h: 1140 };

function heartInside(nx: number, ny: number): boolean {
  const x = nx;
  const y = -ny; // 影像座標 y 向下，翻轉讓愛心尖端朝下
  return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;
}

/** 中央人像顯示尺寸，跟 HeartCollageScene 的 CENTER_PORTRAIT_SIZE 對應 */
export interface CenterHole {
  width: number;
  height: number;
}

/** 把 data/heart-silhouette-contour.json（rembg 去背後用 skimage 抓出的輪廓，
 * 座標是原圖 600x650 像素空間）縮放＋平移到場景座標（以 HEART_CENTER 為中心置中）。
 */
function scaledSilhouettePolygon(hole: CenterHole): Array<[number, number]> {
  const [imgW, imgH] = silhouetteData.imageSize;
  const scaleX = hole.width / imgW;
  const scaleY = hole.height / imgH;
  const originX = HEART_CENTER.x - hole.width / 2;
  const originY = HEART_CENTER.y - hole.height / 2;
  return silhouetteData.points.map(([px, py]) => [
    originX + px * scaleX,
    originY + py * scaleY,
  ]);
}

/** Ray casting 點在多邊形內判斷法 */
function pointInPolygon(x: number, y: number, polygon: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** 取得縮放到場景座標、依人像顯示尺寸還原的輪廓點，供頭像貼合排列（環繞效果）用。
 * count 決定要取幾個環繞點（從輪廓上等距抽樣），tile 是每顆環繞頭像的大小，
 * outwardPush 讓每個點沿著「離人像中心的方向」往外推一點，避免大部分被人像本身蓋住、
 * 只露出邊緣一小角——推出去後頭像才會明顯貼在輪廓外側，形成看得出來的環繞效果。
 */
export function computeSilhouetteRingSlots(
  hole: CenterHole,
  count: number,
  tile: number,
  outwardPush = tile * 0.6
): HeartSlot[] {
  const polygon = scaledSilhouettePolygon(hole);
  const total = polygon.length;
  const cx = HEART_CENTER.x;
  const cy = HEART_CENTER.y;
  const slots: HeartSlot[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor((i / count) * total) % total;
    const [px, py] = polygon[idx];
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const x = px + (dx / dist) * outwardPush;
    const y = py + (dy / dist) * outwardPush;
    slots.push({ x, y, size: tile });
  }
  return slots;
}

function collectCenters(tile: number, hole?: CenterHole): Array<[number, number]> {
  const cols = Math.floor(HEART_SPAN.w / tile);
  const rows = Math.floor(HEART_SPAN.h / tile);
  const centers: Array<[number, number]> = [];
  const polygon = hole ? scaledSilhouettePolygon(hole) : null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = HEART_CENTER.x - HEART_SPAN.w / 2 + (c + 0.5) * tile;
      const py = HEART_CENTER.y - HEART_SPAN.h / 2 + (r + 0.5) * tile;
      const nx = (px - HEART_CENTER.x) / ((HEART_SPAN.w / 2) * 0.62);
      const ny = (py - HEART_CENTER.y) / ((HEART_SPAN.h / 2) * 0.62);
      if (heartInside(nx, ny) && !(polygon && pointInPolygon(px, py, polygon))) {
        centers.push([px, py]);
      }
    }
  }
  return centers;
}

/** 找出讓愛心內格數最接近 targetCount 的 tile 大小，回傳排好的槽位陣列（依 y 再 x 排序，順序穩定）。
 * 若指定 centerHole，會依她的實際輪廓（而非矩形）在愛心正中央挖空，該區域內不會排頭像，
 * 讓外圍頭像盡量貼齊她的身形邊緣。
 */
export function computeHeartSlots(targetCount: number, centerHole?: CenterHole): HeartSlot[] {
  let best: { tile: number; centers: Array<[number, number]> } | null = null;
  for (let tile = 14; tile < 60; tile++) {
    // 挖空區域會讓格數變少，用「沒挖空前」的格數判斷 tile 大小是否夠接近目標，
    // 這樣即使中央讓出空間，外圍格子的密度／大小也不會為了硬湊數量而跑掉
    const centersNoHole = collectCenters(tile);
    if (!best || Math.abs(centersNoHole.length - targetCount) < Math.abs(best.centers.length - targetCount)) {
      best = { tile, centers: centersNoHole };
    }
    if (centersNoHole.length < targetCount) break;
  }
  const { tile } = best!;
  const centers = collectCenters(tile, centerHole);
  centers.sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
  return centers.map(([x, y]) => ({ x, y, size: tile }));
}
