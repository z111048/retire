export const FRAME_RATE = 30;
export const INTRO_DURATION_S = 6;
export const OUTRO_DURATION_S = 21;
export const AVATAR_COUNT = 580;     // 對應 data/face-selection.json 的 keepFiles 數量

// 愛心拼貼原本是「今天換我們歡送你」章節內的加權項目，現在改成獨立的絕對時間場景，
// 移到 Outro 尾聲（此時最後一句祝福語已顯示完畢）跟 Credits 之間。
// 為了讓總長維持 320s（5:20）不變，heart/credits/finale 三段時長都按同一比例
// （0.7207，= (320-285) / 原本三段總和48.57s）等比例縮短。
export const HEART_START_S = 285;      // 4:45，固定絕對時間點（會疊在 Outro 尾段上）
export const HEART_DURATION_S = 293 / 30;  // ≈9.77s（原13.57s，等比例縮短）
export const CREDITS_START_S = HEART_START_S + HEART_DURATION_S; // 愛心拼貼結束後緊接
export const CREDITS_DURATION_S = 195 / 30; // ≈6.5s（原9s，等比例縮短）
export const FINALE_START_S = CREDITS_START_S + CREDITS_DURATION_S; // Credits 結束後緊接
export const FINALE_DURATION_S = 562 / 30; // ≈18.73s（原26s，等比例縮短）
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
