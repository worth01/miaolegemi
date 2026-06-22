// P5: 猫咪路由
import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 获取出战席猫咪
router.get('/battle', authMiddleware, async (req, res) => {
  try {
    const cats = await prisma.player_cats.findMany({
      where: {
        ownerId: req.user!.userId,
        location: 'battle'
      },
      include: {
        cat_serial_registry: {
          include: {
            cat_species: true
          }
        }
      },
      orderBy: { slotPosition: 'asc' }
    });

    res.json({ cats });
  } catch (error: any) {
    console.error('Get battle cats error:', error);
    res.status(500).json({ error: '获取出战席猫咪失败' });
  }
});

// 获取家园猫咪
router.get('/home', authMiddleware, async (req, res) => {
  try {
    const cats = await prisma.player_cats.findMany({
      where: {
        ownerId: req.user!.userId,
        location: 'home'
      },
      include: {
        cat_serial_registry: {
          include: {
            cat_species: true
          }
        }
      },
      orderBy: [
        { slotPosition: 'asc' },
        { intimacy: 'desc' }
      ]
    });

    res.json({ cats });
  } catch (error: any) {
    console.error('Get home cats error:', error);
    res.status(500).json({ error: '获取家园猫咪失败' });
  }
});

// 获取包裹区猫咪
router.get('/bag', authMiddleware, async (req, res) => {
  try {
    const cats = await prisma.player_cats.findMany({
      where: {
        ownerId: req.user!.userId,
        location: 'bag'
      },
      include: {
        cat_serial_registry: {
          include: {
            cat_species: true
          }
        }
      },
      orderBy: { bagExpiresAt: 'asc' }
    });

    // 过滤已过期的猫咪
    const now = new Date();
    const validCats = cats.filter(cat => !cat.bagExpiresAt || cat.bagExpiresAt > now);
    const expiredCats = cats.filter(cat => cat.bagExpiresAt && cat.bagExpiresAt <= now);

    // 自动删除过期猫咪
    if (expiredCats.length > 0) {
      await prisma.player_cats.deleteMany({
        where: {
          id: { in: expiredCats.map(c => c.id) }
        }
      });
    }

    res.json({ cats: validCats });
  } catch (error: any) {
    console.error('Get bag cats error:', error);
    res.status(500).json({ error: '获取包裹区猫咪失败' });
  }
});

// 猫咪详情
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const cat = await prisma.player_cats.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.userId
      },
      include: {
        cat_serial_registry: {
          include: {
            cat_species: true,
            users_cat_serial_registry_firstOwnerIdTousers: {
              select: { nickname: true }
            },
            cat_lineage: {
              orderBy: { dateLeft: 'desc' },
              take: 10
            }
          }
        }
      }
    });

    if (!cat) {
      return res.status(404).json({ error: '猫咪不存在' });
    }

    res.json({ cat });
  } catch (error: any) {
    console.error('Get cat detail error:', error);
    res.status(500).json({ error: '获取猫咪详情失败' });
  }
});

// 领养（包裹区→家园）
router.post('/:id/adopt', authMiddleware, async (req, res) => {
  try {
    const cat = await prisma.player_cats.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.userId,
        location: 'bag'
      }
    });

    if (!cat) {
      return res.status(404).json({ error: '猫咪不存在或不在包裹区' });
    }

    // 检查冷却期
    if (cat.coolingUntil && cat.coolingUntil > new Date()) {
      return res.status(400).json({ error: '猫咪仍在冷却期，请稍后再试' });
    }

    // 检查家园是否有空位
    const homeCount = await prisma.player_cats.count({
      where: {
        ownerId: req.user!.userId,
        location: 'home'
      }
    });

    if (homeCount >= 6) {
      return res.status(400).json({ error: '家园已满（最多6只），请先送走或部署猫咪' });
    }

    // 领养
    const updatedCat = await prisma.player_cats.update({
      where: { id: cat.id },
      data: {
        location: 'home',
        bagExpiresAt: null,
        acquiredAt: new Date(),
        intimacy: 0,
        daysAlive: 0,
        gamesWitnessed: 0,
        bestCombo: 0,
        fishSpent: 0,
        coolingUntil: null
      },
      include: {
        cat_serial_registry: {
          include: { cat_species: true }
        }
      }
    });

    // 如果是创世区猫咪，更新首次发现者
    if (cat.serialId) {
      const serial = await prisma.cat_serial_registry.findUnique({
        where: { id: cat.serialId }
      });
      
      if (serial && !serial.firstOwnerId) {
        await prisma.cat_serial_registry.update({
          where: { id: serial.id },
          data: { firstOwnerId: req.user!.userId }
        });
      }
    }

    res.json({ message: '领养成功', cat: updatedCat });
  } catch (error: any) {
    console.error('Adopt cat error:', error);
    res.status(500).json({ error: '领养失败' });
  }
});

