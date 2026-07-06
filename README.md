# 退休紀念影片

使用 Remotion 製作的榮退紀念影片（秀燕姐版）。

## 素材規則

素材整理成 zip（如 `秀燕姐.zip`），解壓到 `assets/new/`：

- **資料夾名稱**：`{章節序號}-{章節標題}`，即影片的段落
- **照片檔名**：`{流水號}-{播放時顯示的字幕}.jpg`
- **影片檔名**：`{流水號}-{字幕}(剪輯HHMMSS至HHMMSS[及HHMMSS至HHMMSS...]).mov|mp4`
- **封面**：`0-影片封面-*.png`
- **背景音樂**：複製到 `public/bgm.mp3`（影片總長自動貼齊歌曲長度）

## 快速開始

```bash
# 1. 安裝套件
npm install

# 2. 解壓素材
unzip 秀燕姐.zip -d assets/new/

# 3. 放入背景音樂
cp 歌曲.mp3 public/bgm.mp3

# 4. 匯入素材（重新命名、壓縮、剪影片、產生時間軸）
npm run import-assets

# 5. 歌詞對時（瀏覽器開 http://localhost:5173/retire/tools/lyric-timer.html）
npm run player:dev
# 對完把匯出的 JSON 存成 data/lyrics-timing.json

# 6. 驗證資料
npm run check-data

# 7. 預覽影片（開啟瀏覽器 localhost:3000）
npm run dev

# 8. 輸出影片
npm run render
```

## 專案結構

```
retire/
├── assets/new/       解壓後的原始素材（資料夾＝章節）
├── archive/          舊素材封存
├── public/
│   ├── photos-orig/  全解析度照片（render 用）
│   ├── photos/       壓縮照片（網頁播放器用）＋ cover.jpg
│   ├── videos/       依檔名剪輯資訊切出的影片片段
│   └── bgm.mp3       背景音樂
├── data/
│   ├── timeline.json         影片時間軸（import-assets 產生，可人工修正）
│   ├── copywriting.json      文案：開場、章節標題副標、結尾
│   ├── lyrics-timing.json    歌詞時間軸（用 tools/lyric-timer.html 製作）
│   ├── face-detections.json  人臉偵測結果＋品質分數（scripts/detectFaces.py 產生）
│   └── filename-map.json     新檔名 → 原始檔名對照表
├── tools/lyric-timer.html    歌詞對時工具
├── src/              Remotion 元件
└── scripts/          匯入與驗證腳本（legacy/ 是舊 Gemini 流程）
```

## 人工調整

### 修改文案
編輯 `data/copywriting.json`：章節副標（subtitle）、開場、結尾祝福語。
改完重跑 `npm run import-assets` 讓 timeline 帶入新標題。

### 調整照片順序、字幕、時長
直接編輯 `data/timeline.json`（`durationFrames` 以 30fps 計）。
注意：重跑 `import-assets` 會覆蓋手動修改。

### 歌詞對時
`npm run player:dev` 後開 `http://localhost:5173/retire/tools/lyric-timer.html`，
邊聽邊按空白鍵標記，匯出後存成 `data/lyrics-timing.json`。

## 字體

影片使用兩款開源字體（SIL OFL 授權）：

- **辰宇落雁體**（手寫感）— 開場標題、章節標題、結尾
- **霞鶩文楷 TC**（楷書）— 照片字幕、歌詞、副標題

完整字型檔在 `assets/fonts/`（不入版控），`public/fonts/` 只放子集化後的小檔。
**文案、字幕或歌詞改字後**，重跑子集化以免缺字 fallback 成黑體：

```bash
python3 scripts/subset-fonts.py
```

## 人臉馬賽克拼貼（籌備中）

目標：把所有同仁的人臉從照片中抓出來，拼成一張秀燕姐肖像的馬賽克。目前進度：

```bash
pip install opencv-python-headless numpy   # 本機另裝，不隨 npm install
python3 scripts/detectFaces.py             # 掃描 public/photos-orig/，輸出 data/face-detections.json
```

`detectFaces.py` 用 OpenCV YuNet 偵測人臉，並依「偵測信心值＋尺寸＋清晰度＋五官比例」算出綜合品質分數，
由高到低排序寫入 `data/face-detections.json`（841 張人臉，100 張照片全掃過一輪的結果）。

品質分數是給人工複審用的**建議值**，不是自動刪除的門檻——實際保留哪些臉是用一個獨立的
HTML 複審工具逐張確認（大圖＋保留/排除按鈕＋鍵盤快捷鍵，一次看一張），確認結果目前還在人工過一遍中，
尚未定案要保留的清單、也還沒實作最後的馬賽克拼貼演算法。

下一步（確認保留清單後）：選一張秀燕姐的目標肖像照，用色調比對演算法把保留的人臉排列組合成她的肖像。

## WSL2 注意事項

- 輸出影片位置：`out/retirement.mp4`
- Windows 存取路徑：`\\wsl$\Ubuntu\home\james\projects\retire\out\retirement.mp4`
- Remotion Studio：Windows 瀏覽器開啟 `localhost:3000`
