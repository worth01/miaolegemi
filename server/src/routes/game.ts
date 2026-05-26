// P5: 游戏路由
import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 开始游戏
router.post('/start', authMiddleware, async (req, res) => {
  try {
    // 获取今日棋盘种子
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dailyBoard = await prisma.daily_boards.findUnique({
      where: { date: today }
    });

    // 如果今日棋盘不存在，生成新的
    if (!dailyBoard) {
      const seed = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
      dailyBoard = await prisma.daily_boards.create({
        data: { date: today, seed }
      });
    }

    // 获取玩家出战席猫咪
    const battleCats = await prisma.player_cats.findMany({
      where: {
        ownerId: req.user!.userId,
        location: 'battle'
      },
      include: {
        cat_serial_registry: {
          include: { cat_species: true }
        }
      },
      orderBy: { slotPosition: 'asc' }
    });

    res.json({
      seed: dailyBoard.seed.toString(),
      date: today.toISOString().split('T')[0],
      battleCats: battleCats.map(cat => ({
        id: cat.id,
        slot: cat.slotPosition,
        name: cat.cat_serial_registry.cat_species.name,
        rarity: cat.cat_serial_registry.cat_species.rarity,
        activeSkill: cat.cat_serial_registry.cat_species.activeSkill,
        passiveSkill: cat.cat_serial_registry.cat_species.passiveSkill,
        intimacy: cat.intimacy
      }))
    });
  } catch (error: any) {
    console.error('Start game error:', error);
    res.status(500).json({ error: '开始游戏失败' });
  }
});

// 提交游戏结果
router.post('/end', authMiddleware, async (req, res) => {
  try {
    const { score, fishEarned, comboCount, duration, catStats } = req.body;

    if (typeof score !== 'number' || typeof fishEarned !== 'number') {
      return res.status(400).json({ error: '参数错误' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 记录游戏
    const gameSession = await prisma.game_sessions.create({
      data: {
        playerId: req.user!.userId,
        boardDate: today,
        score,
        fishEarned,
        activeCats: catStats || [],
        comboCount: comboCount || 0,
        duration: duration || 0
      }
    });

    // 增加鱼干
    await prisma.fish_ledger.create({
      data: {
        userId: req.user!.userId,
        amount: fishEarned,
        reason: 'elimination',
        relatedId: gameSession.id
      }
    });

    // 更新猫咪统计
    if (catStats && Array.isArray(catStats)) {
      for (const stat of catStats) {
        await prisma.player_cats.updateMany({
          where: {
            id: stat.catId,
            ownerId: req.user!.userId
          },
          data: {
            gamesWitnessed: { increment: 1 },
            bestCombo: stat.maxCombo ? { set: stat.maxCombo } : undefined,
            daysAlive: { increment: 1 }
          }
        });
      }
    }

    // 更新里程碑
    const existingMilestone = await prisma.user_milestones.findUnique({
      where: { userId: req.user!.userId }
    });

    if (existingMilestone) {
      await prisma.user_milestones.update({
        where: { userId: req.user!.userId },
        data: {
          totalGames: { increment: 1 },
          totalFish: { increment: fishEarned },
          maxCombo: comboCount ? { set: Math.max(existingMilestone.maxCombo, comboCount) } : undefined
        }
      });
    } else {
      await prisma.user_milestones.create({
        data: {
          userId: req.user!.userId,
          totalGames: 1,
          totalFish: fishEarned,
          maxCombo: comboCount || 0
        }
      });
    }

    // 获取更新后的鱼干余额
    const newBalance = await prisma.fish_ledger.aggregate({
      where: { userId: req.user!.userId },
      _sum: { amount: true }
    });

    res.json({
      message: '游戏结果已记录',
      fishEarned,
      totalFish: newBalance._sum.amount || 0,
      gameId: gameSession.id
    });
  } catch (error: any) {
    console.error('End game error:', error);
    res.status(500).json({ error: '提交结果失败' });
  }
});

// 今日榜单
router.get('/leaderboard/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leaderboard = await prisma.game_sessions.findMany({
      where: {
        boardDate: today
      },
      include: {
        users: {
          select: {
            nickname: true
          }
        }
      },
      orderBy: { score: 'desc' },
      take: 100
    });

    const formattedLeaderboard = leaderboard.map((game, index) => ({
      rank: index + 1,
      nickname: game.users.nickname,
      score: game.score,
      fishEarned: game.fishEarned
    }));

    res.json({ leaderboard: formattedLeaderboard, date: today.toISOString().split('T')[0] });
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: '获取榜单失败' });
  }
});

// 获取个人历史战绩
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const games = await prisma.game_sessions.findMany({
      where: { playerId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    const total = await prisma.game_sessions.count({
      where: { playerId: req.user!.userId }
    });

    res.json({ games, total });
  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({ error: '获取历史战绩失败' });
  }
});

export default router;
