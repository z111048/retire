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
│   ├── photos/       壓縮照片（網頁播放器用）＋ cover-wide.jpg（開場底圖，見下方）
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

### 製作團隊名單（片尾工作人員名單）
編輯 `data/copywriting.json` 的 `credits`（`title` + `lines: [{role, names}]`），
接在結尾祝福語之後播放，長度由 `src/constants.ts` 的 `CREDITS_DURATION_S` 控制。
這段時長是額外加在歌曲總長之外的（此時歌曲通常已播畢），不會影響照片配平。

## 字體

影片使用兩款開源字體（SIL OFL 授權）：

- **辰宇落雁體**（手寫感）— 開場標題、章節標題、結尾
- **霞鶩文楷 TC**（楷書）— 照片字幕、歌詞、副標題

完整字型檔在 `assets/fonts/`（不入版控），`public/fonts/` 只放子集化後的小檔。
**文案、字幕或歌詞改字後**，重跑子集化以免缺字 fallback 成黑體：

```bash
python3 scripts/subset-fonts.py
```

## 人臉愛心拼貼與 Q 版大頭貼

「今天換我們歡送你」章節結尾是一場動態愛心拼貼動畫（`HeartCollageScene`）：
全體同仁的 **Q 版大頭貼**從四面八方飛入定位組成愛心。片尾 Credits 之後（5:00~5:20）
還有一段彩蛋 `FinaleAvatarWallScene`：580 張 Q 版大頭貼像電影片尾名單一樣捲動。

### 1. 偵測＋複審人臉

```bash
pip install opencv-python-headless numpy requests   # 本機另裝，不隨 npm install
python3 scripts/detectFaces.py             # 掃描 public/photos-orig/，輸出 data/face-detections.json
```

`detectFaces.py` 用 OpenCV YuNet 偵測人臉，依「偵測信心值＋尺寸＋清晰度＋五官比例」算出綜合品質分數
由高到低排序，並自動去除重複偵測（同一張臉偶爾會被判斷成兩筆，取品質分數較高者）。
品質分數是給人工複審用的**建議值**，不是自動刪除門檻——實際保留哪些臉是人工用一個逐張確認的
網頁工具過一遍（大圖＋保留/排除按鈕＋鍵盤快捷鍵），結果存成 `data/face-selection.json`
（格式：`{ keepFiles: [{file, box}] }`）。

`tools/face-selection-review.html` 可視覺化檢查框選結果（含裁切範圍與會被模糊的重疊區域），
也會列出每張已選臉「候選裁切 → Q版成品」的對照縮圖：

```bash
python3 -m http.server 8790   # 從專案根目錄啟動，開 tools/face-selection-review.html
```

裁切人臉小圖時用 `scripts/faceCrop.py` 的 `crop_face_tile()`：合照人臉密集時，裁切範圍常會帶到
旁邊其他人的臉，這個函式會把範圍內「非目標本人」的其他人臉框自動模糊。

### 2. 轉成 Q 版大頭貼

```bash
pip install requests
python3 scripts/generateQAvatars.py   # 逐張呼叫本機圖生圖服務，可中斷續跑，見腳本內註解
```

580 張全跑約需 14-20 小時（服務單張序列處理，每張 1-3 分鐘）。結果存進
`assets/generated/qavatars/`，`data/qavatar-manifest.json` 記錄每張的成功/失敗狀態方便續跑。
`public/qavatars/` 是縮小到 140x140 給 Remotion 動畫場景用的版本（見下方 `resize` 步驟，
`generateQAvatars.py` 完成後需自行縮圖複製一份到這裡，或直接用 `cv2.resize` 批次處理）。

### 3. 動態場景

`src/utils/heartLayout.ts` 是愛心排列演算法（隱式愛心公式），`HeartCollageScene.tsx` 用它
算出每張大頭貼的目標位置，配合決定性偽隨機（Remotion 禁止 `Math.random()`）算出各自的
飛入起始位置與延遲，做出從四面八方聚攏成愛心的動畫。`FinaleAvatarWallScene.tsx` 則是
把全部大頭貼排成網格、整體向上捲動的片尾彩蛋。

兩者的時長與位置都是絕對時間點常數（`src/constants.ts` 的 `FINALE_START_S` 等），
疊在既有內容之上，不影響歌曲同步的照片配平。

## WSL2 注意事項

- 輸出影片位置：`out/retirement.mp4`
- Windows 存取路徑：`\\wsl$\Ubuntu\home\james\projects\retire\out\retirement.mp4`
- Remotion Studio：Windows 瀏覽器開啟 `localhost:3000`
