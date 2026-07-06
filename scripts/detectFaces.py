#!/usr/bin/env python3
"""偵測 public/photos-orig/ 所有人臉，計算品質分數，輸出 data/face-detections.json。

這是「同仁人臉組成秀燕姐肖像」馬賽克拼貼的前置步驟：先把每張照片裡的人臉
框出來並依品質排序，供人工用 tools/face-review.html 逐張確認要保留哪些，
最後才拿保留的臉去跟目標肖像做色調比對拼貼。

依賴（本機另裝，不隨 npm install）：
    pip install opencv-python-headless numpy

用法：
    python3 scripts/detectFaces.py

輸出 data/face-detections.json 是一個依品質分數由高到低排序的陣列，每筆：
    { file, box:[x,y,w,h], score, minside, blur, eye_ratio, quality }
box 座標是原始照片（public/photos-orig/）裡的像素位置。

重要：quality 排序與此腳本的偵測門檻、指標權重綁定。若之後調整這裡的邏輯
重跑，輸出陣列的順序/長度可能改變，會讓沿用舊資料做的人工複審進度失效。
"""
import glob
import json
import os
import urllib.request

import cv2
import numpy as np

PHOTOS_DIR = 'public/photos-orig'
OUT_PATH = 'data/face-detections.json'
MODEL_PATH = 'data/.cache/yunet.onnx'
MODEL_URL = (
    'https://github.com/opencv/opencv_zoo/raw/main/models/'
    'face_detection_yunet/face_detection_yunet_2023mar.onnx'
)

DETECT_SCORE_THRESHOLD = 0.7
CROP_PAD_RATIO = 1.7  # 裁切邊框 = 人臉框最長邊 × 此倍率

# 品質過濾建議門檻（供 tools/face-review.html 預設勾選使用，非強制）
MIN_SCORE = 0.82
MIN_SIDE_PX = 28
MIN_BLUR = 15
EYE_RATIO_RANGE = (0.20, 0.70)


def ensure_model() -> str:
    if not os.path.exists(MODEL_PATH):
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        print(f'下載人臉偵測模型 (YuNet) → {MODEL_PATH}')
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    return MODEL_PATH


def rank01(vals: np.ndarray) -> np.ndarray:
    order = np.argsort(vals)
    ranks = np.empty_like(order, dtype=float)
    ranks[order] = np.linspace(0, 1, len(vals))
    return ranks


DEDUPE_OVERLAP_THRESHOLD = 0.5  # 重疊面積 / 較小框面積，超過視為同一張臉的重複偵測


def _box_overlap_ratio(b1, b2) -> float:
    x1, y1, w1, h1 = b1
    x2, y2, w2, h2 = b2
    ix0, iy0 = max(x1, x2), max(y1, y2)
    ix1, iy1 = min(x1 + w1, x2 + w2), min(y1 + h1, y2 + h2)
    if ix1 <= ix0 or iy1 <= iy0:
        return 0.0
    inter = (ix1 - ix0) * (iy1 - iy0)
    return inter / min(w1 * h1, w2 * h2)


def dedupe(records: list) -> list:
    """同一張照片裡，同一張臉偶爾會被偵測兩次（框大小/位置略有差異）。
    保留品質分數較高的那筆，避免馬賽克把同一個人重複貼成兩個人。"""
    by_file: dict = {}
    for r in records:
        by_file.setdefault(r['file'], []).append(r)

    keep_ids = set(id(r) for r in records)
    for items in by_file.values():
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                a, b = items[i], items[j]
                if id(a) not in keep_ids or id(b) not in keep_ids:
                    continue
                if _box_overlap_ratio(a['box'], b['box']) > DEDUPE_OVERLAP_THRESHOLD:
                    worse = a if a['quality'] < b['quality'] else b
                    keep_ids.discard(id(worse))

    return [r for r in records if id(r) in keep_ids]


def passes_quality_bar(r: dict) -> bool:
    lo, hi = EYE_RATIO_RANGE
    return (
        r['score'] >= MIN_SCORE and r['minside'] >= MIN_SIDE_PX and
        r['blur'] >= MIN_BLUR and lo <= r['eye_ratio'] <= hi
    )


def main():
    detector = cv2.FaceDetectorYN_create(
        ensure_model(), '', (320, 320), score_threshold=DETECT_SCORE_THRESHOLD
    )
    files = sorted(glob.glob(f'{PHOTOS_DIR}/*.jpg'))
    print(f'掃描 {len(files)} 張照片...')

    records = []
    for f in files:
        img = cv2.imread(f)
        if img is None:
            continue
        h, w = img.shape[:2]
        detector.setInputSize((w, h))
        _, faces = detector.detect(img)
        if faces is None:
            continue
        for face in faces:
            x, y, fw, fh = face[:4]
            lms = face[4:14].reshape(5, 2)
            score = float(face[14])

            cx, cy = x + fw / 2, y + fh / 2
            side = max(fw, fh) * CROP_PAD_RATIO
            x0, y0 = int(max(0, cx - side / 2)), int(max(0, cy - side / 2))
            x1, y1 = int(min(w, cx + side / 2)), int(min(h, cy + side / 2))
            crop = img[y0:y1, x0:x1]
            if crop.size == 0:
                continue

            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
            eye_ratio = float(np.linalg.norm(lms[0] - lms[1]) / max(fw, 1))

            records.append({
                'file': os.path.basename(f),
                'box': [float(x), float(y), float(fw), float(fh)],
                'score': score, 'minside': float(min(fw, fh)),
                'blur': blur, 'eye_ratio': eye_ratio,
            })

    print(f'共偵測到 {len(records)} 張人臉')

    score = np.array([r['score'] for r in records])
    minside = np.array([r['minside'] for r in records])
    blur = np.array([r['blur'] for r in records])
    eye_close = -np.abs(np.array([r['eye_ratio'] for r in records]) - 0.46)
    composite = rank01(score) + rank01(minside) + rank01(blur) + rank01(eye_close)
    for i, r in enumerate(records):
        r['quality'] = float(composite[i])

    records = dedupe(records)
    print(f'去除重複偵測後剩 {len(records)} 張')

    records.sort(key=lambda r: -r['quality'])

    kept = sum(1 for r in records if passes_quality_bar(r))
    print(f'依建議門檻，{kept}/{len(records)} 張會預設勾選保留（{kept/len(records)*100:.0f}%）')

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8') as fp:
        json.dump(records, fp, ensure_ascii=False)
    print(f'已寫入 {OUT_PATH}')


if __name__ == '__main__':
    main()
