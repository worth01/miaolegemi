// P5: 抽卡路由
import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 猫咪种类和权重
const CAT_WEIGHTS = [
  { name: '橘猫', rarity: 'N', weight: 8 },
  { name: '黑猫', rarity: 'N', weight: 8 },
  { name: '白猫', rarity: 'N', weight: 7 },
  { name: '蓝猫', rarity: 'N', weight: 7 },
  { name: '布偶猫', rarity: 'R', weight: 4 },
  { name: '三花猫', rarity: 'R', weight: 4 },
  { name: '暹罗猫', rarity: 'R', weight: 4 },
  { name: '无毛猫', rarity: 'R', weight: 3 },
  { name: '波斯猫', rarity: 'SR', weight: 2 },
  { name: '折耳猫', rarity: 'SR', weight: 2 },
  { name: '星空猫', rarity: 'SSR', weight: 1 },
  { name: '幸运猫', rarity: 'SSR', weight: 1 }
];

// 性格词库
const PERSONALITIES = [
  '傲娇', '吃货', '胆小', '黏人', '高冷', '话痨', '懒散', '胆大', '独行', '狡黠'
];

// 品种默认性格
const BREED_DEFAULT_PERSONALITIES: Record<string, string> = {
  '橘猫': '吃货',
  '黑猫': '胆大',
  '白猫': '高冷',
  '蓝猫': '懒散',
  '布偶猫': '狡黠',
  '三花猫': '胆小',
  '暹罗猫': '独行',
  '无毛猫': '话痨',
  '波斯猫': '黏人',
  '折耳猫': '傲娇',
  '星空猫': '高冷',
  '幸运猫': '吃货',
};

function getDefaultPersonality(catName: string): string {
  return BREED_DEFAULT_PERSONALITIES[catName] || '傲娇';
}

// 抽卡（单抽）- 使用猫铃铛
router.post('/pull', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ error: '用户不存在' });

    // 检查猫铃铛
    if ((user as any).bells < 1) return res.status(400).json({ error: '猫铃铛不足' });

    // 检查包裹区容量
    const bagCount = await prisma.player_cats.count({
      where: { ownerId: req.user!.userId, location: 'bag' },
    });
    if (bagCount >= 20) return res.status(400).json({ error: '包裹区已满 (20/20)' });

    // 抽卡权重
    const species = await prisma.cat_species.findMany();
    const totalWeight = species.reduce((sum: number, s: any) => sum + s.weight, 0);
    let roll = Math.random() * totalWeight;
    let selected: any = species[0];
    for (const s of species) {
      roll -= s.weight;
      if (roll <= 0) { selected = s; break; }
    }

    // 保底
    let newPity = (user as any).pityCount + 1;
    if (newPity >= 80) {
      selected = species.find((s: any) => s.rarity === 'SR') || selected;
      newPity = 0;
    }
    if (selected.rarity === 'SR') newPity = 0;

    // 分配序列号
    const serials = await prisma.cat_serial_registry.findMany({
      where: { speciesId: selected.id, status: 'available' },
      orderBy: { serialNumber: 'asc' },
      take: 1,
    });

    let serial;
    if (serials.length > 0) {
      serial = await prisma.cat_serial_registry.update({
        where: { id: serials[0].id },
        data: { status: 'adopted', currentOwnerId: req.user!.userId, firstOwnerId: serials[0].firstOwnerId || req.user!.userId },
      });
    } else {
      const maxSerial = await prisma.cat_serial_registry.aggregate({
        where: { speciesId: selected.id },
        _max: { serialNumber: true },
      });
      const nextNum = ((maxSerial as any)._max.serialNumber || 0) + 1;
      serial = await prisma.cat_serial_registry.create({
        data: {
          speciesId: selected.id,
          serialNumber: nextNum,
          status: 'adopted',
          currentOwnerId: req.user!.userId,
          firstOwnerId: req.user!.userId,
        },
      });
    }

    const personality = getDefaultPersonality(selected.name);

    // 创建玩家猫咪
    const cat = await prisma.player_cats.create({
      data: {
        ownerId: req.user!.userId,
        serialId: serial.id,
        location: 'bag',
        personality: { primary: personality, secondary: null },
        bagExpiresAt: new Date(Date.now() + 30 * 86400000),
      },
      include: { cat_serial_registry: { include: { cat_species: true } } },
    });

    // 扣猫铃铛 + 更新保底
    await prisma.users.update({
      where: { id: req.user!.userId },
      data: { bells: { decrement: 1 }, pityCount: newPity },
    });

    res.json({ cat, bellsRemaining: (user as any).bells - 1, pityCount: newPity });
  } catch (error: any) {
    console.error('Gacha pull error:', error?.message || error, error?.stack);
    res.status(500).json({ error: '抽卡失败: ' + (error?.message || '未知错误') });
  }
});

