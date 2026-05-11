# 喵了个咪后端服务

P5后端部署服务，基于 PostgreSQL + Prisma + Express + JWT 构建。

## 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| 数据库 | PostgreSQL | 序列号并发需要行锁 |
| ORM | Prisma | 类型安全，迁移管理 |
| 后端框架 | Node.js + Express | 与前端同语言 |
| 认证 | JWT | 无状态认证 |

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，配置数据库连接信息
```

### 3. 初始化数据库

```bash
# 生成Prisma Client
npm run prisma:generate

# 执行数据库迁移
npm run prisma:migrate
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3000 启动。

## 生产部署

### 使用Docker

```bash
# 构建镜像
docker build -t miaolegemi-server .

# 运行容器
docker run -p 3000:3000 --env-file .env miaolegemi-server
```

### 使用PM2

```bash
# 构建
npm run build

# 启动生产服务
pm2 start dist/index.js --name miaolegemi
```

## API 文档

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册用户 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户信息 |
| PUT | /api/auth/nickname | 更新昵称 |

### 猫咪接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/cats/battle | 获取出战席猫咪 |
| GET | /api/cats/home | 获取家园猫咪 |
| GET | /api/cats/bag | 获取包裹区猫咪 |
| GET | /api/cats/:id | 获取猫咪详情 |
| POST | /api/cats/:id/adopt | 领养猫咪 |
| POST | /api/cats/:id/deploy | 部署猫咪 |
| POST | /api/cats/:id/withdraw | 撤回猫咪 |
| POST | /api/cats/:id/feed | 喂食猫咪 |
| POST | /api/cats/:id/feed-all | 批量喂食 |
| POST | /api/cats/:id/release | 送走猫咪 |
| GET | /api/cats/:serialId/lineage | 获取血统记录 |

### 抽卡接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/gacha/pull | 抽卡（单抽/十连） |
| GET | /api/gacha/pity | 保底进度 |
| GET | /api/gacha/species | 猫咪品种列表 |

### 游戏接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/game/start | 开始游戏 |
| POST | /api/game/end | 提交游戏结果 |
| GET | /api/game/leaderboard/today | 今日榜单 |
| GET | /api/game/history | 历史战绩 |

### 用户接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/user/stats | 用户统计 |
| GET | /api/user/milestones | 里程碑进度 |
| GET | /api/user/fish-history | 鱼干账本 |

## 前端集成

前端通过 `api.js` 文件与后端通信：

```html
<script src="api.js"></script>
```

使用示例：

```javascript
// 登录
const data = await MiaolegemiAPI.login('username', 'password');

// 抽卡
const result = await MiaolegemiAPI.pullGacha('single');

// 获取猫咪列表
const cats = await MiaolegemiAPI.getCats();
```

## 数据库表

详见 `prisma/schema.prisma`

- `User` - 用户表
- `CatSpecies` - 猫咪品种（12种）
- `CatSerialRegistry` - 序列号注册表
- `PlayerCat` - 玩家持有的猫
- `CatLineage` - 血统记录
- `FishLedger` - 鱼干账本
- `GameSession` - 游戏记录
- `DailyBoard` - 每日棋盘
- `UserMilestone` - 用户里程碑

## 关键设计

### 鱼干账本

使用账本模式而非余额字段，防止篡改：
```javascript
const balance = await prisma.fishLedger.aggregate({
  where: { userId },
  _sum: { amount: true }
});
```

### 序列号并发

使用行锁保证序列号分配安全：
```sql
SELECT * FROM cat_serial_registry
WHERE species_id = ? AND status = 'available'
ORDER BY serial_number ASC
LIMIT 1
FOR UPDATE SKIP LOCKED
```

### 保底机制

100抽必出SSR，通过 `pityCount` 字段追踪。

## 许可证

MIT
