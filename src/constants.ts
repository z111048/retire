export const FRAME_RATE = 30;
export const INTRO_DURATION_S = 6;
export const OUTRO_DURATION_S = 21;
export const AVATAR_COUNT = 586;     // 對應 data/face-selection.json 的 keepFiles 數量

// 愛心拼貼原本是「今天換我們歡送你」章節內的加權項目，現在改成獨立的絕對時間場景，
// 移到 Outro 尾聲（此時最後一句祝福語已顯示完畢）之後。
// 順序：愛心拼貼 → Credits → 片尾愛心手勢 → Finale人牆（Finale 現在是全片最後一段，
// 播放到剛好 320s，時長 = 320 - 前面三段結束時間，藉此順便讓跑馬燈速度慢下來）。
export const HEART_START_S = 285;      // 4:45，固定絕對時間點（會疊在 Outro 尾段上）
export const HEART_DURATION_S = 4;
export const CREDITS_START_S = HEART_START_S + HEART_DURATION_S; // 愛心拼貼結束後緊接
export const CREDITS_DURATION_S = 5;

// 片尾愛心手勢（秀燕姐Q版插畫比愛心，Google Flow 生成）：8 秒
// （前5秒動作、後3秒定格，見 public/videos/finale-heart-gesture.mp4）
export const FINAL_CLIP_START_S = CREDITS_START_S + CREDITS_DURATION_S;
export const FINAL_CLIP_DURATION_S = 8;

// Finale 人牆跑馬燈：全片最後一段，播放到剛好 5:20（320s）結束。
// 捲動用固定的較慢速度（見 FinaleAvatarWallScene 的 SCROLL_SPEED_PX_PER_S），
// 捲到哪算哪，不需要在時間內剛好捲完。
export const FINALE_START_S = FINAL_CLIP_START_S + FINAL_CLIP_DURATION_S;
export const FINALE_DURATION_S = 320 - FINALE_START_S; // = 18s
export const SECTION_TITLE_DURATION_S = 3.5;
export const LYRIC_DURATION_S = 3;
export const DEFAULT_PHOTO_DURATION_S = 3;
export const HIGH_IMPORTANCE_PHOTO_DURATION_S = 3;
export const MONTAGE_PHOTO_DURATION_S = 1.5;

// 章節標題主題色（同一套暖色系家族微調色相），讓 8 個章節從明亮金→溫暖玫瑰金
// 隨劇情推進到情緒高點，不用預設 gold 那麼單一。找不到對應 id 時 fallback 用預設金色。
export const SECTION_ACCENTS: Record<string, string> = {
  youth: '#D4AF37',
  gatherings: '#D9A05B',
  outings: '#DFAE4A',
  fanclub: '#D9A66E',
  'yearend-show': '#C98C4A',
  farewells: '#C99070',
  'our-turn': '#C97F6B',
  tribute: '#B97A5C',
};
export const DEFAULT_SECTION_ACCENT = '#C9A84C';
