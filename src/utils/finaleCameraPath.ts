/**
 * 片尾攝影機的飛行時間軸：把 0~1 的場景進度換算成「攝影機距離牆面多遠」，加上
 * 左右上下的漂移／偏航，讓穿梭過程平順優雅（三次緩動、無彈跳、無快速旋轉），
 * 最後收斂到完全靜止置中，把整片牆與祝福文字乾淨地收在畫面正中央。
 *
 * 三個階段（比例見 finaleWallConfig.ts 的 timing）：
 *   intro（開場）    → 攝影機靜止在 startZ，只有淡入，讓觀眾先看清楚畫面
 *   flyThrough（飛越）→ 距離從 startZ 平順過渡到 nearZ，感覺像穿梭過照片牆
 *   pullBack（拉遠）  → 距離從 nearZ 拉開到能收下整片牆的距離，祝福文字淡入
 */
import { FINALE_WALL_CONFIG } from './finaleWallConfig';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

export interface CameraFrame {
  /** 攝影機到牆面基準的距離（正值，越大越遠、看到的照片整體越小） */
  distance: number;
  driftX: number;
  driftY: number;
  yawDeg: number;
  /** 中央祝福文字的透明度，0~1 */
  captionOpacity: number;
}

export function computeCameraFrame(
  progress: number, // 0~1，整個 Finale 場景的時間進度
  timeSeconds: number, // 場景經過秒數，drift 用真實時間算週期比較直覺、不受總長影響
  pullBackDistance: number
): CameraFrame {
  const { camera, timing } = FINALE_WALL_CONFIG;
  const introEnd = timing.introRatio;
  const flyEnd = introEnd + timing.flyThroughRatio;

  let distance: number;
  // 漂移幅度的包絡：拉遠階段要收斂到 0，確保結尾畫面完全穩定、不會有殘留晃動
  let driftEnvelope: number;

  if (progress <= introEnd) {
    const t = introEnd > 0 ? progress / introEnd : 1;
    distance = camera.startZ;
    driftEnvelope = easeInOutCubic(clamp01(t * 1.5)); // 漂移比淡入快一點進場，開場就有呼吸感
  } else if (progress <= flyEnd) {
    const t = easeInOutCubic(clamp01((progress - introEnd) / timing.flyThroughRatio));
    distance = camera.startZ + (camera.nearZ - camera.startZ) * t;
    driftEnvelope = 1;
  } else {
    const t = easeInOutCubic(
      timing.pullBackRatio > 0 ? clamp01((progress - flyEnd) / timing.pullBackRatio) : 1
    );
    distance = camera.nearZ + (pullBackDistance - camera.nearZ) * t;
    driftEnvelope = 1 - t;
  }

  const driftX =
    Math.sin((timeSeconds / camera.driftPeriodS) * Math.PI * 2) * camera.driftAmplitudePx * driftEnvelope;
  const driftY =
    Math.sin((timeSeconds / (camera.driftPeriodS * 1.37)) * Math.PI * 2 + 1.3) *
    camera.driftAmplitudePx *
    0.6 *
    driftEnvelope;
  const yawDeg =
    Math.sin((timeSeconds / (camera.driftPeriodS * 0.83)) * Math.PI * 2 + 0.7) * camera.yawDeg * driftEnvelope;

  // 祝福文字：拉遠段落開始一段時間後才淡入（讓「牆先被看清楚」再出現文字，
  // 不要文字跟拉遠動作同時搶注意力），開場／飛越過程中維持完全透明。
  let captionOpacity = 0;
  if (progress > flyEnd && timing.pullBackRatio > 0) {
    const pullT = clamp01((progress - flyEnd) / timing.pullBackRatio);
    const fadeStart = timing.captionDelayRatio;
    const fadeEnd = timing.captionDelayRatio + timing.captionFadeInRatio;
    captionOpacity = easeInOutCubic(clamp01((pullT - fadeStart) / Math.max(1e-6, fadeEnd - fadeStart)));
  }

  return { distance, driftX, driftY, yawDeg, captionOpacity };
}