// 上场（家园→出战席）
router.post('/:id/deploy', authMiddleware, async (req, res) => {
  try {
    const { slot } = req.body; // 1-3号位

    if (!slot || slot < 1 || slot > 4) {
      return res.status(400).json({ error: '请选择1-3号出战位' });
    }

    const cat = await prisma.player_cats.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.userId,
        location: 'home'
      }
    });

    if (!cat) {
      return res.status(404).json({ error: '猫咪不存在或不在家园' });
    }

    // 检查该槽位是否已被占用
    const existingCat = await prisma.player_cats.findFirst({
      where: {
        ownerId: req.user!.userId,
        location: 'battle',
        slotPosition: slot
      }
    });

    if (existingCat) {
      // 交换：将原位置的猫移回家园
      await prisma.player_cats.update({
        where: { id: existingCat.id },
        data: { location: 'home' }
      });
    }

    // 部署到出战席
    const updatedCat = await prisma.player_cats.update({
      where: { id: cat.id },
      data: {
        location: 'battle',
        slotPosition: slot
      },
      include: {
        cat_serial_registry: {
          include: { cat_species: true }
        }
      }
    });

    res.json({ message: '部署成功', cat: updatedCat });
  } catch (error: any) {
    console.error('Deploy cat error:', error);
    res.status(500).json({ error: '部署失败' });
  }
});

// 撤回（出战席→家园）
router.post('/:id/withdraw', authMiddleware, async (req, res) => {
  try {
    const cat = await prisma.player_cats.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.userId,
        location: 'battle'
      }
    });

    if (!cat) {
      return res.status(404).json({ error: '猫咪不存在或不在出战席' });
    }

    const updatedCat = await prisma.player_cats.update({
      where: { id: cat.id },
      data: {
        location: 'home',
        slotPosition: null
      },
      include: {
        cat_serial_registry: {
          include: { cat_species: true }
        }
      }
    });

    res.json({ message: '撤回成功', cat: updatedCat });
  } catch (error: any) {
    console.error('Withdraw cat error:', error);
    res.status(500).json({ error: '撤回失败' });
  }
});

// 喂食
router.post('/:id/feed', authMiddleware, async (req, res) => {
  try {
    const cat = await prisma.player_cats.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.userId,
        location: { in: ['home', 'battle'] }
      }
    });

    if (!cat) {
      return res.status(404).json({ error: '猫咪不存在' });
    }

    // 扣除鱼干
    const fishBalance = await prisma.fish_ledger.aggregate({
      where: { userId: req.user!.userId },
      _sum: { amount: true }
    });

    if ((fishBalance._sum.amount || 0) < 1) {
      return res.status(400).json({ error: '鱼干不足，需要1鱼干喂食' });
    }

    // 记录鱼干消耗
    await prisma.fish_ledger.create({
      data: {
        userId: req.user!.userId,
        amount: -1,
        reason: 'feed',
        relatedId: cat.id
      }
    });

    // 增加亲密度
    const newIntimacy = Math.min(100, cat.intimacy + 5);

    const updatedCat = await prisma.player_cats.update({
      where: { id: cat.id },
      data: {
        intimacy: newIntimacy,
        lastFedAt: new Date(),
        fishSpent: cat.fishSpent + 1
      },
      include: {
        cat_serial_registry: {
          include: { cat_species: true }
        }
      }
    });

    res.json({ 
      message: `喂食成功，亲密度+5（当前${newIntimacy}）`, 
      cat: updatedCat,
      intimacyGained: 5
    });
  } catch (error: any) {
    console.error('Feed cat error:', error);
    res.status(500).json({ error: '喂食失败' });
  }
});

