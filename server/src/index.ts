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
const PORT = process.env.PORT;

if (!PORT) {
  throw new Error("PORT not provided by Railway");
}

// 中间件
app.use(compression()); // Gzip/Brotli 压缩，HTML/CSS/JS 体积减少 70%+
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// 健康检查（最早注册，不受任何中间件影响）
app.get('/health', (req, res) => {
  console.log('→ /health 被请求');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 首页（兜底）
app.get('/', (req, res) => {
  console.log('→ / 被请求');
  res.send('OK - 喵了个咪后端运行中');
});

// 诊断：每30秒打印一次，证明进程存活
setInterval(() => {
  console.log('💓 进程存活 -', new Date().toISOString());
}, 30000);

// ═══ API路由（必须在静态文件之前） ═══
app.use('/api/auth', authRoutes);
app.use('/api/cats', catRoutes);
app.use('/api/gacha', gachaRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/user', userRoutes);
app.use('/api/personalities', personalityRoutes);
app.use('/api/user', checkinRoutes);

// ═══ 托管前端静态文件（放最后，兜底） ═══
const staticDir = path.resolve(process.cwd(), '..');
app.use(express.static(staticDir));

// ═══ 全局错误处理（必须是最后一个中间件） ═══
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 启动前测试数据库连接
prisma.$connect()
  .then(() => console.log('  📦 数据库连接成功'))
  .catch(err => console.error('  ❌ 数据库连接失败:', err.message));

// 启动服务器
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log("Server running on", PORT);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
