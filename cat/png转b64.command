#!/bin/bash
cd "$(dirname "$0")"

echo "====================================="
echo "  PNG → B64 一键转换工具"
echo "====================================="

# 遍历当前文件夹所有 .png 文件
for file in *.png; do
    if [ -f "$file" ]; then
        echo "正在处理: $file"
        base64 -i "$file" -o "${file%.png}.b64"
        if [ $? -eq 0 ]; then
            echo "✅ 转换完成: ${file%.png}.b64"
        else
            echo "❌ 转换失败: $file"
        fi
    fi
done

echo "====================================="
echo "所有 PNG 已转换为 B64，覆盖旧文件。"
echo "====================================="
read -p "按回车退出..."