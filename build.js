/**
 * Babel 预编译 — 提取 HTML 中的 <script type="text/babel"> 并编译为普通 JS
 * 用法: node build.js
 */
const fs = require('fs');
const babel = require('@babel/core');

const checkOnly = process.argv.includes('--check');

const files = ['index.html', '猫咪消消乐.html'];

let hasError = false;

for (const file of files) {
  const label = checkOnly ? '🔍 校验' : '🔧 编译';
  console.log(`${label} ${file}...`);
  if (!fs.existsSync(file)) {
    console.log(`  ⚠️ ${file} 不存在，跳过`);
    continue;
  }
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
      console.log(`  ✅ 第 ${count} 个脚本块${checkOnly ? '' : '编译'}成功 (${code.length} → ${result.code.length} 字符)`);
      if (checkOnly) return fullMatch; // --check 模式不修改文件
      return `<script type="text/javascript">${result.code}</script>`;
    } catch (err) {
      console.error(`  ❌ 编译失败: ${err.message}`);
      hasError = true;
      return fullMatch;
    }
  });

  if (!checkOnly) {
    html = html.replace(
      /<!-- 性能优化：预连接 CDN[\s\S]*?<link rel="dns-prefetch" href="https:\/\/unpkg\.com">/,
      '$&'
    );
    fs.writeFileSync(file, html, 'utf-8');
  }
  console.log(`  ✅ ${file} ${checkOnly ? '校验' : '完成'} (${count} 个脚本块)`);
}

if (hasError) {
  console.error('\n❌ 编译校验失败！请修复 Babel 编译错误后再提交。');
  process.exit(1);
}
if (checkOnly) {
  console.log('\n✅ 编译校验通过！');
} else {
  console.log('\n🎉 预编译完成！所有 <script type="text/babel"> 已转为普通 JS。');
}