// 保底进度
router.get('/pity', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user!.userId },
      select: { pityCount: true }
    });

    res.json({
      pityCount: user?.pityCount || 0,
      nextPity: 100 - (user?.pityCount || 0),
      isPity: (user?.pityCount || 0) >= 99
    });
  } catch (error: any) {
    console.error('Get pity error:', error);
    res.status(500).json({ error: '获取保底进度失败' });
  }
});

// 获取猫咪品种列表
router.get('/species', async (req, res) => {
  try {
    let species = await prisma.cat_species.findMany({
      orderBy: { id: 'asc' }
    });

    // 如果数据库为空，初始化品种数据
    if (species.length === 0) {
      await prisma.cat_species.createMany({
        data: CAT_WEIGHTS.map((cat, index) => ({
          name: cat.name,
          rarity: cat.rarity,
          weight: cat.weight,
          activeSkill: { name: getActiveSkillName(cat.name), desc: getActiveSkillDesc(cat.name) },
          passiveSkill: { name: getPassiveSkillName(cat.name), desc: getPassiveSkillDesc(cat.name) },
          description: getCatDescription(cat.name)
        }))
      });

      species = await prisma.cat_species.findMany({
        orderBy: { id: 'asc' }
      });
    }

    res.json({ species });
  } catch (error: any) {
    console.error('Get species error:', error);
    res.status(500).json({ error: '获取猫咪品种失败' });
  }
});

// 获取技能名称
function getActiveSkillName(catName: string): string {
  const skills: Record<string, string> = {
    '橘猫': '挑出来',
    '黑猫': '撤回',
    '白猫': '重整',
    '蓝猫': '冻结',
    '布偶猫': '叼走',
    '三花猫': '蹦跶',
    '暹罗猫': '瞬移',
    '无毛猫': '灼烧',
    '波斯猫': '吐息',
    '折耳猫': '听声',
    '星空猫': '永昼',
    '幸运猫': '洗牌'
  };
  return skills[catName] || '普通攻击';
}

function getActiveSkillDesc(catName: string): string {
  const descs: Record<string, string> = {
    '橘猫': '将收集槽中最底层2张牌移动到临时存放槽中',
    '黑猫': '撤销上一步操作',
    '白猫': '重新打乱当前所有可点击卡牌',
    '蓝猫': '5秒内计时暂停',
    '布偶猫': '将收集槽中最底层3张牌移至临时存放槽中',
    '三花猫': '随机跳走2张干扰卡',
    '暹罗猫': '将收集槽3张卡打乱放回棋盘',
    '无毛猫': '清除最顶层3张卡牌',
    '波斯猫': '将基于临时存放槽位，移出同等数量的牌',
    '折耳猫': '撤销前2步，同时不计入失败次数',
    '星空猫': '有一定几率，直接跳过本关',
    '幸运猫': '重新打乱当前棋盘所有卡牌'
  };
  return descs[catName] || '触发技能效果';
}

