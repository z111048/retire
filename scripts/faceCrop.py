"""共用的人臉裁切工具。

裁切某張人臉時，若同一張照片裡「其他人的臉框」剛好落在裁切範圍內（合照人臉密集時常見），
會把那些區域模糊處理，讓裁出來的小圖只有目標人臉清楚，避免看起來像裁到別人。
"""
import cv2


def crop_face_tile(img, target_box, other_boxes, pad_ratio=1.7, tile_size=None, blur_ksize_ratio=0.6):
    """裁切 target_box 為中心、pad_ratio 倍邊長的正方形，模糊掉範圍內與 other_boxes 重疊的區域。

    img: BGR 影像 (cv2.imread 結果)
    target_box: [x, y, w, h] 目標人臉框（原圖座標）
    other_boxes: 同張照片內「其他」人臉框列表（不含 target_box 自己）
    tile_size: 若指定，裁切後會 resize 成正方形 tile_size x tile_size
    """
    h, w = img.shape[:2]
    x, y, fw, fh = target_box
    cx, cy = x + fw / 2, y + fh / 2
    side = max(fw, fh) * pad_ratio
    x0, y0 = int(max(0, cx - side / 2)), int(max(0, cy - side / 2))
    x1, y1 = int(min(w, cx + side / 2)), int(min(h, cy + side / 2))
    crop = img[y0:y1, x0:x1].copy()

    for ox, oy, ofw, ofh in other_boxes:
        ix0, iy0 = max(x0, int(ox)), max(y0, int(oy))
        ix1, iy1 = min(x1, int(ox + ofw)), min(y1, int(oy + ofh))
        if ix1 <= ix0 or iy1 <= iy0:
            continue  # 沒有重疊
        lx0, ly0, lx1, ly1 = ix0 - x0, iy0 - y0, ix1 - x0, iy1 - y0
        region = crop[ly0:ly1, lx0:lx1]
        if region.size == 0:
            continue
        k = max(5, int(min(region.shape[:2]) * blur_ksize_ratio) | 1)  # 確保奇數核
        crop[ly0:ly1, lx0:lx1] = cv2.GaussianBlur(region, (k, k), 0)

    if tile_size:
        crop = cv2.resize(crop, (tile_size, tile_size), interpolation=cv2.INTER_AREA)
    return crop
