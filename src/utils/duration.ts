import { FINAL_CLIP_START_S, FINAL_CLIP_DURATION_S } from '../constants';
import type { Timeline } from '../types';

/**
 * 影片實際輸出總長（秒）。Credits／Finale／片尾最後鏡頭都疊在絕對時間點播放，
 * 不是接在內容之後，所以取「主內容長度」跟「最後一段結束時間」兩者較大值，而非相加。
 * timeline.totalDuration 本身維持代表「主內容長度」，不要拿這個函式的結果覆蓋它。
 */
export function getOutputDurationS(timeline: Timeline): number {
  return Math.max(timeline.totalDuration, FINAL_CLIP_START_S + FINAL_CLIP_DURATION_S);
}
