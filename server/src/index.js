require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const catsRoutes = require('./routes/cats');
const gachaRoutes = require('./routes/gacha');
const gameRoutes = require('./routes/game');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/cats', catsRoutes);
app.use('/api/gacha', gachaRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/user', userRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`喵了个咪后端服务运行中: http://localhost:${PORT}`);
});
