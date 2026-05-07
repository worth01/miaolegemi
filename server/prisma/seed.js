const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CAT_SPECIES = [
  { name: '橘猫', rarity: 'N', weight: 30, activeSkill: { name: '挑出来', desc: '将一张卡从上方直接移入收集槽' }, passiveSkill: { name: '吃得多', desc: '每局计时从开局10秒后计算' } },
  { name: '黑猫', rarity: 'N', weight: 30, activeSkill: { name: '撤回', desc: '撤销上一步操作' }, passiveSkill: { name: '灵光', desc: '收集槽上限+2格' } },
  { name: '白猫', rarity: 'N', weight: 30, activeSkill: { name: '吹毛', desc: '翻开最顶层一张卡查看下方' }, passiveSkill: { name: '醒目', desc: '每局内高亮标记1组可消除组合' } },
  { name: '蓝猫', rarity: 'N', weight: 30, activeSkill: { name: '冻结', desc: '5秒内计时暂停' }, passiveSkill: { name: '猫抓板', desc: '每局自动移出1张干扰卡' } },
  { name: '布偶猫', rarity: 'R', weight: 15, activeSkill: { name: '粘住', desc: '收集槽已满时可强行塞入1张' }, passiveSkill: { name: '贵宾', desc: '鱼干+30%' } },
  { name: '三花猫', rarity: 'R', weight: 15, activeSkill: { name: '蹦跶', desc: '随机跳走2张干扰卡' }, passiveSkill: { name: '三色守护', desc: '失败后可重来1次' } },
  { name: '暹罗猫', rarity: 'R', weight: 15, activeSkill: { name: '瞬移', desc: '将收集槽最底部1张卡移回棋盘' }, passiveSkill: { name: '吃得快', desc: '每局计时从开局5秒后计算' } },
  { name: '幸运猫', rarity: 'SR', weight: 5, activeSkill: { name: '洗牌', desc: '重新打乱当前所有可点击卡牌' }, passiveSkill: { name: '福星', desc: '鱼干+50%' } },
  { name: '折耳猫', rarity: 'SR', weight: 5, activeSkill: { name: '听声', desc: '高亮标记2组可消除组合' }, passiveSkill: { name: '猫之眼', desc: '棋盘边缘卡牌数量+1' } },
  { name: '无毛猫', rarity: 'SR', weight: 5, activeSkill: { name: '灼烧', desc: '清除最顶层3张卡牌' }, passiveSkill: { name: '不屈', desc: '鱼干+20%' } },
  { name: '波斯猫', rarity: 'SR', weight: 5, activeSkill: { name: '吐司', desc: '将收集槽3张卡打乱放回棋盘' }, passiveSkill: { name: '优雅步调', desc: '每局额外1次重来机会' } },
];

async function main() {
  console.log('Seeding cat_species...');
  for (const cat of CAT_SPECIES) {
    await prisma.catSpecies.upsert({
      where: { id: CAT_SPECIES.indexOf(cat) + 1 },
      update: {},
      create: cat,
    });
  }
  const count = await prisma.catSpecies.count();
  console.log(`Done. ${count} cat species in database.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