function getPassiveSkillName(catName: string): string {
  const skills: Record<string, string> = {
    '橘猫': '吃得多',
    '黑猫': '灵光',
    '白猫': '醒目',
    '蓝猫': '沉静',
    '布偶猫': '贵宾',
    '三花猫': '收获',
    '暹罗猫': '吃得快',
    '无毛猫': '爪痕',
    '波斯猫': '优雅步调',
    '折耳猫': '猫之眼',
    '星空猫': '观星',
    '幸运猫': '福星'
  };
  return skills[catName] || '被动增强';
}

function getPassiveSkillDesc(catName: string): string {
  const descs: Record<string, string> = {
    '橘猫': '每局计时从开局2秒后开始计算',
    '黑猫': '临时存放层槽位上限+1格',
    '白猫': '每局开局立即消除1组可消除组合',
    '蓝猫': '鱼干+10%',
    '布偶猫': '鱼干+20%',
    '三花猫': '临时存放层槽位上限+2格',
    '暹罗猫': '每局计时从开局5秒后开始计算',
    '无毛猫': '每局自动移出1张干扰卡',
    '波斯猫': '每局额外1次重来机会',
    '折耳猫': '被遮挡的卡牌仍以半透明显示',
    '星空猫': '猫咪喜欢观星，并在游戏中时刻祝福你',
    '幸运猫': '鱼干+40%'
  };
  return descs[catName] || '被动技能效果';
}

function getCatDescription(catName: string): string {
  const descs: Record<string, string> = {
    '橘猫': '胖乎乎的大橘，非常贪吃，性格佛系',
    '黑猫': '神秘的黑猫，看起来很高冷，其实很酷',
    '白猫': '优雅的白猫，非常醒目，总是引人注目',
    '蓝猫': '安静的蓝猫，善于沉思，性格沉静',
    '布偶猫': '柔软的布偶猫，非常黏人，是个小公主',
    '三花猫': '活泼的三花猫，好奇心强，喜欢蹦跶',
    '暹罗猫': '优雅的暹罗猫，有点傲娇，还会吃醋',
    '无毛猫': '独特的无毛猫，行动迅速，爪痕锐利',
    '波斯猫': '高贵的波斯猫，举止优雅，步调从容',
    '折耳猫': '可爱的折耳猫，听觉敏锐，能听声辨位',
    '星空猫': '神秘的星空猫，闪耀如星，是SSR珍稀',
    '幸运猫': '带来好运的猫咪，福星高照，是SSR珍稀'
  };
  return descs[catName] || '一只可爱的猫咪';
}

// 清理猫咪性格数据（将旧数据修正为标准性格）
router.post('/cleanup-personalities', authMiddleware, async (req, res) => {
  try {
    const VALID_PERSONALITIES = ['傲娇', '吃货', '胆小', '黏人', '高冷', '话痨', '懒散', '胆大', '独行', '狡黠'];

    // 获取所有猫咪，带品种信息
    const cats = await prisma.player_cats.findMany({
      where: { ownerId: req.user!.userId },
      include: { cat_serial_registry: { include: { cat_species: true } } },
    });

    let cleanedCount = 0;
    const updates = [];

    for (const cat of cats) {
      const rawPersonality = cat.personality;
      // 检查是否是有效性格
      const isValid = VALID_PERSONALITIES.includes(rawPersonality as string);

      if (!isValid && rawPersonality) {
        // 获取品种对应的默认性格
        const breedName = cat.cat_serial_registry?.cat_species?.name;
        const correctPersonality = BREED_DEFAULT_PERSONALITIES[breedName || ''] || '傲娇';

        await prisma.player_cats.update({
          where: { id: cat.id },
          data: { personality: correctPersonality },
        });

        updates.push({
          catId: cat.id,
          catName: breedName,
          old: rawPersonality,
          new: correctPersonality,
        });
        cleanedCount++;
      }
    }

    res.json({
      success: true,
      message: `已清理 ${cleanedCount} 只猫咪的性格数据`,
      details: updates,
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: '清理失败' });
  }
});

export default router;
