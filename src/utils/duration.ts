import { FINALE_START_S, FINALE_DURATION_S } from '../constants';
import type { Timeline } from '../types';

/**
 * 影片實際輸出總長（秒）。Credits／片尾愛心手勢／Finale 都疊在絕對時間點播放，
 * 不是接在內容之後，所以取「主內容長度」跟「最後一段結束時間」兩者較大值，而非相加。
 * Finale 現在是全片最後一段（見 constants.ts），FINALE_START_S+FINALE_DURATION_S
 * 依定義永遠等於整體目標總長。timeline.totalDuration 本身維持代表「主內容長度」，
 * 不要拿這個函式的結果覆蓋它。
 */
export function getOutputDurationS(timeline: Timeline): number {
  return Math.max(timeline.totalDuration, FINALE_START_S + FINALE_DURATION_S);
}
