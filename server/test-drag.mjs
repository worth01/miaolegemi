import { chromium } from 'playwright';

const APP_URL = 'http://localhost:3001/app.html';

function solveCaptcha(text) {
  const m = text.match(/(\d+)\s*([+×])\s*(\d+)/);
  if (!m) return null;
  return m[2] === '+' ? +m[1] + +m[3] : +m[1] * +m[3];
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  try {
    // ═══════════════════════════════════════
    // 1. open app & login
    // ═══════════════════════════════════════
    console.log('1. Opening app & logging in...');
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // privacy
    const agree = page.locator('button:has-text("同意并进入")');
    if (await agree.isVisible({ timeout: 2000 }).catch(() => false)) {
      await agree.click(); await page.waitForTimeout(500);
    }

    // fill login
    const inputs = page.locator('input');
    await inputs.nth(0).fill('testcat');
    await inputs.nth(1).fill('test123');

    // captcha
    const capText = await page.evaluate(() => {
      const m = document.body.innerText.match(/(\d+\s*[+×]\s*\d+\s*=\s*\?)/);
      return m ? m[1] : null;
    });
    if (capText) {
      const ans = solveCaptcha(capText);
      if (ans !== null) await inputs.nth(2).fill(String(ans));
      console.log(`   captcha: ${capText} = ${ans}`);
    }

    // click login
    const btns = page.locator('button');
    const btnN = await btns.count();
    for (let i = 0; i < btnN; i++) {
      const t = await btns.nth(i).textContent();
      if (t && t.includes('登录') && !t.includes('注册')) { await btns.nth(i).click(); break; }
    }
    console.log('   waiting for app to load...');
    await page.waitForTimeout(5000);

    // ═══════════════════════════════════════
    // 2. navigate to 备战区
    // ═══════════════════════════════════════
    console.log('2. Navigating to 备战区...');

    // click 🐱 家园 bottom tab
    await page.evaluate(() => {
      const divs = document.querySelectorAll('div');
      for (const d of divs) {
        const s = d.getAttribute('style') || '';
        if (s.includes('position') && s.includes('bottom') && s.includes('absolute')) {
          for (const c of d.children) {
            if (c.textContent.includes('🐱')) { c.click(); return; }
          }
        }
      }
    });
    await page.waitForTimeout(1000);

    // click ⚔️ 备战区 sub-tab
    await page.evaluate(() => {
      const divs = document.querySelectorAll('div');
      for (const d of divs) {
        const s = d.getAttribute('style') || '';
        if (d.textContent.trim().includes('备战区') && s.includes('cursor') && s.includes('flex')) {
          d.click(); return;
        }
      }
    });
    await page.waitForTimeout(1500);

    // ═══════════════════════════════════════
    // 3. ensure at least one cat is available
    // ═══════════════════════════════════════
    let availableCards = await page.evaluate(() =>
      document.querySelectorAll('.cat-card-p9').length
    );
    console.log(`3. Available cat cards: ${availableCards}`);

    if (availableCards === 0) {
      console.log('   No available cats, clicking a slotted cat to withdraw...');
      // click the first slotted cat in battle zone to withdraw it
      await page.evaluate(() => {
        const sc = document.querySelector('.slotted-cat');
        if (sc) sc.click();
      });
      await page.waitForTimeout(1500);
      availableCards = await page.evaluate(() =>
        document.querySelectorAll('.cat-card-p9').length
      );
      console.log(`   After withdraw: ${availableCards} cards`);
    }

    if (availableCards === 0) {
      console.log('❌ BLOCKED - still no available cats to drag');
      await browser.close();
      return;
    }

    // ═══════════════════════════════════════
    // 4. perform drag via Playwright mouse
    // ═══════════════════════════════════════
    console.log('4. Performing drag...');

    // Get card position
    const cardBox = await page.evaluate(() => {
      const card = document.querySelector('.cat-card-p9');
      if (!card) return null;
      const r = card.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    console.log(`   Card box: ${JSON.stringify(cardBox)}`);

    if (!cardBox) { console.log('❌ Card disappeared'); await browser.close(); return; }

    const sx = cardBox.x + cardBox.w / 2;
    const sy = cardBox.y + cardBox.h / 2;

    // Check battle slot state before drag
    const beforeSlots = await page.evaluate(() => {
      const slots = document.querySelectorAll('.slot.active-slot');
      return Array.from(slots).map(s => {
        const label = s.querySelector('.slot-label')?.textContent || '';
        const filled = s.querySelector('.slotted-cat');
        return label + ':' + (filled ? 'filled' : 'empty');
      });
    });
    console.log(`   Battle slots before: ${beforeSlots.join(', ')}`);

    // Do the drag: mousedown → move up → mouseup
    await page.mouse.move(sx, sy);
    await page.waitForTimeout(100);
    await page.mouse.down();
    await page.waitForTimeout(300); // let React register move/up listeners

    // Move up in 20 steps (total 160px upward)
    for (let step = 1; step <= 20; step++) {
      await page.mouse.move(sx, sy - step * 8);
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(1500);

    // ═══════════════════════════════════════
    // 5. check result
    // ═══════════════════════════════════════
    const afterSlots = await page.evaluate(() => {
      const slots = document.querySelectorAll('.slot.active-slot');
      return Array.from(slots).map(s => {
        const label = s.querySelector('.slot-label')?.textContent || '';
        const cat = s.querySelector('.slotted-cat');
        const name = cat ? cat.textContent.trim().replace(/\n.*/, '').substring(0, 10) : 'empty';
        return `${label}:${name}`;
      });
    });
    console.log(`   Battle slots after: ${afterSlots.join(', ')}`);
    console.log(`   JS errors: ${errors.length}`);
    errors.forEach(e => console.log(`     - ${e}`));

    // ═══════════════════════════════════════
    // 6. verdict
    // ═══════════════════════════════════════
    const changed = beforeSlots.join() !== afterSlots.join();
    const slot1Filled = afterSlots.some(s => s.includes('🎯 1') && !s.includes('empty'));
    const anyFilled = afterSlots.filter(s => !s.includes('empty')).length;

    console.log('\n========== VERDICT ==========');
    if (slot1Filled) {
      console.log('✅ PASS - Cat successfully deployed to battle slot 1 via drag!');
    } else if (changed) {
      console.log('⚠️  PARTIAL - Slots changed but slot 1 not filled');
    } else {
      console.log('❌ FAIL - Drag did not deploy the cat');
      console.log('   (may be Playwright/React event incompatibility)');
    }
    console.log('=============================');

  } catch (err) {
    console.error('FATAL:', err.message);
  } finally {
    await browser.close();
  }
}

main();
