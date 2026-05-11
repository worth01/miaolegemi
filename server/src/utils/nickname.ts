// P5: 猫咪名称生成器
const catAdjectives = [
  '毛茸茸', '软乎乎', '圆滚滚', '胖乎乎', '小可爱',
  '奶茶', '布丁', '棉花糖', '小雪球', '小糖豆',
  '棉花', '奶酪', '年糕', '汤圆', '团子',
  '小橘', '煤球', '小白', '蓝胖子', '小虎'
];

const catNouns = [
  '喵', '咪', '喵咪', '猫猫', '猫咪',
  '主子', '陛下', '大王', '少爷', '公主',
  '团子', '球球', '崽崽', '宝贝', '乖乖'
];

export function generateCatNickname(): string {
  const adj = catAdjectives[Math.floor(Math.random() * catAdjectives.length)];
  const noun = catNouns[Math.floor(Math.random() * catNouns.length)];
  return `${adj}${noun}`;
}

// 猫名列表（用于随机生成用户名）
const catNames = [
  '橘座', '煤球', '布丁', '团子', '年糕', '奶茶', '豆豆', '毛球',
  '雪球', '棉花', '奶酪', '奥利奥', '小虎', '花花', '点点', '球球',
  '喵喵', '咪咪', '小橘', '大白', '黑黑', '小白', '灰灰', '黄黄'
];

export function generateUsername(): string {
  const name1 = catNames[Math.floor(Math.random() * catNames.length)];
  const name2 = catNames[Math.floor(Math.random() * catNames.length)];
  const num = Math.floor(Math.random() * 999);
  return `${name1}${name2}${num}`;
}
