# 退休紀念影片

使用 Remotion + Gemini API 製作的榮退紀念影片。

## 快速開始

```bash
# 1. 安裝套件
npm install

# 2. 分析照片（約 3-5 分鐘，147 張照片 × 0.9s）
npm run analyze-photos

# 3. 編輯文案（填入姓名與單位）
# 修改 data/copywriting.json，把 ○○ 換成實際內容

# 4. 產生時間軸
npm run build-timeline

# 5. 驗證資料
npm run check-data

# 6. 預覽影片（開啟瀏覽器 localhost:3000）
npm run dev

# 7. 輸出影片
npm run render
```

## 專案結構

```
retire/
├── images/           原始照片（不要動）
├── public/photos/    重新命名後的照片（由 analyze-photos 自動產生）
├── data/
│   ├── photo-metadata.json   Gemini 分析結果（可人工修正）
│   ├── timeline.json         影片時間軸（可人工修正）
│   ├── copywriting.json      所有文案（必須填入姓名）
│   └── filename-map.json     原始檔名對照表
├── src/              Remotion 元件
└── scripts/          分析與建置腳本
```

## 人工調整

### 修改文案
編輯 `data/copywriting.json`：
- `intro.subtitle`：填入機關名稱與姓名
- `outro`：結尾祝福語

### 調整照片順序與字幕
編輯 `data/timeline.json`，直接修改各段落的 `photos` 陣列。

### 標記不想要的照片
在 `data/photo-metadata.json` 找到對應的照片，把 `suggestedUse` 改為 `"skip"`，然後重跑 `npm run build-timeline`。

### 增加照片說明
在 `data/timeline.json` 中找到照片，修改 `caption` 欄位。

## 環境設定

```bash
cp .env.example .env
# 編輯 .env，填入你的 Gemini API Key
```

## WSL2 注意事項

- 輸出影片位置：`out/retirement.mp4`
- Windows 存取路徑：`\\wsl$\Ubuntu\home\james\projects\retire\out\retirement.mp4`
- Remotion Studio：Windows 瀏覽器開啟 `localhost:3000`

## 搭配 Codex CLI

```bash
# 檢查 TypeScript 型別
# 「請檢查 scripts/analyzePhotos.ts 是否有非同步錯誤處理問題」

# 重構元件
# 「請重構 Remotion 元件，讓轉場動畫更容易維護」

# 驗證資料 schema
# 「請檢查 data/timeline.json 的 schema 是否合理」

# 排查 render 問題
# 「請幫我找出可能造成 remotion render 失敗的地方」
```