// 批量喂食（一键补满亲密度）
router.post('/:id/feed-all', authMiddleware, async (req, res) => {
  try {
    const cat = await prisma.player_cats.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.userId,
        location: { in: ['home', 'battle'] }
      }
    });

    if (!cat) {
      return res.status(404).json({ error: '猫咪不存在' });
    }

    // 计算需要多少鱼干补满
    const neededFish = Math.ceil((100 - cat.intimacy) / 5);

    // 扣除鱼干
    const fishBalance = await prisma.fish_ledger.aggregate({
      where: { userId: req.user!.userId },
      _sum: { amount: true }
    });

    const actualFish = Math.min(fishBalance._sum.amount || 0, neededFish);
    const intimacyToAdd = actualFish * 5;

    if (actualFish <= 0) {
      return res.status(400).json({ error: '鱼干不足' });
    }

    // 记录鱼干消耗
    await prisma.fish_ledger.create({
      data: {
        userId: req.user!.userId,
        amount: -actualFish,
        reason: 'feed',
        relatedId: cat.id
      }
    });

    // 补满亲密度
    const newIntimacy = Math.min(100, cat.intimacy + intimacyToAdd);

    const updatedCat = await prisma.player_cats.update({
      where: { id: cat.id },
      data: {
        intimacy: newIntimacy,
        lastFedAt: new Date(),
        fishSpent: cat.fishSpent + actualFish
      },
      include: {
        cat_serial_registry: {
          include: { cat_species: true }
        }
      }
    });

    res.json({ 
      message: `喂食成功，使用${actualFish}鱼干，亲密度+${intimacyToAdd}（当前${newIntimacy}）`, 
      cat: updatedCat,
      fishSpent: actualFish,
      intimacyGained: intimacyToAdd
    });
  } catch (error: any) {
    console.error('Feed all cat error:', error);
    res.status(500).json({ error: '喂食失败' });
  }
});

// 送走（家园→告别）
router.post('/:id/release', authMiddleware, async (req, res) => {
  try {
    const cat = await prisma.player_cats.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.userId,
        location: 'home'
      }
    });

    if (!cat) {
      return res.status(404).json({ error: '猫咪不存在或不在家园' });
    }

    const now = new Date();

    // 记录血统
    await prisma.cat_lineage.create({
      data: {
        serialId: cat.serialId,
        ownerId: req.user!.userId,
        nickname: req.user!.username,
        daysLived: cat.daysAlive,
        fishSpent: cat.fishSpent,
        bestCombo: cat.bestCombo,
        intimacy: cat.intimacy,
        releaseType: '主动送走',
        dateLeft: now
      }
    });

    // 进入冷却期（60天）
    const coolingUntil = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const updatedCat = await prisma.player_cats.update({
      where: { id: cat.id },
      data: {
        location: 'memorial',
        releasedAt: now,
        coolingUntil
      }
    });

    // 更新序列号状态
    await prisma.cat_serial_registry.update({
      where: { id: cat.serialId },
      data: {
        status: 'cooling',
        currentOwnerId: null,
        availableAfter: coolingUntil
      }
    });

    // 更新里程碑
    await prisma.user_milestones.update({
      where: { userId: req.user!.userId },
      data: {
        catsReleased: { increment: 1 }
      }
    });

    res.json({ 
      message: '送走成功，60天后猫咪将重新进入抽卡池', 
      cat: updatedCat,
      coolingUntil
    });
  } catch (error: any) {
    console.error('Release cat error:', error);
    res.status(500).json({ error: '送走失败' });
  }
});

// 序列号血统记录
router.get('/:serialId/lineage', authMiddleware, async (req, res) => {
  try {
    const lineage = await prisma.cat_lineage.findMany({
      where: { serialId: req.params.serialId },
      include: {
        users: {
          select: { nickname: true }
        }
      },
      orderBy: { dateLeft: 'desc' }
    });

    res.json({ lineage });
  } catch (error: any) {
    console.error('Get lineage error:', error);
    res.status(500).json({ error: '获取血统记录失败' });
  }
});

export default router;
