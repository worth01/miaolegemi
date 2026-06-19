// P5: 性格路由
import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

// 获取所有性格数据
router.get('/', async (req, res) => {
  try {
    const personalities = await prisma.cat_personalities.findMany({
      orderBy: { personalityId: 'asc' },
    });
    res.json(personalities);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取性格数据失败' });
  }
});

// 按 ID 获取性格
router.get('/:id', async (req, res) => {
  try {
    const personality = await prisma.cat_personalities.findUnique({
      where: { personalityId: parseInt(req.params.id) },
    });
    if (!personality) return res.status(404).json({ error: '性格不存在' });
    res.json(personality);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取性格失败' });
  }
});

export default router;
