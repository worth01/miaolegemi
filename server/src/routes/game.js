const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();
const router = Router();

// 开始游戏
router.post('/start', auth, async (req, res) => {
  try {
    const cats = await prisma.playerCat.findMany({
      where: { ownerId: req.user.id, location: 'nurturing' },
      include: { serial: { include: { species: true } } },
      orderBy: { slotPosition: 'asc' },
    });

    const activeCats = cats.slice(0, 3).map(c => ({
      id: c.id,
      speciesName: c.serial.species.name,
      rarity: c.serial.species.rarity,
      activeSkill: c.serial.species.activeSkill,
    }));

    const passiveCats = cats.slice(3, 6).map(c => ({
      id: c.id,
      speciesName: c.serial.species.rarity,
      passiveSkill: c.serial.species.passiveSkill,
    }));

    const today = new Date().toISOString().slice(0, 10);

    res.json({ activeCats, passiveCats, boardDate: today });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '开始游戏失败' });
  }
});

// 提交游戏结果
router.post('/end', auth, async (req, res) => {
  try {
    const { score, fishEarned, maxCombo, activeCats } = req.body;
    if (score === undefined || fishEarned === undefined) {
      return res.status(400).json({ error: '缺少游戏结果数据' });
    }

    // 记录游戏
    const session = await prisma.gameSession.create({
      data: {
        playerId: req.user.id,
        score,
        fishEarned,
        maxCombo: maxCombo || 0,
        activeCats: activeCats || [],
      },
    });

    // 发放鱼干
    await prisma.fishLedger.create({
      data: { userId: req.user.id, amount: fishEarned, reason: 'elimination', relatedId: session.id },
    });

    // 更新出战猫咪见证数据
    if (activeCats && activeCats.length > 0) {
      for (const catId of activeCats) {
        await prisma.playerCat.update({
          where: { id: catId },
          data: {
            gamesWitnessed: { increment: 1 },
            bestCombo: { set: Math.max(maxCombo || 0, 0) },
          },
        }).catch(() => {}); // 忽略无效的catId
      }
    }

    // 获取新余额
    const ledger = await prisma.fishLedger.aggregate({
      where: { userId: req.user.id },
      _sum: { amount: true },
    });

    res.json({ session, newBalance: ledger._sum.amount || 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '提交结果失败' });
  }
});

module.exports = router;
