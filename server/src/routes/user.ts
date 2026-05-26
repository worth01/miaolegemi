// P5: 用户路由
import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 获取用户统计
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user!.userId },
      include: {
        cats: true,
        gameSessions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 计算鱼干余额
    const fishBalance = await prisma.fish_ledger.aggregate({
      where: { userId: user.id },
      _sum: { amount: true }
    });

    // 猫咪统计
    const catsOwned = await prisma.player_cats.count({
      where: { ownerId: user.id }
    });

    const catsInBattle = await prisma.player_cats.count({
      where: { ownerId: user.id, location: 'battle' }
    });

    const catsInHome = await prisma.player_cats.count({
      where: { ownerId: user.id, location: 'home' }
    });

    // 游戏统计
    const totalGames = await prisma.game_sessions.count({
      where: { playerId: user.id }
    });

    const gameStats = await prisma.game_sessions.aggregate({
      where: { playerId: user.id },
      _sum: { score: true, fishEarned: true },
      _avg: { score: true, comboCount: true },
      _max: { score: true, comboCount: true }
    });

    // 获取里程碑
    const milestones = await prisma.user_milestones.findUnique({
      where: { userId: user.id }
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        createdAt: user.createdAt
      },
      fishBalance: fishBalance._sum.amount || 0,
      cats: {
        total: catsOwned,
        battle: catsInBattle,
        home: catsInHome
      },
      games: {
        total: totalGames,
        totalScore: gameStats._sum.score || 0,
        avgScore: Math.round(gameStats._avg.score || 0),
        maxScore: gameStats._max.score || 0,
        maxCombo: gameStats._max.comboCount || 0,
        totalFish: gameStats._sum.fishEarned || 0
      },
      milestones
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 获取里程碑进度
router.get('/milestones', authMiddleware, async (req, res) => {
  try {
    let milestones = await prisma.user_milestones.findUnique({
      where: { userId: req.user!.userId }
    });

    // 如果不存在，创建默认里程碑
    if (!milestones) {
      milestones = await prisma.user_milestones.create({
        data: { userId: req.user!.userId }
      });
    }

    // 里程碑定义
    const milestoneDefinitions = [
      { id: 'first_cat', name: '初次相遇', desc: '领养第一只猫咪', progress: milestones.catsOwned, target: 1, icon: '🐱' },
      { id: 'cat_collector', name: '猫咪收藏家', desc: '拥有10只猫咪', progress: milestones.catsOwned, target: 10, icon: '📚' },
      { id: 'game_master', name: '消消乐大师', desc: '完成100局游戏', progress: milestones.totalGames, target: 100, icon: '🎮' },
      { id: 'combo_king', name: '连击之王', desc: '达成50连击', progress: milestones.maxCombo, target: 50, icon: '👑' },
      { id: 'fish_rich', name: '鱼干富翁', desc: '累计获得10000鱼干', progress: milestones.totalFish, target: 10000, icon: '🐟' },
      { id: 'first_release', name: '送别时刻', desc: '送走第一只猫咪', progress: milestones.catsReleased, target: 1, icon: '👋' }
    ];

    const formattedMilestones = milestoneDefinitions.map(m => ({
      ...m,
      completed: m.progress >= m.target,
      percentage: Math.min(100, Math.round((m.progress / m.target) * 100))
    }));

    res.json({ milestones: formattedMilestones });
  } catch (error: any) {
    console.error('Get milestones error:', error);
    res.status(500).json({ error: '获取里程碑失败' });
  }
});

// 获取鱼干账本
router.get('/fish-history', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const records = await prisma.fish_ledger.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    const total = await prisma.fish_ledger.count({
      where: { userId: req.user!.userId }
    });

    // 计算当前余额
    const balance = await prisma.fish_ledger.aggregate({
      where: { userId: req.user!.userId },
      _sum: { amount: true }
    });

    res.json({
      records,
      total,
      balance: balance._sum.amount || 0
    });
  } catch (error: any) {
    console.error('Get fish history error:', error);
    res.status(500).json({ error: '获取鱼干记录失败' });
  }
});

export default router;
