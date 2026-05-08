const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();
const router = Router();

// 个人信息
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: '用户不存在' });

    // 鱼干余额
    const ledger = await prisma.fishLedger.aggregate({
      where: { userId: req.user.id },
      _sum: { amount: true },
    });
    const fishBalance = ledger._sum.amount || 0;

    // 猫咪统计
    const totalAdopted = await prisma.playerCat.count({
      where: { ownerId: req.user.id },
    });
    const nurturing = await prisma.playerCat.count({
      where: { ownerId: req.user.id, location: 'nurturing' },
    });
    const memorial = await prisma.playerCat.count({
      where: { ownerId: req.user.id, location: 'memorial' },
    });

    // 最长存活
    const oldestCat = await prisma.playerCat.findFirst({
      where: { ownerId: req.user.id, location: 'nurturing' },
      orderBy: { adoptedAt: 'asc' },
      include: { serial: { include: { species: true } } },
    });

    // 最低编号
    const lowestSerial = await prisma.playerCat.findFirst({
      where: { ownerId: req.user.id },
      include: { serial: { include: { species: true } } },
      orderBy: { serial: { serialNumber: 'asc' } },
    });

    // 总鱼干消耗
    const fishSpent = await prisma.fishLedger.aggregate({
      where: { userId: req.user.id, amount: { lt: 0 } },
      _sum: { amount: true },
    });

    // 最近签到
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCheckin = await prisma.checkin.findFirst({
      where: { userId: req.user.id, date: today },
    });

    // 称号计算
    const titles = [];
    if (totalAdopted >= 1) titles.push('新手铲屎官');
    if (totalAdopted >= 5) titles.push('合格铲屎官');
    if (oldestCat && oldestCat.adoptedAt) {
      const daysAlive = Math.floor((Date.now() - new Date(oldestCat.adoptedAt).getTime()) / 86400000);
      if (daysAlive >= 90) titles.push('资深铲屎官');
      if (daysAlive >= 180) titles.push('老铲屎官');
    }
    if (totalAdopted >= 20) titles.push('猫咪守护者');

    const releasedCount = await prisma.playerCat.count({
      where: { ownerId: req.user.id, location: 'memorial', releasedAt: { not: null } },
    });
    if (releasedCount >= 3) titles.push('猫星摆渡人');

    res.json({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      bells: user.bells,
      fishBalance,
      pityCount: user.pityCount,
      activeTitle: user.activeTitle,
      titles,
      stats: {
        totalAdopted,
        nurturing,
        memorial,
        fishSpent: Math.abs(fishSpent._sum.amount || 0),
        hasCheckedInToday: !!todayCheckin,
        longestAlive: oldestCat ? {
          speciesName: oldestCat.serial?.species?.name,
          serialNumber: oldestCat.serial?.serialNumber,
          days: Math.floor((Date.now() - new Date(oldestCat.adoptedAt).getTime()) / 86400000),
        } : null,
        lowestSerial: lowestSerial ? {
          speciesName: lowestSerial.serial?.species?.name,
          serialNumber: lowestSerial.serial?.serialNumber,
        } : null,
      },
      hasClaimedFirstGacha: user.hasClaimedFirstGacha,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取个人信息失败' });
  }
});

// 签到
router.post('/checkin', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.checkin.findFirst({
      where: { userId: req.user.id, date: today },
    });
    if (existing) return res.status(400).json({ error: '今日已签到' });

    // 查昨天签到记录
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayCheckin = await prisma.checkin.findFirst({
      where: { userId: req.user.id, date: yesterday },
    });

    const streak = yesterdayCheckin ? yesterdayCheckin.streak + 1 : 1;
    const fishReward = 5;
    const bellReward = streak >= 7 ? 1 : 0;

    await prisma.$transaction([
      prisma.checkin.create({
        data: { userId: req.user.id, date: today, streak },
      }),
      prisma.fishLedger.create({
        data: { userId: req.user.id, amount: fishReward, reason: 'checkin' },
      }),
      ...(bellReward > 0 ? [
        prisma.user.update({
          where: { id: req.user.id },
          data: { bells: { increment: bellReward } },
        }),
      ] : []),
    ]);

    // 如果连续签到7天，重置计数
    if (streak >= 7) {
      await prisma.checkin.update({
        where: { id: (await prisma.checkin.findFirst({ where: { userId: req.user.id, date: today } })).id },
        data: { streak: 0 },
      });
    }

    res.json({
      success: true,
      fishEarned: fishReward,
      bellsEarned: bellReward,
      streak: streak >= 7 ? 0 : streak,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '签到失败' });
  }
});

// 里程碑
router.get('/milestones', auth, async (req, res) => {
  try {
    const totalAdopted = await prisma.playerCat.count({
      where: { ownerId: req.user.id },
    });
    const nurturing = await prisma.playerCat.findMany({
      where: { ownerId: req.user.id, location: 'nurturing' },
      orderBy: { adoptedAt: 'asc' },
    });
    const oldestDays = nurturing.length > 0 && nurturing[0].adoptedAt
      ? Math.floor((Date.now() - new Date(nurturing[0].adoptedAt).getTime()) / 86400000)
      : 0;

    const milestones = [
      { name: '首次领养', condition: '领养1只猫', current: Math.min(totalAdopted, 1), target: 1, reward: '养成区第4格', unlocked: totalAdopted >= 1 },
      { name: '资深铲屎官', condition: '历史领养满10只', current: Math.min(totalAdopted, 10), target: 10, reward: '养成区第5格', unlocked: totalAdopted >= 10 },
      { name: '猫咪守护者', condition: '有猫存活超过90天', current: Math.min(oldestDays, 90), target: 90, reward: '养成区第6格', unlocked: oldestDays >= 90 },
    ];

    res.json(milestones);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取里程碑失败' });
  }
});

module.exports = router;
