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
  '星空猫': '高冷',
  '幸运猫': '吃货',
};

function randomPersonality() {
  const shuffled = [...PERSONALITY_WORDS].sort(() => Math.random() - 0.5);
  return shuffled[0];
}

function getDefaultPersonality(catName) {
  return BREED_DEFAULT_PERSONALITIES[catName] || '傲娇';
}

// 获取家园猫咪
router.get('/nurturing', auth, async (req, res) => {
  try {
    const cats = await prisma.playerCat.findMany({
      where: { ownerId: req.user.id, location: 'nurturing' },
      include: { serial: { include: { species: true } } },
      orderBy: { slotPosition: 'asc' },
    });
    res.json(cats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取家园失败' });
  }
});

// 获取包裹区猫咪
router.get('/bag', auth, async (req, res) => {
  try {
    const cats = await prisma.playerCat.findMany({
      where: { ownerId: req.user.id, location: 'bag' },
      include: { serial: { include: { species: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(cats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取包裹区失败' });
  }
});

// 获取所有猫咪（nurturing + bag + memorial）
router.get('/', auth, async (req, res) => {
  try {
    const cats = await prisma.playerCat.findMany({
      where: { ownerId: req.user.id },
      include: { serial: { include: { species: true } } },
    });
    res.json(cats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取猫咪失败' });
  }
});

// 领养（包裹区 → 家园）
router.post('/:id/adopt', auth, async (req, res) => {
  try {
    const cat = await prisma.playerCat.findFirst({
      where: { id: req.params.id, ownerId: req.user.id, location: 'bag' },
    });
    if (!cat) return res.status(404).json({ error: '猫咪不在包裹区' });

    // 检查家园空位
    const nurturingCount = await prisma.playerCat.count({
      where: { ownerId: req.user.id, location: 'nurturing' },
    });

    // 检查解锁槽位
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const totalAdopted = await prisma.playerCat.count({
      where: { ownerId: req.user.id, location: { in: ['nurturing', 'memorial'] } },
    });
    let maxSlots = 3;
    if (totalAdopted >= 1) maxSlots = 4;
    if (totalAdopted >= 10) maxSlots = 5;
    const hasOldCat = await prisma.playerCat.findFirst({
      where: {
        ownerId: req.user.id,
        location: 'nurturing',
        adoptedAt: { lt: new Date(Date.now() - 90 * 86400000) },
      },
    });
    if (hasOldCat) maxSlots = 6;

    if (nurturingCount >= maxSlots) {
      return res.status(400).json({ error: `家园已满 (${nurturingCount}/${maxSlots})` });
    }

    const updated = await prisma.playerCat.update({
      where: { id: req.params.id },
      data: {
        location: 'nurturing',
        slotPosition: nurturingCount + 1,
        adoptedAt: new Date(),
        lastFedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
      include: { serial: { include: { species: true } } },
    });

    // 更新序列号状态
    await prisma.catSerialRegistry.update({
      where: { id: cat.serialId },
      data: { status: 'adopted' },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '领养失败' });
  }
});

// 喂食
router.post('/:id/feed', auth, async (req, res) => {
  try {
    const cat = await prisma.playerCat.findFirst({
      where: { id: req.params.id, ownerId: req.user.id, location: 'nurturing' },
    });
    if (!cat) return res.status(404).json({ error: '猫咪不在家园' });

    // 检查鱼干余额
    const ledger = await prisma.fishLedger.aggregate({
      where: { userId: req.user.id },
      _sum: { amount: true },
    });
    const balance = ledger._sum.amount || 0;
    if (balance < 1) return res.status(400).json({ error: '鱼干不足' });

    // 扣鱼干 + 续命
    await prisma.$transaction([
      prisma.fishLedger.create({
        data: { userId: req.user.id, amount: -1, reason: 'feed', relatedId: cat.id },
      }),
      prisma.playerCat.update({
        where: { id: req.params.id },
        data: {
          lastFedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 86400000),
          fishSpent: { increment: 1 },
        },
      }),
    ]);

    res.json({ success: true, message: '喂食成功' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '喂食失败' });
  }
});

// 送走（家园 → 告别 → 流浪）
router.post('/:id/release', auth, async (req, res) => {
  try {
    const cat = await prisma.playerCat.findFirst({
      where: { id: req.params.id, ownerId: req.user.id, location: 'nurturing' },
      include: { serial: { include: { species: true } } },
    });
    if (!cat) return res.status(404).json({ error: '猫咪不在家园' });

    const now = new Date();

    // 记录血统
    const prevOwners = Array.isArray(cat.previousOwners) ? cat.previousOwners : [];
    prevOwners.push({
      name: '你',
      daysAlive: cat.daysAlive || 0,
      fishSpent: cat.fishSpent || 0,
      bestCombo: cat.bestCombo || 0,
      gamesWitnessed: cat.gamesWitnessed || 0,
      dateLeft: now.toLocaleDateString('zh-CN'),
    });

    await prisma.$transaction([
      prisma.playerCat.update({
        where: { id: req.params.id },
        data: {
          location: 'memorial',
          releasedAt: now,
          previousOwners: prevOwners,
        },
      }),
      prisma.catSerialRegistry.update({
        where: { id: cat.serialId },
        data: {
          status: 'cooling',
          availableAfter: new Date(Date.now() + 60 * 86400000),
          currentOwnerId: null,
        },
      }),
    ]);

    res.json({ success: true, message: '已送走' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '送走失败' });
  }
});

// 猫咪详情
router.get('/:id/detail', auth, async (req, res) => {
  try {
    const cat = await prisma.playerCat.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
      include: { serial: { include: { species: true } } },
    });
    if (!cat) return res.status(404).json({ error: '猫咪不存在' });
    res.json(cat);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取详情失败' });
  }
});

// 血统记录
router.get('/:serialId/lineage', auth, async (req, res) => {
  try {
    const serial = await prisma.catSerialRegistry.findFirst({
      where: { id: req.params.serialId },
      include: { species: true },
    });
    if (!serial) return res.status(404).json({ error: '序列号不存在' });

    const cats = await prisma.playerCat.findMany({
      where: { serialId: req.params.serialId },
      orderBy: { createdAt: 'asc' },
    });

    const lineage = cats.map(c => {
      const owners = Array.isArray(c.previousOwners) ? c.previousOwners : [];
      return owners;
    }).flat();

    res.json({ serial, lineage });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取血统失败' });
  }
});

// 纪念册
router.get('/memorial', auth, async (req, res) => {
  try {
    const cats = await prisma.playerCat.findMany({
      where: { ownerId: req.user.id, location: 'memorial' },
      include: { serial: { include: { species: true } } },
      orderBy: { releasedAt: 'desc' },
    });
    res.json(cats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取纪念册失败' });
  }
});

// 清理猫咪性格数据（将旧数据修正为标准性格）
router.post('/cleanup-personalities', auth, async (req, res) => {
  try {
    const VALID_PERSONALITIES = ['傲娇', '吃货', '胆小', '黏人', '高冷', '话痨', '懒散', '胆大', '独行', '狡黠'];

    // 获取所有猫咪，带品种信息
    const cats = await prisma.playerCat.findMany({
      where: { ownerId: req.user.id },
      include: { serial: { include: { species: true } } },
    });

    let cleanedCount = 0;
    const updates = [];

    for (const cat of cats) {
      const rawPersonality = cat.personality;
      // 检查是否是有效性格
      const isValid = VALID_PERSONALITIES.includes(rawPersonality);

      if (!isValid && rawPersonality) {
        // 获取品种对应的默认性格
        const breedName = cat.serial?.species?.name;
        const correctPersonality = BREED_DEFAULT_PERSONALITIES[breedName] || '傲娇';

        await prisma.playerCat.update({
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '清理失败' });
  }
});

module.exports = router;
