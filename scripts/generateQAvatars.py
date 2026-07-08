"""把複審後保留的人臉（data/face-selection.json）逐張轉成 Q 版可愛大頭貼，
用本機圖生圖服務（Codex Image API, http://localhost:8800）。

580 張、單張序列處理約 1-3 分鐘，全部跑完抓 14-20 小時，設計成可中斷續跑：
- 已成功產生的張數（assets/generated/qavatars/<idx>.png 存在）會自動略過
- 每張失敗會重試一次，仍失敗就記錄下來繼續下一張，不會讓整批中斷
- 進度與結果寫進 data/qavatar-manifest.json，重跑腳本會從記錄接續

用法：
    source ~/.venv/bin/activate   # 需要 opencv-python-headless, numpy, requests
    python3 scripts/generateQAvatars.py
"""
import json
import os
import sys
import time

import cv2
import requests

sys.path.insert(0, os.path.dirname(__file__))
from faceCrop import crop_face_tile

SELECTION_PATH = 'data/face-selection.json'
PHOTOS_DIR = 'public/photos-orig'
OUT_DIR = 'assets/generated/qavatars'
MANIFEST_PATH = 'data/qavatar-manifest.json'
CROP_CACHE_DIR = 'assets/generated/qavatar-crops'

API_URL = 'http://localhost:8800'
PROMPT = (
    '把這個人物轉換成Q版可愛大頭貼插畫，大頭小身比例，圓潤可愛卡通風格，'
    '保留原本髮型、髮色與五官特徵及表情，暖色系插畫，簡單淡色背景，'
    '正面半身或大頭照構圖，無文字無浮水印無logo'
)
TILE_SIZE = 512
CROP_PAD_RATIO = 2.0
MAX_RETRIES = 2
RETRY_DELAY_S = 5


def load_manifest() -> dict:
    if os.path.exists(MANIFEST_PATH):
        return json.load(open(MANIFEST_PATH, encoding='utf-8'))
    return {}


def save_manifest(manifest: dict):
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as fp:
        json.dump(manifest, fp, ensure_ascii=False, indent=2)


def check_health():
    r = requests.get(f'{API_URL}/health', timeout=10)
    r.raise_for_status()
    data = r.json()
    if not data.get('authenticated'):
        raise RuntimeError(f'圖生圖服務未登入：{data}')
    print(f'服務狀態 OK：{data}')


def ensure_crop(idx: int, face: dict, img_cache: dict, by_file: dict) -> str:
    crop_path = os.path.join(CROP_CACHE_DIR, f'{idx:04d}.jpg')
    if os.path.exists(crop_path):
        return crop_path
    fname = face['file']
    if fname not in img_cache:
        img_cache[fname] = cv2.imread(f'{PHOTOS_DIR}/{fname}')
    img = img_cache[fname]
    others = [b for b in by_file[fname] if b != face['box']]
    tile = crop_face_tile(img, face['box'], others, pad_ratio=CROP_PAD_RATIO, tile_size=TILE_SIZE)
    os.makedirs(CROP_CACHE_DIR, exist_ok=True)
    cv2.imwrite(crop_path, tile, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return crop_path


def generate_one(crop_path: str) -> bytes:
    with open(crop_path, 'rb') as f:
        files = {'images': f}
        data = {'prompt': PROMPT, 'width': str(TILE_SIZE), 'height': str(TILE_SIZE)}
        r = requests.post(f'{API_URL}/generate', data=data, files=files, timeout=360)
    if r.status_code != 200:
        raise RuntimeError(f'HTTP {r.status_code}: {r.text[:200]}')
    return r.content


def main():
    check_health()
    os.makedirs(OUT_DIR, exist_ok=True)

    selection = json.load(open(SELECTION_PATH, encoding='utf-8'))
    faces = selection['keepFiles']
    print(f'共 {len(faces)} 張人臉待處理')

    by_file: dict = {}
    for f in faces:
        by_file.setdefault(f['file'], []).append(f['box'])

    manifest = load_manifest()
    img_cache: dict = {}

    done = sum(1 for v in manifest.values() if v.get('status') == 'ok')
    failed_permanently = [k for k, v in manifest.items() if v.get('status') == 'failed']
    print(f'已完成：{done}，先前永久失敗：{len(failed_permanently)}')

    t_start = time.time()
    for idx, face in enumerate(faces):
        key = str(idx)
        out_path = os.path.join(OUT_DIR, f'{idx:04d}.png')

        if manifest.get(key, {}).get('status') == 'ok' and os.path.exists(out_path):
            continue  # 已成功，略過

        crop_path = ensure_crop(idx, face, img_cache, by_file)

        ok = False
        last_err = None
        for attempt in range(1, MAX_RETRIES + 2):
            try:
                content = generate_one(crop_path)
                with open(out_path, 'wb') as fp:
                    fp.write(content)
                ok = True
                break
            except Exception as e:  # noqa: BLE001 — 批次任務，任何失敗都要記錄後繼續，不能整批中斷
                last_err = str(e)
                print(f'  [{idx+1}/{len(faces)}] 第 {attempt} 次嘗試失敗：{last_err}')
                if attempt <= MAX_RETRIES:
                    time.sleep(RETRY_DELAY_S)

        manifest[key] = {
            'file': face['file'],
            'status': 'ok' if ok else 'failed',
            'error': None if ok else last_err,
        }
        save_manifest(manifest)  # 每張都存檔，中斷也不會丟進度

        elapsed = time.time() - t_start
        print(f'[{idx+1}/{len(faces)}] {"✓" if ok else "✗"} {face["file"]}　'
              f'本次執行累計耗時 {elapsed/60:.1f} 分')

    ok_count = sum(1 for v in manifest.values() if v['status'] == 'ok')
    fail_count = sum(1 for v in manifest.values() if v['status'] == 'failed')
    print(f'\n完成！成功 {ok_count}，失敗 {fail_count}（共 {len(faces)} 張）')
    if fail_count:
        print('失敗清單：', [k for k, v in manifest.items() if v['status'] == 'failed'])


if __name__ == '__main__':
    main()
