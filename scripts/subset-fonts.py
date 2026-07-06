#!/usr/bin/env python3
"""字型子集化：從 data/*.json 收集影片會用到的所有字元，
把 assets/fonts/ 的完整字型裁成小檔輸出到 public/fonts/。

文案或歌詞改動後若出現新字，重跑：python3 scripts/subset-fonts.py
（缺字會 fallback 到 Noto Sans TC，不會壞版面，只是風格不一致）
"""
import json
import string
from pathlib import Path

from fontTools.subset import Subsetter, Options
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / 'assets' / 'fonts'
OUT_DIR = ROOT / 'public' / 'fonts'

FONTS = [
    ('ChenYuluoyan-2.0-Thin.ttf', 'ChenYuluoyan.ttf'),   # 手寫：標題、結尾
    ('LXGWWenKaiTC-Medium.ttf', 'LXGWWenKaiTC.ttf'),     # 楷書：字幕、歌詞
]


def collect_chars() -> set[str]:
    chars: set[str] = set()

    def walk(x):
        if isinstance(x, str):
            chars.update(x)
        elif isinstance(x, dict):
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)

    for name in ('timeline.json', 'copywriting.json', 'lyrics-timing.json'):
        walk(json.loads((ROOT / 'data' / name).read_text(encoding='utf-8')))

    # ASCII、全形標點、常用符號（含播放器 UI 會出現的字）
    chars.update(string.printable)
    chars.update('，。、！？：；「」『』（）─…～·〜ㄧ')
    chars.update('０１２３４５６７８９％')
    chars.update('播放暫停重新載入中請稍候影片音樂張秒分鐘')
    return chars


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    text = ''.join(sorted(collect_chars()))
    print(f'共 {len(text)} 個字元')

    for src_name, out_name in FONTS:
        src = SRC_DIR / src_name
        out = OUT_DIR / out_name
        font = TTFont(src)
        opts = Options()
        opts.layout_features = ['*']
        opts.name_IDs = [1, 2, 3, 4, 6]
        subsetter = Subsetter(opts)
        subsetter.populate(text=text)
        subsetter.subset(font)
        font.save(out)
        before = src.stat().st_size / 1048576
        after = out.stat().st_size / 1024
        print(f'{src_name}: {before:.1f}MB → {out_name}: {after:.0f}KB')


if __name__ == '__main__':
    main()
