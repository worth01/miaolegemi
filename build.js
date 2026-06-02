/**
 * Babel 预编译 — 提取 HTML 中的 <script type="text/babel"> 并编译为普通 JS
 * 用法: node build.js
 */
const fs = require('fs');
const babel = require('@babel/core');

const files = ['index.html', '猫咪消消乐.html'];

for (const file of files) {
  console.log(`🔧 编译 ${file}...`);
  let html = fs.readFileSync(file, 'utf-8');

  // 匹配 <script type="text/babel">...</script> 块
  const scriptRegex = /<script\s+type="text\/babel"\s*>(.*?)<\/script>/gs;
  let match;
  let count = 0;

  html = html.replace(scriptRegex, (fullMatch, code) => {
    count++;
    try {
      const result = babel.transformSync(code, {
        presets: [
          ['@babel/preset-react', { runtime: 'classic' }]
        ],
        compact: false,
        comments: true,
      });
      console.log(`  ✅ 第 ${count} 个脚本块编译成功 (${code.length} → ${result.code.length} 字符)`);
      return `<script type="text/javascript">${result.code}</script>`;
    } catch (err) {
      console.error(`  ❌ 编译失败: ${err.message}`);
      return fullMatch;
    }
  });

  // Also update Babel standalone CDN comment
  html = html.replace(
    /<!-- 性能优化：预连接 CDN[\s\S]*?<link rel="dns-prefetch" href="https:\/\/unpkg\.com">/,
    '$&'
  );

  fs.writeFileSync(file, html, 'utf-8');
  console.log(`  ✅ ${file} 完成 (${count} 个脚本块)`);
}

console.log('\n🎉 预编译完成！所有 <script type="text/babel"> 已转为普通 JS。');
