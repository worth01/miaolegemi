const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();
const router = Router();

const PERSONALITY_WORDS = ['傲娇', '吃货', '胆小', '黏人', '高冷', '话痨', '懒散', '胆大', '独行', '狡黠'];

const BREED_DEFAULT_PERSONALITIES = {
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
};

function randomPersonality() {
  const shuffled = [...PERSONALITY_WORDS].sort(() => Math.random() - 0.5);
  return shuffled[0];
}

function getDefaultPersonality(catName) {
  return BREED_DEFAULT_PERSONALITIES[catName] || '傲娇';
}

// 抽取一只猫（通用逻辑）
async function pullCat(userId, forceSpeciesId) {
  const species = await prisma.catSpecies.findMany();
  let selected;
  if (forceSpeciesId) {
    selected = species.find(s => s.id === forceSpeciesId);
  } else {
    const totalWeight = species.reduce((sum, s) => sum + s.weight, 0);
    let roll = Math.random() * totalWeight;
    selected = species[0];
    for (const s of species) {
      roll -= s.weight;
      if (roll <= 0) { selected = s; break; }
    }
  }

  // 分配序列号
  const serials = await prisma.catSerialRegistry.findMany({
    where: { speciesId: selected.id, status: 'available' },
    orderBy: { serialNumber: 'asc' },
    take: 1,
  });

  let serial;
  if (serials.length > 0) {
    serial = await prisma.catSerialRegistry.update({
      where: { id: serials[0].id },
      data: { status: 'adopted', currentOwnerId: userId, firstOwnerId: serials[0].firstOwnerId || userId },
    });
  } else {
    const maxSerial = await prisma.catSerialRegistry.aggregate({
      where: { speciesId: selected.id },
      _max: { serialNumber: true },
    });
    const nextNum = (maxSerial._max.serialNumber || 0) + 1;
    serial = await prisma.catSerialRegistry.create({
      data: {
        speciesId: selected.id,
        serialNumber: nextNum,
        status: 'adopted',
        currentOwnerId: userId,
        firstOwnerId: userId,
      },
    });
  }

  const personality = randomPersonality();
  const cat = await prisma.playerCat.create({
    data: {
      ownerId: userId,
      serialId: serial.id,
      location: 'bag',
      personality,
      bagExpiresAt: new Date(Date.now() + 30 * 86400000),
    },
    include: { serial: { include: { species: true } } },
  });

  return cat;
}

// 首次抽卡（注册赠送，50% 概率幸运猫）
router.post('/first-pull', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.hasClaimedFirstGacha) return res.status(400).json({ error: '已领取过首次抽卡' });

    // 50% 概率幸运猫
    const luckyCat = await prisma.catSpecies.findFirst({ where: { name: '幸运猫' } });
    let forceId = null;
    if (Math.random() < 0.5 && luckyCat) {
      forceId = luckyCat.id;
    }

    const cat = await pullCat(req.user.id, forceId);

    // +1 猫铃铛（首次赠送）+ 标记已领取
    await prisma.user.update({
      where: { id: req.user.id },
      data: { bells: { increment: 1 }, hasClaimedFirstGacha: true },
    });

    res.json({ cat, bellsRemaining: user.bells + 1 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '首次抽卡失败' });
  }
});

function randomPersonality() {
  const shuffled = [...PERSONALITY_WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

// 抽卡
router.post('/pull', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: '用户不存在' });

    // 检查猫铃铛
    if (user.bells < 1) return res.status(400).json({ error: '猫铃铛不足' });

    // 检查包裹区容量
    const bagCount = await prisma.playerCat.count({
      where: { ownerId: req.user.id, location: 'bag' },
    });
    if (bagCount >= 20) return res.status(400).json({ error: '包裹区已满 (20/20)' });

    // 抽卡权重
    const species = await prisma.catSpecies.findMany();
    const totalWeight = species.reduce((sum, s) => sum + s.weight, 0);
    let roll = Math.random() * totalWeight;
    let selected = species[0];
    for (const s of species) {
      roll -= s.weight;
      if (roll <= 0) { selected = s; break; }
    }

    // 保底
    let newPity = user.pityCount + 1;
    if (newPity >= 80) {
      selected = species.find(s => s.rarity === 'SR') || selected;
      newPity = 0;
    }
    if (selected.rarity === 'SR') newPity = 0;

    // 分配序列号
    const serials = await prisma.catSerialRegistry.findMany({
      where: { speciesId: selected.id, status: 'available' },
      orderBy: { serialNumber: 'asc' },
      take: 1,
    });

    let serial;
    if (serials.length > 0) {
      serial = await prisma.catSerialRegistry.update({
        where: { id: serials[0].id },
        data: { status: 'adopted', currentOwnerId: req.user.id, firstOwnerId: serials[0].firstOwnerId || req.user.id },
      });
    } else {
      // 生成新序列号
      const maxSerial = await prisma.catSerialRegistry.aggregate({
        where: { speciesId: selected.id },
        _max: { serialNumber: true },
      });
      const nextNum = (maxSerial._max.serialNumber || 0) + 1;
      serial = await prisma.catSerialRegistry.create({
        data: {
          speciesId: selected.id,
          serialNumber: nextNum,
          status: 'adopted',
          currentOwnerId: req.user.id,
          firstOwnerId: req.user.id,
        },
      });
    }

    const personality = getDefaultPersonality(selected.name);

    // 创建玩家猫咪
    const cat = await prisma.playerCat.create({
      data: {
        ownerId: req.user.id,
        serialId: serial.id,
        location: 'bag',
        personality,
        bagExpiresAt: new Date(Date.now() + 30 * 86400000),
      },
      include: { serial: { include: { species: true } } },
    });

    // 扣猫铃铛 + 更新保底
    await prisma.user.update({
      where: { id: req.user.id },
      data: { bells: { decrement: 1 }, pityCount: newPity },
    });

    res.json({ cat, bellsRemaining: user.bells - 1 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '抽卡失败' });
  }
});

// 保底进度
router.get('/pity', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ pityCount: user.pityCount, pityMax: 80 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取保底进度失败' });
  }
});

module.exports = router;
