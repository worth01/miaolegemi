#!/bin/bash
# 批量压缩 cat/ 下的图片：2048x2048 → 120x120 JPEG，再生成 .b64
# 依赖：macOS 自带的 sips + base64 + bc，无需安装任何第三方工具

set -e
cd "$(dirname "$0")"

QUALITY=70        # JPEG 质量 (1-100)
SIZE=120           # 目标尺寸 120x120
OUTDIR="optimized"
mkdir -p "$OUTDIR"

human_size() {
  local bytes=$1
  if [ "$bytes" -ge 1048576 ]; then
    echo "$(echo "scale=1; $bytes / 1048576" | bc)MB"
  elif [ "$bytes" -ge 1024 ]; then
    echo "$(echo "scale=0; $bytes / 1024" | bc)KB"
  else
    echo "${bytes}B"
  fi
}

total=0

for src in *.png; do
  [ -f "$src" ] || continue
  name="${src%.png}"
  dst_jpg="$OUTDIR/${name}.jpg"
  dst_b64="$OUTDIR/${name}.b64"

  total=$((total + 1))

  # 1. 用 sips 转换为 JPEG 并缩放到 120x120
  sips -s format jpeg -s formatOptions "$QUALITY" \
       -z "$SIZE" "$SIZE" \
       "$src" --out "$dst_jpg" > /dev/null 2>&1

  # 2. 生成 base64（单行，无换行符）
  base64 -i "$dst_jpg" | tr -d '\n' > "$dst_b64"

  orig_size=$(wc -c < "$src" | tr -d ' ')
  new_size=$(wc -c < "$dst_b64" | tr -d ' ')
  ratio=$(echo "scale=1; (1 - $new_size / $orig_size) * 100" | bc)

  echo "  ✓ ${name}: $(human_size "$orig_size") → $(human_size "$new_size") (节省 ${ratio}%)"
done

echo ""
echo "完成：共处理 ${total} 张图片"
echo "输出目录：cat/$OUTDIR/"
echo ""
echo "确认无误后，覆盖到 cat/ 目录："
echo "  cp cat/optimized/*.b64 cat/"
