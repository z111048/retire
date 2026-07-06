import { staticFile } from 'remotion';

declare global {
  interface Window {
    __REMOTION_BASE__?: string;
  }
}

// 開源字體（皆為 SIL OFL 授權，已子集化至 public/fonts/，見 scripts/subset-fonts.py）
//   辰宇落雁體 — 手寫感，用於標題與結尾等情感文字
//   霞鶩文楷 TC — 楷書溫潤，用於字幕、歌詞等需要易讀性的文字
export const HANDWRITING_FONT =
  '"ChenYuluoyan", "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif';
export const KAI_FONT =
  '"LXGW WenKai TC", "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif';

function fontUrl(file: string): string {
  if (typeof window !== 'undefined' && window.__REMOTION_BASE__) {
    return window.__REMOTION_BASE__ + 'fonts/' + file;
  }
  return staticFile('fonts/' + file);
}

const FONT_DEFS = [
  { family: 'ChenYuluoyan', file: 'ChenYuluoyan.ttf' },
  { family: 'LXGW WenKai TC', file: 'LXGWWenKaiTC.ttf' },
];

// 曾試過用 delayRender 阻塞等待字型載入完成（new FontFace().load() 與
// document.fonts.load() 都試過），高併發 render 時偶爾會整個 render 卡死、
// 甚至讓 render 程序當機——懷疑是某個分頁的 JS 執行緒被卡住，不只是字型
// fetch 慢而已，逾時保護救不回來。
//
// 改成不阻塞：只註冊 @font-face（font-display: block 讓瀏覽器自己決定，
// 最多空白等待數百毫秒~3秒就會 fallback 顯示備用字體，肉眼幾乎不可見），
// 同時主動呼叫 document.fonts.load() 提前觸發載入但不等待它。
// 用可靠的 render（極少數幀可能briefly使用備用字體）換掉會當機的完美同步。
let styleInjected = false;
function injectFontFaceCSS() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = FONT_DEFS.map((d) => `
    @font-face {
      font-family: '${d.family}';
      src: url('${fontUrl(d.file)}') format('truetype');
      font-display: block;
    }
  `).join('\n');
  document.head.appendChild(style);
}

export function loadCustomFonts(): void {
  injectFontFaceCSS();
  for (const d of FONT_DEFS) {
    document.fonts.load(`16px "${d.family}"`).catch(() => {
      console.warn(`字型預先載入失敗（不影響顯示）：${d.family}`);
    });
  }
}
