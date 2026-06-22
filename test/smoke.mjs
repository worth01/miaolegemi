/**
 * Headless 浏览器冒烟测试
 * 验证页面能否正常加载，JS 是否有语法/运行时错误
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://mwlxx.qzz.io';

async function testPage(path, label) {
  const url = BASE_URL + path;
  console.log(`🔍 测试 ${label}: ${url}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 尺寸
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => {
    console.error(`  ❌ ${err.message}`);
    errors.push(err.message);
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // 等 React 渲染完成
    await page.waitForTimeout(3000);

    if (errors.length > 0) {
      console.error(`  ❌ ${label} 有 ${errors.length} 个 JS 错误`);
      await browser.close();
      return false;
    }
    console.log(`  ✅ ${label} 通过`);
    await browser.close();
    return true;
  } catch (e) {
    console.error(`  ❌ ${label} 加载失败: ${e.message}`);
    await browser.close();
    return false;
  }
}

async function main() {
  console.log('🚀 Headless 浏览器冒烟测试\n');

  let failed = false;

  // 测试首页
  if (!(await testPage('/', '首页'))) failed = true;

  // 测试游戏页
  if (!(await testPage('/猫咪消消乐.html', '游戏页'))) failed = true;

  console.log(failed ? '\n❌ 冒烟测试失败！' : '\n✅ 冒烟测试全部通过！');
  process.exit(failed ? 1 : 0);
}

main();
