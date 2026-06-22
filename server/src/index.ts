// P5: 喵了个咪后端服务入口
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

console.log('APP STARTING...');
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

// 路由
import authRoutes from './routes/auth.js';
import catRoutes from './routes/cats.js';
import gachaRoutes from './routes/gacha.js';
import gameRoutes from './routes/game.js';
import userRoutes from './routes/user.js';
import personalityRoutes from './routes/personalities.js';
import checkinRoutes from './routes/checkin.js';

// 加载环境变量
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || '3001';
if (!PORT) throw new Error('No PORT — Railway 部署时必须注入 PORT 环境变量');

// 中间件
app.use(compression()); // Gzip/Brotli 压缩，HTML/CSS/JS 体积减少 70%+
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// 托管前端静态文件（手机通过局域网访问时只需一个端口）
const staticDir = path.resolve(process.cwd(), '..');
app.use(express.static(staticDir));

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
app.use('/api/personalities', personalityRoutes);
app.use('/api/user', checkinRoutes);

// 启动前测试数据库连接
prisma.$connect()
  .then(() => console.log('  📦 数据库连接成功'))
  .catch(err => console.error('  ❌ 数据库连接失败:', err.message));

// 启动服务器
app.listen(parseInt(PORT, 10), '0.0.0.0', () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║     🐱 喵呜乐消消 后端服务启动成功          ║
  ║                                        ║
  ║  Port: ${PORT}                           ║
  ║  Env:  ${process.env.NODE_ENV || 'development'}           ║
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
