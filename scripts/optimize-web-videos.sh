#!/usr/bin/env bash
# 網頁版影片壓縮：GitHub Pages 部署放不下 render 用的高畫質片段（會直接 deploy failed），
# 改放 720p 壓縮版。public/videos/ 的高畫質版不動，render 不受影響。
set -euo pipefail

mkdir -p docs/videos
for f in public/videos/*.mp4; do
  n=$(basename "$f")
  ffmpeg -y -v error -i "$f" \
    -vf "scale=-2:720" -c:v libx264 -preset medium -crf 27 -pix_fmt yuv420p \
    -c:a aac -b:a 96k -movflags +faststart \
    "docs/videos/$n"
  echo "✓ $n → $(du -h "docs/videos/$n" | cut -f1)"
done
