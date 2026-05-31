// P5: 认证路由
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { generateCatNickname, generateUsername } from '../utils/nickname.js';

const router = Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度需在3-20字符之间' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    // 检查用户是否存在
    const existingUser = await prisma.users.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.users.create({
      data: {
        username,
        password: hashedPassword,
        nickname: generateCatNickname()
      }
    });

    // 创建用户里程碑记录
    await prisma.user_milestones.create({
      data: { userId: user.id }
    });

    // 初始鱼干
    await prisma.fish_ledger.create({
      data: {
        userId: user.id,
        amount: 100,
        reason: 'initial',
        relatedId: null
      }
    });

    // 50% 概率赠送 SSR 幸运猫
    if (Math.random() < 0.5) {
      try {
        const luckyBreed = await prisma.cat_species.findFirst({
          where: { name: '幸运猫' }
        });
        if (luckyBreed) {
          const serial = await prisma.cat_serial_registry.create({
            data: {
              speciesId: luckyBreed.id,
              serialNumber: await prisma.cat_serial_registry.count({ where: { speciesId: luckyBreed.id } }) + 1,
              status: 'adopted',
              currentOwnerId: user.id,
              firstOwnerId: user.id,
            }
          });
          await prisma.player_cats.create({
            data: {
              ownerId: user.id,
              serialId: serial.id,
              location: 'home',
              personality: { primary: '吃货', secondary: null },
              acquiredAt: new Date(),
            }
          });
          console.log(`🎁 新用户 ${username} 获得幸运猫！`);
        }
      } catch (e) {
        console.error('赠送幸运猫失败:', e);
      }
    }

    // 生成Token
    const token = generateToken({
      userId: user.id,
      username: user.username
    });

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname
      }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = await prisma.users.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成Token
    const token = generateToken({
      userId: user.id,
      username: user.username
    });

    // 获取用户鱼干余额
    const fishBalance = await prisma.fish_ledger.aggregate({
      where: { userId: user.id },
      _sum: { amount: true }
    });

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname
      },
      fishBalance: fishBalance._sum.amount || 0
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        pityCount: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取鱼干余额
    const fishBalance = await prisma.fish_ledger.aggregate({
      where: { userId: user.id },
      _sum: { amount: true }
    });

    // 获取里程碑
    const milestones = await prisma.user_milestones.findUnique({
      where: { userId: user.id }
    });

    res.json({
      ...user,
      fishBalance: fishBalance._sum.amount || 0,
      milestones
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 更新昵称
router.put('/nickname', authMiddleware, async (req, res) => {
  try {
    const { nickname } = req.body;

    if (!nickname || typeof nickname !== 'string') {
      return res.status(400).json({ error: '请输入昵称' });
    }

    // 特殊字符验证：只允许中文、字母、数字、下划线
    if (!/^[一-鿿㐀-䶿a-zA-Z0-9_]+$/.test(nickname)) {
      return res.status(400).json({ error: '昵称只能包含中文、字母、数字和下划线' });
    }

    if (nickname.length < 2 || nickname.length > 10) {
      return res.status(400).json({ error: '昵称长度需在2-10字符之间' });
    }

    // 检查当前用户
    const currentUser = await prisma.users.findUnique({
      where: { id: req.user!.userId },
      select: { nickname: true, lastNicknameChange: true }
    });
    if (!currentUser) return res.status(404).json({ error: '用户不存在' });

    // 检查昵称是否被占用
    if (nickname !== currentUser.nickname) {
      const existing = await prisma.users.findFirst({
        where: { nickname, id: { not: req.user!.userId } }
      });
      if (existing) {
        return res.status(409).json({ error: '该名称已经被占用，请重新输入' });
      }

      // 1个月限制
      if (currentUser.lastNicknameChange) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        if (new Date(currentUser.lastNicknameChange) > oneMonthAgo) {
          return res.status(429).json({ error: '1个月内仅支持修改一次昵称，请稍后再试' });
        }
      }
    }

    const user = await prisma.users.update({
      where: { id: req.user!.userId },
      data: { nickname, lastNicknameChange: new Date() },
      select: { id: true, username: true, nickname: true }
    });

    res.json({ message: '昵称更新成功', user });
  } catch (error: any) {
    console.error('Update nickname error:', error);
    res.status(500).json({ error: '更新昵称失败' });
  }
});

export default router;
