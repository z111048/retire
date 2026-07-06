"""把複審後保留的人臉拼成一張愛心形狀的合照，做成靜態圖片放進時間軸。

用法：
    source ~/.venv/bin/activate   # 需要 opencv-python-headless, numpy
    python3 scripts/buildHeartCollage.py

輸入：data/face-selection.json（tools/face-review.html 匯出的保留清單）
輸出：assets/new/7-今天換我們歡送你/<ORDINAL>-<CAPTION>(x<WEIGHT>).jpg
     （直接進 import-assets 正常流程，WEIGHT 讓這張圖分到比一般照片更長的播放時間）
"""
import json
import math
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from faceCrop import crop_face_tile

SELECTION_PATH = 'data/face-selection.json'
PHOTOS_DIR = 'public/photos-orig'
OUT_SECTION_DIR = 'assets/new/7-今天換我們歡送你'
OUT_ORDINAL = 23
OUT_CAPTION = '大家的心，都圍繞著妳'
OUT_WEIGHT = 4  # 這張圖的播放時長 = 該章節一般照片的 4 倍

CANVAS_W, CANVAS_H = 1920, 1080
HEART_CENTER = (960, 570)
HEART_SPAN = (1300, 1140)  # (寬, 高) 涵蓋範圍，實際愛心形狀比這個框略小
TILE_PAD_RATIO = 1.6
BORDER = 3  # 每格白色相框邊寬
BG_TOP = (232, 244, 253)     # BGR，對應畫面頂部顏色（偏亮）
BG_BOTTOM = (216, 232, 248)  # BGR，對應畫面底部顏色（偏暖）


def heart_inside(nx: float, ny: float) -> bool:
    """(nx, ny) 為以愛心中心正規化後的座標。標準隱式愛心公式，True 表示在愛心內部。"""
    x, y = nx, -ny  # 影像座標 y 向下，翻轉讓愛心尖端朝下
    return (x ** 2 + y ** 2 - 1) ** 3 - (x ** 2) * (y ** 3) <= 0


def find_tile_size(target_count: int) -> tuple:
    """搜尋讓愛心內格數最接近 target_count 的 tile 大小，回傳 (tile_size, cell_centers)。"""
    best = None
    for tile in range(14, 60):
        cols = HEART_SPAN[0] // tile
        rows = HEART_SPAN[1] // tile
        centers = []
        for r in range(rows):
            for c in range(cols):
                px = HEART_CENTER[0] - HEART_SPAN[0] / 2 + (c + 0.5) * tile
                py = HEART_CENTER[1] - HEART_SPAN[1] / 2 + (r + 0.5) * tile
                nx = (px - HEART_CENTER[0]) / (HEART_SPAN[0] / 2 * 0.62)
                ny = (py - HEART_CENTER[1]) / (HEART_SPAN[1] / 2 * 0.62)
                if heart_inside(nx, ny):
                    centers.append((px, py))
        if best is None or abs(len(centers) - target_count) < abs(best[1] - target_count):
            best = (tile, len(centers), centers)
        if len(centers) < target_count:
            break  # tile 越大格數越少，找到第一次低於目標就可以停止搜尋
    return best[0], best[2]


def make_background() -> np.ndarray:
    bg = np.zeros((CANVAS_H, CANVAS_W, 3), dtype=np.uint8)
    for y in range(CANVAS_H):
        t = y / CANVAS_H
        color = [BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t for i in range(3)]
        bg[y, :] = color
    return bg


def main():
    selection = json.load(open(SELECTION_PATH, encoding='utf-8'))
    faces = selection['keepFiles']
    print(f'可用人臉：{len(faces)} 張')

    tile_size, centers = find_tile_size(len(faces))
    print(f'愛心格數：{len(centers)}，tile 大小：{tile_size}px')

    # 人臉不夠格數多時允許重複使用（洗牌後循環取用，避免同一張臉排在一起）
    rng = np.random.default_rng(42)
    order = rng.permutation(len(faces))
    pool = [faces[i] for i in order]
    if len(pool) < len(centers):
        reps = math.ceil(len(centers) / len(pool))
        pool = (pool * reps)[:len(centers)]
    pool = pool[:len(centers)]

    # 同張照片內的其他人臉框（供 crop_face_tile 模糊鄰居用）
    by_file = {}
    for f in faces:
        by_file.setdefault(f['file'], []).append(f['box'])

    canvas = make_background()
    img_cache = {}
    inner = int(tile_size - BORDER * 2)
    inner = max(inner, 6)

    placed = 0
    for (px, py), f in zip(centers, pool):
        fname = f['file']
        if fname not in img_cache:
            img_cache[fname] = cv2.imread(f'{PHOTOS_DIR}/{fname}')
        img = img_cache[fname]
        if img is None:
            continue
        others = [b for b in by_file[fname] if b != f['box']]
        tile = crop_face_tile(img, f['box'], others, pad_ratio=TILE_PAD_RATIO, tile_size=inner)

        x0, y0 = int(px - tile_size / 2), int(py - tile_size / 2)
        x1, y1 = x0 + tile_size, y0 + tile_size
        if x0 < 0 or y0 < 0 or x1 > CANVAS_W or y1 > CANVAS_H:
            continue
        # 白色相框邊
        cv2.rectangle(canvas, (x0, y0), (x1, y1), (250, 248, 245), -1)
        ix0, iy0 = x0 + BORDER, y0 + BORDER
        canvas[iy0:iy0 + inner, ix0:ix0 + inner] = tile
        placed += 1

    print(f'實際貼上：{placed} 格')

    os.makedirs(OUT_SECTION_DIR, exist_ok=True)
    out_name = f'{OUT_ORDINAL}-{OUT_CAPTION}(x{OUT_WEIGHT}).jpg'
    out_path = os.path.join(OUT_SECTION_DIR, out_name)
    cv2.imwrite(out_path, canvas, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(f'已輸出：{out_path}')


if __name__ == '__main__':
    main()
