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

/** 以中心為圓心，找輪廓多邊形在指定角度方向上的邊界半徑（射線法+二分搜尋），
 * 假設多邊形對中心大致呈星狀（人像輪廓以身體中心為圓心大致成立）。
 * 找不到交點（該角度方向從中心出發就已經在多邊形外，例如手臂造成的凹陷）時回傳極小半徑，
 * 讓那個角度的頭像能貼得更近，視覺上不會露出破洞。
 */
function polygonRadiusAtAngle(
  polygon: Array<[number, number]>,
  cx: number,
  cy: number,
  angle: number,
  maxR: number
): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  if (!pointInPolygon(cx + dx, cy + dy, polygon)) return 1;
  let lo = 0;
  let hi = maxR;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (pointInPolygon(cx + dx * mid, cy + dy * mid, polygon)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** 找愛心曲線在指定角度方向上的邊界半徑，邏輯同 polygonRadiusAtAngle，只是邊界換成 heartInside()。 */
function heartRadiusAtAngle(angle: number, maxR: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let lo = 0;
  let hi = maxR;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const px = HEART_CENTER.x + dx * mid;
    const py = HEART_CENTER.y + dy * mid;
    const nx = (px - HEART_CENTER.x) / ((HEART_SPAN.w / 2) * 0.62);
    const ny = (py - HEART_CENTER.y) / ((HEART_SPAN.h / 2) * 0.62);
    if (heartInside(nx, ny)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** 取樣愛心曲線的邊界座標點，供畫一條「圍住所有頭像」的外框線用——
 * 同心圓環排列在最外緣會因為頭像是一顆顆離散的方塊而卡出鋸齒狀，
 * 疊一層貼齊愛心曲線本身的框線／底色，能把鋸齒感統一收在一個完整外框裡。
 */
export function computeHeartOutlinePoints(samples = 240): Array<[number, number]> {
  const cx = HEART_CENTER.x;
  const cy = HEART_CENTER.y;
  const maxR = Math.max(HEART_SPAN.w, HEART_SPAN.h);
  const points: Array<[number, number]> = [];
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2;
    const r = heartRadiusAtAngle(angle, maxR);
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  return points;
}

const ANGLE_SAMPLES = 720;

/** 把「角度 -> 半徑」的函式取樣成查表陣列，之後查詢用線性內插取代重算，
 * 避免每次都要做二分搜尋（在 computeConcentricRingSlots 裡會被查詢上萬次）。
 */
function buildRadialLookup(radiusAt: (angle: number) => number): Float64Array {
  const table = new Float64Array(ANGLE_SAMPLES);
  for (let i = 0; i < ANGLE_SAMPLES; i++) {
    table[i] = radiusAt((i / ANGLE_SAMPLES) * Math.PI * 2);
  }
  return table;
}

function lookupRadius(table: Float64Array, angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  const f = (a / (Math.PI * 2)) * ANGLE_SAMPLES;
  const i0 = Math.floor(f) % ANGLE_SAMPLES;
  const i1 = (i0 + 1) % ANGLE_SAMPLES;
  const t = f - Math.floor(f);
  return table[i0] * (1 - t) + table[i1] * t;
}

// 愛心曲線的半徑查表只跟 HEART_CENTER/HEART_SPAN 這兩個常數有關，跟 targetCount、hole 無關，
// 全模組只需要算一次就能重複用（懶初始化，避免沒用到這個排列方式時白算）。
let heartRadiusTableCache: Float64Array | null = null;
function getHeartRadiusTable(maxR: number): Float64Array {
  if (!heartRadiusTableCache) {
    heartRadiusTableCache = buildRadialLookup((angle) => heartRadiusAtAngle(angle, maxR));
  }
  return heartRadiusTableCache;
}

/** 頭像沿著「她的輪廓」到「愛心外框」之間，一圈一圈同心排列，把整個區域填滿
 * （呼應文案「大家的心，都圍繞著妳」——是圍繞，不是單純堆疊成愛心形狀的網格）。
 * 每一圈的半徑 = 該角度的輪廓半徑 + 圈數*圈距，超出愛心外框的角度就不放（讓外圈自然貼合愛心尖端變窄的形狀），
 * 相鄰圈刻意錯開半格角度，避免頭像對成一條條放射狀直線、看起來像輪輻而不是同心圓環。
 */
export function computeConcentricRingSlots(hole: CenterHole, targetCount: number): HeartSlot[] {
  const polygon = scaledSilhouettePolygon(hole);
  const cx = HEART_CENTER.x;
  const cy = HEART_CENTER.y;
  const maxR = Math.max(HEART_SPAN.w, HEART_SPAN.h);

  const innerTable = buildRadialLookup((angle) => polygonRadiusAtAngle(polygon, cx, cy, angle, maxR));
  const outerTable = getHeartRadiusTable(maxR);

  // 圈距／角度間距都刻意小於 tileSize，讓相鄰的頭像方塊互相輕微重疊——
  // 實測過：方塊沿著極座標網格排列，就算圈距=tileSize（緊貼不重疊），
  // 曲線邊界跟方塊本身的落差還是會在圈與圈、頭像與頭像之間露出背景色的縫隙
  // （用 456788px² 的可填區面積實測，圈距0.95/角度1.0 只有約89%覆蓋率）。
  // 這兩個重疊係數是拿同一份輪廓資料跑覆蓋率模擬找出來的：0.7/0.75 能把覆蓋率
  // 推到99%，且剛好在 tileSize=40 時湊出跟實際 580 張頭像一致的格數，不需要
  // 截斷多餘的外圈、也不必重複使用照片。
  const RING_STEP_FACTOR = 0.7;
  const ANGULAR_SPACING_FACTOR = 0.75;

  function build(tileSize: number): HeartSlot[] {
    const ringStep = tileSize * RING_STEP_FACTOR;
    const slots: HeartSlot[] = [];
    for (let k = 0; k < 400; k++) {
      // 用取樣角度的平均半徑估計這一圈的周長，決定要放幾顆頭像，讓角度間距接近 tileSize
      let sum = 0;
      const AVG_SAMPLES = 48;
      for (let i = 0; i < AVG_SAMPLES; i++) {
        sum += lookupRadius(innerTable, (i / AVG_SAMPLES) * Math.PI * 2) + k * ringStep;
      }
      const rNominal = sum / AVG_SAMPLES;
      if (rNominal > maxR) break;
      const count = Math.max(6, Math.round((2 * Math.PI * rNominal) / (tileSize * ANGULAR_SPACING_FACTOR)));
      const angleOffset = k % 2 === 0 ? 0 : Math.PI / count;
      let placedAny = false;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + angleOffset;
        const innerR = lookupRadius(innerTable, angle);
        const outerR = lookupRadius(outerTable, angle);
        const r = innerR + k * ringStep;
        if (r <= outerR) {
          slots.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, size: tileSize });
          placedAny = true;
        }
      }
      if (!placedAny) break;
    }
    return slots;
  }

  // tile 越大格數越少，是單調遞減關係。要選「格數還是 >= targetCount」的最後一個
  // （也就是最接近但不小於目標的 tile size），格數一旦低於目標就代表頭像會被平白丟掉
  // ——選「最接近」而不管有沒有低於目標的話，可能選到格數不足的 tile，讓最後幾張大頭貼消失不見。
  let best: { slots: HeartSlot[] } | null = null;
  for (let tileSize = 14; tileSize < 60; tileSize++) {
    const slots = build(tileSize);
    if (slots.length < targetCount) break;
    best = { slots };
  }
  // 理論上 tile=14（最密）都湊不到 targetCount 顆的極端情況，退而求其次選格數最多的一組。
  const slots = (best ?? { slots: build(14) }).slots;

  // 依「離中心的半徑」由內而外排序，讓飛入動畫從貼身的內圈先組成，外圈才陸續補上，
  // 視覺上呈現「一圈一圈圍繞」逐漸擴散出去的效果。
  slots.sort((a, b) => {
    const ra = Math.hypot(a.x - cx, a.y - cy);
    const rb = Math.hypot(b.x - cx, b.y - cy);
    return ra - rb;
  });
  return slots;
}

