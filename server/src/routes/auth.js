const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    if (username.length < 3) return res.status(400).json({ error: '用户名至少3个字符' });
    if (password.length < 6) return res.status(400).json({ error: '密码至少6个字符' });

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(409).json({ error: '用户名已存在' });

    const passwordHash = await bcrypt.hash(password, 10);
    const catNames = ['小橘', '煤球', '雪团', '蓝蓝', '布丁', '花花', '暹暹', '福福', '折折', '光光', '波波', '团团', '圆圆', '豆豆', '咪咪'];
    const nickname = catNames[Math.floor(Math.random() * catNames.length)] + Math.floor(Math.random() * 1000);

    const user = await prisma.user.create({
      data: { username, passwordHash, nickname, bells: 3 },
    });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, nickname: user.nickname, bells: user.bells } });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: '注册失败' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: '用户名或密码错误' });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, nickname: user.nickname, bells: user.bells } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: '登录失败' });
  }
});

module.exports = router;
