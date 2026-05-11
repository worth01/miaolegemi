const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CAT_SPECIES = [
  { name: '橘猫',   rarity: 'N',   weight: 30, activeSkill: { name: '挑出来', desc: '将收集槽中最底层2张牌移动到临时存放槽中' }, passiveSkill: { name: '吃得多', desc: '每局计时从开局2秒后开始计算' } },
  { name: '黑猫',   rarity: 'N',   weight: 30, activeSkill: { name: '撤回',   desc: '撤销上一步操作' },                           passiveSkill: { name: '灵光',   desc: '临时存放层槽位上限+1格' } },
  { name: '白猫',   rarity: 'N',   weight: 30, activeSkill: { name: '重整',   desc: '重新打乱当前所有可点击卡牌' },               passiveSkill: { name: '醒目',   desc: '每局开局立即消除1组可消除组合' } },
  { name: '蓝猫',   rarity: 'N',   weight: 30, activeSkill: { name: '冻结',   desc: '5秒内计时暂停' },                             passiveSkill: { name: '沉静',   desc: '鱼干+10%' } },
  { name: '布偶猫', rarity: 'R',   weight: 15, activeSkill: { name: '叼走',   desc: '将收集槽中最底层3张牌移至临时存放槽中' },   passiveSkill: { name: '贵宾',   desc: '鱼干+20%' } },
  { name: '三花猫', rarity: 'R',   weight: 15, activeSkill: { name: '蹦跶',   desc: '随机跳走2张干扰卡' },                       passiveSkill: { name: '收获',   desc: '临时存放层槽位上限+2格' } },
  { name: '暹罗猫', rarity: 'R',   weight: 15, activeSkill: { name: '瞬移',   desc: '将收集槽3张卡打乱放回棋盘' },               passiveSkill: { name: '吃得快', desc: '每局计时从开局5秒后开始计算' } },
  { name: '无毛猫', rarity: 'R',   weight: 15, activeSkill: { name: '灼烧',   desc: '清除最顶层3张卡牌' },                       passiveSkill: { name: '爪痕',   desc: '每局自动移出1张干扰卡' } },
  { name: '波斯猫', rarity: 'SR',  weight: 5,  activeSkill: { name: '吐息',   desc: '将基于临时存放槽位，移出同等数量的牌' },     passiveSkill: { name: '优雅步调', desc: '每局额外1次重来机会' } },
  { name: '折耳猫', rarity: 'SR',  weight: 5,  activeSkill: { name: '听声',   desc: '撤销前2步，同时不计入失败次数' },            passiveSkill: { name: '猫之眼', desc: '被遮挡的卡牌仍以半透明显示' } },
  { name: '星空猫', rarity: 'SSR', weight: 5,  activeSkill: { name: '永昼',   desc: '有一定几率，直接跳过本关' },                 passiveSkill: { name: '观星',   desc: '猫咪喜欢观星，并在游戏中时刻祝福你' } },
  { name: '幸运猫', rarity: 'SSR', weight: 5,  activeSkill: { name: '洗牌',   desc: '重新打乱当前棋盘所有卡牌' },                 passiveSkill: { name: '福星',   desc: '鱼干+40%' } },
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
