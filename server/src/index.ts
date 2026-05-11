// P5: 喵了个咪后端服务入口
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// 路由
import authRoutes from './routes/auth.js';
import catRoutes from './routes/cats.js';
import gachaRoutes from './routes/gacha.js';
import gameRoutes from './routes/game.js';
import userRoutes from './routes/user.js';

// 加载环境变量
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// 全局错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/cats', catRoutes);
app.use('/api/gacha', gachaRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/user', userRoutes);

// 启动服务器
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║     🐱 喵了个咪 后端服务启动成功      ║
  ║                                      ║
  ║  Port: ${PORT}                           ║
  ║  Env:  ${process.env.NODE_ENV || 'development'}                    ║
  ╚════════════════════════════════════════╝
  `);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
