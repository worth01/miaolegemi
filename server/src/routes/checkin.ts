// P5: 签到路由
import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 每日签到
router.post('/checkin', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查今日是否已签到
    const existing = await prisma.checkin.findFirst({
      where: { userId, date: today },
    });
    if (existing) {
      return res.status(400).json({ error: '今日已签到' });
    }

    // 查询昨日签到获得连续天数
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayCheckin = await prisma.checkin.findFirst({
      where: { userId, date: yesterday },
    });
    const streak = (yesterdayCheckin?.streak || 0) + 1;

    // 创建签到记录
    await prisma.checkin.create({
      data: { userId, date: today, streak },
    });

    // 计算奖励：基础鱼干 + 连续奖励
    let fishEarned = 10;
    let bellsEarned = 0;
    if (streak % 7 === 0) {
      bellsEarned = 2;
    } else if (streak % 3 === 0) {
      fishEarned = 20;
    }

    // 发放鱼干
    await prisma.fish_ledger.create({
      data: { userId, amount: fishEarned, reason: 'daily_checkin', relatedId: null },
    });

    // 发放铃铛
    if (bellsEarned > 0) {
      await prisma.users.update({
        where: { id: userId },
        data: { bells: { increment: bellsEarned } },
      });
    }

    res.json({ fishEarned, bellsEarned, streak });
  } catch (error: any) {
    console.error('Checkin error:', error?.message || error);
    res.status(500).json({ error: '签到失败' });
  }
});

// 查询今日签到状态
router.get('/checkin', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await prisma.checkin.findFirst({
      where: { userId: req.user!.userId, date: today },
    });
    res.json({ checkedIn: !!existing, streak: existing?.streak || 0 });
  } catch (error: any) {
    res.status(500).json({ error: '查询签到状态失败' });
  }
});

export default router;
