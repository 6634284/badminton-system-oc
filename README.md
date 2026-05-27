# 羽毛球俱乐部约场 SaaS 系统

多租户 SaaS 平台，为羽毛球俱乐部提供活动报名、会员管理、钱包支付、商城等功能。

## 技术栈

### 后端
- **框架**: NestJS 10 + Fastify Adapter
- **语言**: TypeScript 5
- **数据库**: PostgreSQL 16 + Prisma ORM
- **缓存**: Redis 7
- **队列**: BullMQ
- **认证**: JWT + Passport

### 前端
- **后台管理**: React 18 + Vite 5 + Ant Design 5
- **C端**: Taro 4 (小程序 + H5 + iOS + Android)

### 基础设施
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx + SSL
- **对象存储**: MinIO

## 快速开始

### 环境要求
- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 16
- Redis 7

### 本地开发

1. 启动基础设施
```bash
docker compose up -d
```

2. 安装依赖
```bash
cd server
npm install
```

3. 数据库迁移
```bash
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
```

4. 启动服务
```bash
# Client API (端口 3000)
npx ts-node -r tsconfig-paths/register apps/client-api/src/main.ts

# Admin API (端口 3001)
npx ts-node -r tsconfig-paths/register apps/admin-api/src/main.ts

# Open API (端口 3002)
npx ts-node -r tsconfig-paths/register apps/open-api/src/main.ts
```

5. 访问 API 文档
- Client API: http://localhost:3000/docs
- Admin API: http://localhost:3001/docs

### 测试账号
- 管理员: `13800000000` / `admin123`
- 会员: `13800000002` / `member123`

## 项目结构

```
├── server/                    # 后端服务
│   ├── apps/
│   │   ├── client-api/        # C端 API
│   │   ├── admin-api/         # 后台管理 API
│   │   ├── open-api/          # 支付回调 API
│   │   ├── worker/            # 异步任务处理
│   │   ├── scheduler/         # 定时任务
│   │   └── ws-gateway/        # WebSocket 网关
│   ├── libs/
│   │   ├── modules/           # 业务模块
│   │   ├── infra/             # 基础设施
│   │   └── shared/            # 共享库
│   └── prisma/                # 数据库 Schema
├── admin-web/                 # 后台管理前端
├── client-taro/               # C端前端
├── nginx/                     # Nginx 配置
├── docker-compose.yml         # 开发环境
└── docker-compose.prod.yml    # 生产环境
```

## 部署

### 生产环境部署

1. 配置环境变量
```bash
cp server/.env.example server/.env
# 编辑 .env 文件，配置数据库、Redis、JWT_SECRET 等
```

2. 使用 Docker Compose 部署
```bash
docker compose -f docker-compose.prod.yml up -d
```

3. 数据库迁移
```bash
docker exec -it badminton-client-api-prod npx prisma migrate deploy
docker exec -it badminton-client-api-prod npx ts-node prisma/seed.ts
```

### 端口分配

| 服务 | 端口 |
|------|------|
| Client API | 3000 |
| Admin API | 3001 |
| Open API | 3002 |
| WebSocket | 3003 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO | 9000/9001 |

## API 文档

启动服务后访问:
- Client API: http://localhost:3000/docs
- Admin API: http://localhost:3001/docs

## 核心功能

### 已实现
- ✅ 多租户架构
- ✅ 微信登录 (Mock)
- ✅ 活动管理
- ✅ 报名抢位 (Redis Lua + PostgreSQL)
- ✅ 钱包支付 (Mock)
- ✅ 会员管理
- ✅ 球馆场地管理
- ✅ 商城订单
- ✅ 优惠券
- ✅ 通知系统
- ✅ 审计日志
- ✅ 健康检查
- ✅ 安全头

### 待实现
- 微信支付真实对接
- 短信服务集成
- 推送服务集成
- 微信小程序审核
- 压力测试
- 监控告警

## 许可证

私有项目，未经授权禁止使用。
