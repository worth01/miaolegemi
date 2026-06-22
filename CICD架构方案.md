# 🏗️ 喵了个咪 — 完整 CI/CD 架构方案

> 版本：v1.0  
> 日期：2026-06-22  
> 作者：Claude Code  
> 适用项目：喵了个咪（喵呜乐消消）

---

## 目录

- [一、项目现状诊断](#一项目现状诊断)
- [二、分支模型（GitHub Flow 升级版）](#二分支模型github-flow-升级版)
- [三、完整 CI/CD 流水线](#三完整-cicd-流水线)
- [四、数据库迁移策略](#四数据库迁移策略重要)
- [五、多环境配置管理](#五多环境配置管理)
- [六、npm Scripts 标准化](#六npm-scripts-标准化)
- [七、目录结构优化](#七目录结构优化)
- [八、Release 管理](#八release-管理)
- [九、回滚策略](#九回滚策略)
- [十、监控（最小化）](#十监控最小化)
- [十一、安全清单](#十一安全清单)
- [十二、实施路线图](#十二实施路线图)
- [十三、常见问题 FAQ](#十三常见问题-faq)

---

## 一、项目现状诊断

| 维度 | 当前状态 | 问题 |
|------|---------|------|
| 代码仓库 | `worth01/miaolegemi`，仅 `main` 分支 | 缺 `dev` 分支保护 |
| 部署 | Railway，已绑定 main | 有一个 `railway.toml`，已能跑 ✅ |
| 构建 | Babel 编译 JSX（`build.js`） | `tsc` 不通过，但 `tsx` 能跑 |
| 后端 | Express + Prisma + PostgreSQL | 缺迁移策略 |
| CI | 无 | 零自动化 |
| Git Hooks | 无 | 本地无质量门禁 |
| 静态资源 | 41MB assets，两个 ~500KB HTML | Service Worker 缓存策略可用 |
| 域名 | `mwlxx.qzz.io` | 已绑定 ✅ |

### 前端技术栈

- **运行时**：React（Babel Standalone 浏览器内编译）
- **构建**：Babel CLI（`build.js` 预编译 JSX → 普通 JS）
- **文件**：`index.html`（首页 ~560KB）+ `猫咪消消乐.html`（游戏页 ~500KB）
- **缓存**：Service Worker（`sw.js`，当前 v6）
- **存储**：localStorage（主）+ 后端 API（备份/同步）

### 后端技术栈

- **运行时**：Express + `tsx`（TypeScript 直接运行）
- **ORM**：Prisma + PostgreSQL
- **认证**：JWT（`jsonwebtoken`）
- **部署**：Railway（Nixpacks 构建）

---

## 二、分支模型（GitHub Flow 升级版）

### 2.1 分支结构

```
main ─────────────────────●────●──────●────── 生产环境 (mwlxx.qzz.io)
                           \       /
dev  ──────●──●──●─────────●─────●────────── 开发集成分支
            \     \       /
feature/*   ●     ●─────●                    临时功能分支
```

### 2.2 分支职责

| 分支 | 用途 | 谁可以 push | 部署到哪里 |
|------|------|------------|-----------|
| `main` | 生产代码 | 仅通过 PR 合并 | Railway Production → `mwlxx.qzz.io` |
| `dev` | 日常集成 | 直接 push（个人项目） | 本地测试 |
| `feature/*` | 单功能开发 | 直接 push | 本地 / PR Preview |

### 2.3 分支保护规则

**GitHub → Settings → Branches → Add Rule → `main`：**

| 规则 | 状态 | 说明 |
|------|------|------|
| Require a pull request before merging | ✅ 开启 | 禁止直接 push main |
| Require status checks to pass | ✅ 开启 | CI 通过才能合并 |
| Require conversation resolution | ✅ 开启 | PR 讨论必须解决 |
| Require approvals | ❌ 关闭 | 个人项目不需要 |
| Do not allow bypassing the above | ✅ 开启 | 管理员也不能绕过 |

**`dev` 分支**：无需保护规则，灵活为王。

### 2.4 开发流程

```
🧑‍💻 日常开发流程：

1. git checkout dev
2. git checkout -b feature/智能提醒系统
3. 开发 + 本地测试
4. git push origin feature/智能提醒系统
5. GitHub 创建 PR：feature/智能提醒系统 → dev
6. Railway 自动生成 Preview 环境
7. 在 Preview 环境测试
8. 合并 PR 到 dev

🚀 发布流程：

1. 在 dev 上确认所有功能正常
2. 创建 PR：dev → main
3. CI 自动检查
4. 合并 → Railway 自动部署到生产
5. 验证线上环境
```

---

## 三、完整 CI/CD 流水线

### 3.1 流水线全景

```
┌─────────────────────────────────────────────────────────┐
│                    本地开发 (pre-commit)                  │
│  git commit 触发                                         │
│  ├─ ① 代码格式化检查                                     │
│  ├─ ② Babel 编译检查（build.js --check）                │
│  ├─ ③ tsc --noEmit 类型检查（仅 server/）               │
│  └─ ④ .env 文件泄露检查                                 │
├─────────────────────────────────────────────────────────┤
│                    PR 自动化 (GitHub Actions)             │
│  pull_request → main/dev 触发                            │
│  ├─ typecheck：server 类型检查                           │
│  ├─ frontend-check：Babel 构建验证                       │
│  └─ security-check：敏感文件泄露检查                     │
├─────────────────────────────────────────────────────────┤
│                    自动部署 (Railway)                     │
│  PR 创建 → Preview 环境                                  │
│  合并 main → Production 部署                             │
│  PR 关闭 → Preview 自动销毁                              │
├─────────────────────────────────────────────────────────┤
│                    部署后验证 (GitHub Actions)            │
│  Health check → curl /health                            │
│  Auth check → curl /api/auth/me                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 GitHub Actions — CI 工作流

**文件：`.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main, dev]
  push:
    branches: [dev]

jobs:
  # ═══ 后端类型检查 ═══
  typecheck:
    name: TypeScript 类型检查
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./server
    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: server/package-lock.json

      - name: 安装依赖
        run: npm ci

      - name: 生成 Prisma Client
        run: npx prisma generate

      - name: 类型检查
        run: npx tsc --noEmit

  # ═══ 前端构建验证 ═══
  frontend-check:
    name: 前端构建验证
    runs-on: ubuntu-latest
    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: 安装依赖
        run: npm ci

      - name: Babel 构建验证
        run: npm run build -- --check

  # ═══ 安全检查 ═══
  security-check:
    name: 安全检查
    runs-on: ubuntu-latest
    steps:
      - name: 检出代码
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 检查敏感文件泄露
        run: |
          echo "🔍 检查 .env 文件是否被提交..."
          FILES=$(git diff --name-only origin/main HEAD)
          if echo "$FILES" | grep -qE '(\.env$|\.env\.local$)'; then
            echo "❌ 发现 .env 文件！这些文件包含敏感信息，禁止提交。"
            echo "请添加到 .gitignore 并删除已跟踪的文件。"
            exit 1
          fi
          echo "✅ 未发现敏感文件泄露"

      - name: 检查密钥硬编码
        run: |
          echo "🔍 检查密钥硬编码..."
          if grep -r "JWT_SECRET.*=.*[a-zA-Z0-9]\{20,\}" server/src/ --include="*.ts" 2>/dev/null; then
            echo "⚠️  警告：发现疑似硬编码密钥，请使用环境变量"
          else
            echo "✅ 未发现密钥硬编码"
          fi
```

### 3.3 GitHub Actions — 部署后验证

**文件：`.github/workflows/deploy-check.yml`**

```yaml
name: Deploy Verification

on:
  deployment_status:
    branches: [main]

jobs:
  smoke-test:
    name: 冒烟测试
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - name: 健康检查
        run: |
          echo "🏥 健康检查 https://mwlxx.qzz.io/health"
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://mwlxx.qzz.io/health)
          if [ "$STATUS" != "200" ]; then
            echo "❌ 健康检查失败：HTTP $STATUS"
            exit 1
          fi
          echo "✅ 健康检查通过"

      - name: API 检查
        run: |
          echo "🔌 检查 API 可达性..."
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://mwlxx.qzz.io/api/auth/me)
          echo "Auth endpoint 返回 HTTP $STATUS"
          echo "✅ 服务正常运行"
```

### 3.4 本地 Git Hooks — pre-commit

**安装 husky + lint-staged：**

```bash
npm install --save-dev husky lint-staged
npx husky install
```

**`.husky/pre-commit`：**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 pre-commit 检查..."

# 检查 .env 文件
if git diff --cached --name-only | grep -qE '(\.env$|\.env\.local$)'; then
  echo "❌ 不允许提交 .env 文件！"
  exit 1
fi

echo "✅ 检查通过"
```

**`package.json` 中添加：**

```json
{
  "lint-staged": {
    "*.{ts,js}": [],
    ".env*": [
      "echo '❌ 不允许提交 .env 文件' && exit 1"
    ]
  }
}
```

---

## 四、数据库迁移策略（重要！）

### 4.1 Railway 部署流程

```
┌─────────────────────────────────────────┐
│          Railway 每次部署执行             │
├─────────────────────────────────────────┤
│  1. npm install                         │
│  2. npx prisma generate   ← 生成 Client │
│  3. npx prisma migrate deploy ← 迁移 DB │
│  4. npx tsx src/index.ts  ← 启动服务    │
└─────────────────────────────────────────┘
```

### 4.2 迁移命令对照

| 命令 | 用途 | 环境 |
|------|------|------|
| `npx prisma migrate dev --name xxx` | 创建迁移文件 | 本地开发 |
| `npx prisma migrate deploy` | 执行未应用的迁移（幂等、安全） | 生产部署 |
| `npx prisma db push` | 直接同步 Schema（跳过迁移文件） | 仅快速原型 |
| `npx prisma migrate status` | 查看迁移状态 | 部署前检查 |

### 4.3 关键规则

| 规则 | 说明 |
|------|------|
| ✅ 永远用 `migrate deploy` | 不在生产环境用 `db push`（可能丢数据） |
| ✅ 迁移文件提交到 Git | `prisma/migrations/` 必须进仓库 |
| ❌ 禁止 `db push --accept-data-loss` | 当前根目录 `railway.toml` 里有这个，非常危险 |
| ✅ 改 Schema 流程 | 本地 `migrate dev --name xxx` → 提交迁移文件 → PR → 合并 |

### 4.4 当前问题修正

**现在的根目录 `railway.toml`（危险）：**
```toml
[deploy]
startCommand = "cd server && npx prisma db push --accept-data-loss && npx tsx src/index.ts"
```

**应改为 `server/railway.toml`（安全）：**
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "cd server && npx prisma generate && npx prisma migrate deploy && npx tsx src/index.ts"
healthcheckPath = "/"
healthcheckTimeout = 30
```

---

## 五、多环境配置管理

### 5.1 环境变量分层

```
环境变量来源（优先级从低到高）：

┌──────────────────────────────────────────────────────────┐
│  🔒 GitHub Secrets         DATABASE_URL, JWT_SECRET      │
│     (CI 用不到，Railway 从自己面板读取)                   │
├──────────────────────────────────────────────────────────┤
│  🟡 .env.local             本地开发专用                   │
│     (gitignore，不提交)                                   │
├──────────────────────────────────────────────────────────┤
│  🟡 .env.example           模板文件                       │
│     (提交到 Git，不含真实值)                              │
├──────────────────────────────────────────────────────────┤
│  🟢 Railway Dashboard      生产环境                       │
│     NODE_ENV=production                                  │
│     DATABASE_URL=postgresql://...                        │
│     JWT_SECRET=xxx                                       │
│     PORT=3001                                            │
├──────────────────────────────────────────────────────────┤
│  🔵 Railway Preview        预览环境（自动注入）           │
│     DATABASE_URL=postgresql://... (独立数据库)            │
│     NODE_ENV=preview                                     │
└──────────────────────────────────────────────────────────┘
```

### 5.2 .env.example 模板

```
# 数据库连接（必填）
DATABASE_URL=postgresql://user:password@host:5432/miaolegemi

# JWT 签名密钥（必填）
JWT_SECRET=change-me-to-a-random-string

# 服务端口（可选，默认 3001）
PORT=3001

# 运行环境（可选）
NODE_ENV=development
```

---

## 六、npm Scripts 标准化

### 6.1 根目录 `package.json`

```json
{
  "name": "miaolegemi",
  "private": true,
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "dev": "concurrently \"node dev.js\" \"cd server && npm run dev\"",
    "dev:frontend": "node dev.js",
    "dev:server": "cd server && npm run dev",
    "build": "node build.js",
    "build:check": "node build.js --check",
    "typecheck": "cd server && npm run typecheck",
    "lint": "cd server && npm run typecheck",
    "prepare": "husky install",
    "postinstall": "cd server && npm install"
  },
  "devDependencies": {
    "@babel/cli": "^7.29.7",
    "@babel/core": "^7.29.7",
    "@babel/preset-react": "^7.29.7",
    "concurrently": "^8.0.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0"
  }
}
```

### 6.2 `server/package.json`

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "start": "npx prisma generate && npx prisma migrate deploy && npx tsx src/index.ts",
    "postinstall": "prisma generate",
    "db:migrate:dev": "npx prisma migrate dev",
    "db:migrate:deploy": "npx prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "tsx src/seed.ts"
  }
}
```

### 6.3 命令速查

| 命令 | 功能 |
|------|------|
| `npm run dev` | 同时启动前端和后端 |
| `npm run dev:frontend` | 仅启动前端开发服务器 |
| `npm run dev:server` | 仅启动后端开发服务器 |
| `npm run build` | Babel 编译 JSX |
| `npm run build:check` | 仅验证构建，不写入文件 |
| `npm run typecheck` | 仅检查 TypeScript 类型，不产出 |
| `npm run lint` | 同上（别名） |

---

## 七、目录结构优化

### 7.1 优化后的目录树

```
喵了个咪/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # PR + push dev 触发
│       └── deploy-check.yml        # 部署后验证
│
├── .husky/
│   └── pre-commit                  # 本地质量门禁
│
├── assets/                         # 静态资源（41MB）
│   ├── cats/                       # 猫咪动画
│   │   ├── ju/                     # 橘猫
│   │   ├── bo/                     # 波斯猫
│   │   └── ...
│   ├── Textures/                   # 贴图
│   ├── sounds/                     # 音效
│   └── ...
│
├── server/
│   ├── src/
│   │   ├── index.ts                # 服务入口
│   │   ├── middleware/
│   │   │   └── auth.ts             # JWT 认证中间件
│   │   ├── routes/
│   │   │   ├── auth.ts             # 认证路由
│   │   │   ├── cats.ts             # 猫咪路由
│   │   │   ├── checkin.ts          # 签到路由
│   │   │   ├── gacha.ts            # 抽卡路由
│   │   │   ├── game.ts             # 游戏路由
│   │   │   ├── personalities.ts    # 性格路由
│   │   │   └── user.ts             # 用户路由
│   │   └── utils/
│   ├── prisma/
│   │   ├── schema.prisma           # 数据模型
│   │   └── migrations/             # ✅ 迁移文件（提交到 Git）
│   │       ├── migration_lock.toml
│   │       └── 20240501000000_init/
│   │           └── migration.sql
│   ├── .env.example                # 环境变量模板
│   ├── package.json
│   ├── railway.toml                # Railway 部署配置
│   └── tsconfig.json
│
├── index.html                      # 首页（~560KB）
├── 猫咪消消乐.html                 # 游戏页（~500KB）
├── api.js                          # 前端 API 封装
├── sw.js                           # Service Worker
├── build.js                        # Babel 构建脚本
├── dev.js                          # 本地开发服务器
├── railway.toml                    # 根 Railway 配置（废弃）
├── package.json                    # 根 package.json
├── README.md
├── .gitignore
└── CICD架构方案.md                 # 本文档
```

### 7.2 `.gitignore` 补全

```gitignore
# ═══ 环境变量（绝对不能上传） ═══
.env
.env.local
.env.production
.env*.local

# ═══ 依赖 ═══
node_modules/
server/node_modules/

# ═══ 系统文件 ═══
.DS_Store
Thumbs.db

# ═══ 日志 ═══
*.log
npm-debug.log*

# ═══ 构建产物 ═══
dist/
build/

# ═══ IDE ═══
.vscode/
.idea/
*.swp
*.swo

# ═══ 临时文件 ═══
_check*.png
_fix_check.png
_gacha_check.png
_final.png
_layout_check.png
_level_check.png
_scale_check.png
_temp_check.png
*.b64
新建文件夹/

# ═══ 私密文档（含截图中的敏感信息） ═══
screenshots/

# ═══ Prisma ═══
# 不忽略 migrations — 这些是数据库迁移的历史记录，必须提交
```

---

## 八、Release 管理

### 8.1 版本号规范

```
v{Major}.{Minor}.{Patch}

v1.0.0  → 初始版本
  ││└── Patch：Bug 修复、小调整
  │└─── Minor：新功能（皮肤系统、提醒系统、新猫咪）
  └──── Major：重大架构变更（关卡系统重构）
```

### 8.2 发布流程

```bash
# Step 1: 从 dev 创建 release 分支
git checkout dev
git pull origin dev
git checkout -b release/v1.2.0

# Step 2: 推送到 GitHub
git push origin release/v1.2.0
# → 创建 PR：release/v1.2.0 → dev
# → Railway 自动生成 Preview 环境

# Step 3: 在 Preview 环境测试
# 访问 https://miaolegemi-pr-XX.up.railway.app
# 验证所有功能正常

# Step 4: 确认无误后，合并到 main
git checkout main
git merge release/v1.2.0
git tag -a v1.2.0 -m "v1.2.0: 智能提醒系统 + 皮肤优化"
git push origin main --tags
# → Railway 自动部署到生产 → mwlxx.qzz.io

# Step 5: 同步 dev
git checkout dev
git merge main
git push origin dev
```

### 8.3 GitHub Release 自动生成（可选）

```yaml
# .github/workflows/release.yml
name: Create Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: 自动生成 Release Notes
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

---

## 九、回滚策略

### 9.1 回滚场景与操作

| 场景 | 操作方式 | 恢复时间 |
|------|---------|---------|
| 刚合并的 PR 有问题 | GitHub → Pull Request → Revert（一键按钮） | 30 秒 |
| 需要回滚到前一个版本 | Railway Dashboard → Deployments → 选择上一个 → Rollback | 2 分钟 |
| 数据库迁移有问题 | 本地 `prisma migrate diff` 生成回滚 SQL → 执行 | 按情况 |
| 代码需要退回 | `git revert <commit-hash>` → push | 3 分钟 |
| 线上紧急 Bug | `git revert` + 跳过 CI flag（管理员权限） | 5 分钟 |

### 9.2 Railway 回滚操作

```
Railway Dashboard → 项目 → Deployments 标签
  └─ 历史部署列表（每个都有时间戳和 commit hash）
      └─ 点击任一历史版本
          └─ "Rollback" 按钮
              └─ 一键回退到该版本 ✅
```

### 9.3 数据库迁移回滚

```bash
# 1. 查看迁移状态
npx prisma migrate status

# 2. 如果上一个迁移有问题，生成回滚 SQL
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > rollback.sql

# 3. 在 Railway 的数据库上手动执行 rollback.sql
# 或通过 Railway CLI
railway run psql -f rollback.sql
```

---

## 十、监控（最小化）

个人项目不需要 Datadog 或 Prometheus，但以下三项必须有：

### 10.1 基础设施监控

| 工具 | 用途 | 费用 |
|------|------|------|
| **Railway 内置日志** | 实时日志、错误追踪 | 免费 ✅ |
| **Railway 部署通知** | 部署成功/失败通知 | 免费 ✅ |
| **UptimeRobot** | 监控网站是否存活 → Telegram 通知 | 免费（50 个站点） |
| **GitHub Issue** | Bug 报告模板（已有） | 免费 ✅ |

### 10.2 UptimeRobot 配置

```
URL: https://mwlxx.qzz.io/health
检查间隔: 5 分钟
告警条件: 连续 2 次失败
通知渠道: Telegram / Email
```

### 10.3 健康检查端点

当前已实现 `/health` 端点，返回：
```json
{
  "status": "ok",
  "timestamp": "2026-06-22T12:00:00.000Z"
}
```

**可扩展为详细检查：**

```typescript
app.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbStatus,
      uptime: process.uptime()
    }
  });
});
```

---

## 十一、安全清单

### 11.1 必须遵守

| 规则 | 检查方式 |
|------|---------|
| ✅ `.env` 绝不提交 | pre-commit hook + CI 检查 |
| ✅ JWT_SECRET 使用强随机字符串 | 至少 32 位随机字符 |
| ✅ DATABASE_URL 仅通过环境变量注入 | Railway Dashboard 设置 |
| ✅ Prisma 不使用 `db push --accept-data-loss` | `railway.toml` 改为 `migrate deploy` |
| ✅ 所有 API 路由（除 `/health` `/api/auth/login` 外）通过 authMiddleware | 人工 review |
| ✅ CORS 限制为已知域名 | 当前 `origin: true` 可收紧 |
| ✅ npm 依赖定期更新 | `npm outdated` 每月检查 |

### 11.2 可选增强

| 功能 | 工具 | 说明 |
|------|------|------|
| 依赖漏洞扫描 | `npm audit` | CI 中添加 |
| 速率限制 | `express-rate-limit` | 防止 API 滥用 |
| Helmet 安全头 | `helmet` | 添加 HTTP 安全头 |

---

## 十二、实施路线图

### 12.1 分步实施

| 步骤 | 内容 | 涉及文件 | 预计时间 | 优先级 |
|------|------|---------|---------|--------|
| **Step 1** | 修复 8 个 TS 类型错误 | `server/src/routes/*.ts`, `auth.ts` | 30 分钟 | 🔴 高 |
| **Step 2** | 创建 `dev` 分支，配置分支保护 | GitHub Settings | 5 分钟 | 🔴 高 |
| **Step 3** | 修正 `railway.toml`（去掉危险命令） | `server/railway.toml` | 2 分钟 | 🔴 高 |
| **Step 4** | 添加 GitHub Actions CI 工作流 | `.github/workflows/ci.yml` | 10 分钟 | 🔴 高 |
| **Step 5** | 标准化 npm scripts | `package.json`, `server/package.json` | 5 分钟 | 🟡 中 |
| **Step 6** | 补全 `.gitignore` | `.gitignore` | 2 分钟 | 🟡 中 |
| **Step 7** | 安装 husky pre-commit hook | `.husky/pre-commit` | 5 分钟 | 🟢 低 |
| **Step 8** | Railway 开启 Preview Deployments | Railway Dashboard | 2 分钟 | 🔴 高 |
| **Step 9** | 添加部署后冒烟测试 | `.github/workflows/deploy-check.yml` | 5 分钟 | 🟢 低 |
| **Step 10** | 设置 UptimeRobot 监控 | UptimeRobot 网站 | 5 分钟 | 🟢 低 |
| **Step 11** | 推送并全链路验证 | — | 10 分钟 | 🔴 高 |

### 12.2 最小可行版本（MVP）

如果时间有限，只做这 4 步就能获得 80% 的好处：

```
Step 1 → Step 3 → Step 4 → Step 8

即：修 TS 错误 → 修正部署配置 → CI 工作流 → Preview Deployments
```

---

## 十三、常见问题 FAQ

### Q1: 为什么不需要 staging 环境？
**A:** staging 的价值在于模拟生产环境供 QA 团队测试。个人项目通过 **PR Preview** 就能达到同样效果 — 每个 PR 自动生成一个和生产配置完全一致的独立环境，测完即销毁。

### Q2: 如果 `tsc` 一直通不过怎么办？
**A:** 短期可以用 `tsx` 运行（跳过编译），但 CI 中的 `tsc --noEmit` 必须通过。8 个 TS 错误主要是 Prisma 类型推断问题，可以通过修正 `include` 语句或在严格模式下使用 `as any` 临时解决。

### Q3: 为什么 `build.js` 不能替代 `tsc`？
**A:** `build.js` 编译的是前端 HTML 中的 JSX（用 Babel），`tsc` 检查的是后端 TypeScript 类型。两者互不替代，分别验证前端和后端。

### Q4: PR Preview 的数据库会不会影响生产数据？
**A:** 不会。Railway Preview 会自动创建一个独立的 PostgreSQL 数据库，Schema 和种子数据由 Prisma 迁移生成，完全隔离。

### Q5: 如果我在 dev 上直接改了代码，要不要同步到 main？
**A:** 不要直接同步。走 PR 流程：`dev → 创建 PR → CI 通过 → 合并到 main`。这样每次变更都有记录和检查。

### Q6: Service Worker 缓存导致线上更新看不到？
**A:** 每次部署前将 `sw.js` 中的 cache version 升级（如 `v6 → v7`），旧缓存会自动清理。可以在 CI 中加入版本号检查。

---

> 📅 创建日期：2026-06-22  
> 📝 适用项目：喵了个咪（喵呜乐消消）  
> 🔗 仓库：https://github.com/worth01/miaolegemi  
> 🌐 生产环境：https://mwlxx.qzz.io
