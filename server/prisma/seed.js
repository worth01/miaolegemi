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

const CAT_PERSONALITIES = [
  { personalityId: 1, name: '傲娇', effectType: '主动技能冷却缩减', effectDesc: '技能CD更快，可更频繁释放', affectsFish: false },
  { personalityId: 2, name: '吃货', effectType: '额外鱼干百分比加成', effectDesc: '按好感度等级提升额外鱼干收益', affectsFish: true },
  { personalityId: 3, name: '胆小', effectType: '干扰牌负面效果减免', effectDesc: '降低冰冻、舔毛、变身、真身牌等干扰影响', affectsFish: false },
  { personalityId: 4, name: '黏人', effectType: '关卡容错续命', effectDesc: '提升失误缓冲，降低关卡失败概率', affectsFish: false },
  { personalityId: 5, name: '高冷', effectType: '普通消除得分加成', effectDesc: '基础三消消除获得更高分数', affectsFish: false },
  { personalityId: 6, name: '话痨', effectType: '释放技能额外得分', effectDesc: '每次使用主动技能时，额外追加对局分数', affectsFish: false },
  { personalityId: 7, name: '懒散', effectType: '关卡限时延长', effectDesc: '计时类关卡增加可操作总时长', affectsFish: false },
  { personalityId: 8, name: '胆大', effectType: '危险牌惩罚减免', effectDesc: '减少小狗牌、操作失误的扣分与失败判定', affectsFish: false },
  { personalityId: 9, name: '独行', effectType: '单人出战收益加成', effectDesc: '仅上阵该猫咪1只时，得分/收益提升', affectsFish: true },
  { personalityId: 10, name: '狡黠', effectType: '额外鱼干上限提升', effectDesc: '按好感度等级提高本局额外鱼干上限', affectsFish: true },
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
  const speciesCount = await prisma.catSpecies.count();
  console.log(`Done. ${speciesCount} cat species in database.`);

  console.log('Seeding cat_personalities...');
  for (const p of CAT_PERSONALITIES) {
    await prisma.catPersonalities.upsert({
      where: { personalityId: p.personalityId },
      update: p,
      create: p,
    });
  }
  const personalityCount = await prisma.catPersonalities.count();
  console.log(`Done. ${personalityCount} cat personalities in database.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
