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

let loaded: Promise<void> | null = null;

export function loadCustomFonts(): Promise<void> {
  if (!loaded) {
    loaded = Promise.all(
      FONT_DEFS.map(async (d) => {
        const face = new FontFace(d.family, `url("${fontUrl(d.file)}")`);
        await face.load();
        document.fonts.add(face);
      })
    ).then(() => undefined);
  }
  return loaded;
}
