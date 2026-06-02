/**
 * fix-tdz.js — 修复预编译后 const TDZ 问题
 * 策略：收集 Game() 中所有 useState/useRef 声明，全部移到组件顶部的集中声明区
 */
const fs = require('fs');

let html = fs.readFileSync('猫咪消消乐.html', 'utf-8');
const lines = html.split('\n');

// 找 Game 函数起始行
let gameStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function Game()')) {
    gameStart = i;
    break;
  }
}
console.log(`Game starts at line ${gameStart + 1}`);

// 收集 gameStart 到 ~line 11500 之间所有 useState 和 useRef 声明
const states = [];  // { line: number, name: string, text: string }
const refs = [];

for (let i = gameStart; i < Math.min(gameStart + 7000, lines.length); i++) {
  const line = lines[i];
  const m1 = line.match(/^\s*const\s+\[(\w+)/);
  if (m1 && line.includes('useState')) {
    states.push({ line: i, name: m1[1], text: line });
  }
  const m2 = line.match(/^\s*const\s+(\w+)\s*=\s*useRef/);
  if (m2) {
    refs.push({ line: i, name: m2[1], text: line });
  }
}

console.log(`Found ${states.length} useState, ${refs.length} useRef in Game`);

// 找已有的声明区（第一段密集的 state 声明结束位置）
// 这个区域在 7240-7250 之间
let insertAfter = -1;
for (let i = 7230; i < 7260; i++) {
  if (lines[i] && lines[i].includes('const [moveHistory')) {
    insertAfter = i;
    break;
  }
}
console.log(`Insert after line ${insertAfter + 1}: ${lines[insertAfter]}`);

// 需要移动的声明：line > insertAfter 的
const toMove = states.filter(s => s.line > insertAfter).concat(
  refs.filter(r => r.line > insertAfter)
);
toMove.sort((a, b) => a.line - b.line);

console.log(`Moving ${toMove.length} declarations`);

// 也要移动前面的 loadCatsFromStorage 及 initialCats（battleCats 依赖它们）
for (let i = 7490; i < 7530; i++) {
  if (lines[i] && (lines[i].includes('同步加载猫咪数据') || lines[i].includes('const loadCatsFromStorage') || lines[i].includes('const initialCats = loadCatsFromStorage'))) {
    toMove.push({ line: i, name: 'loadCats', text: lines[i], isHelper: true });
  }
}
toMove.sort((a, b) => a.line - b.line);

// Remove (reverse order)
const removed = [];
for (const item of toMove.reverse()) {
  removed.push(lines.splice(item.line, 1)[0]);
}
removed.reverse();

// Insert after insertAfter (adjusted for removals since insertAfter < all removed lines)
// Since we removed lines AFTER insertAfter, the insert point doesn't change
for (const line of removed) {
  insertAfter++;
  lines.splice(insertAfter, 0, line);
}

// Write back
fs.writeFileSync('猫咪消消乐.html', lines.join('\n'), 'utf-8');

// Verify
const final = fs.readFileSync('猫咪消消乐.html', 'utf-8').split('\n');
const checks = ['piles', 'slotBonus', 'currentLevel', 'battleCats', 'timerPaused', 'retryAttemptsUsed'];
for (const name of checks) {
  for (let i = 0; i < final.length; i++) {
    if (final[i].includes(`const [${name},`) || final[i].includes(`const [${name} `)) {
      console.log(`${name} @ ${i + 1}`);
      break;
    }
  }
}
// Check useEffect that uses battleCats
for (let i = 0; i < final.length; i++) {
  if (final[i].includes('}, [gameState, tiles, battleCats, timerPaused]')) {
    console.log(`battleCats useEffect @ ${i + 1}`);
    break;
  }
}
console.log('Done');
