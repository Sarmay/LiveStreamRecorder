# Live Stream Recorder

一个基于 Node.js + Express + Vue2 的直播录制系统，支持定时录制、后台录制和实时状态监控。

## 功能特性

- ✅ **即时录制**：立即开始录制直播流
- ⏰ **定时录制**：支持设置开始时间和结束时间
- 🔄 **重复录制**：每周同一时间自动录制
- 📊 **实时监控**：WebSocket 实时推送录制进度
- 💾 **后台录制**：关闭页面后继续录制
- 🐳 **Docker 部署**：一键部署到容器
- 🎨 **友好界面**：Vue2 + Element UI 前端界面

## 支持的直播协议

- ✅ FLV (`https://example.com/stream.flv`)
- ✅ HLS (`https://example.com/stream.m3u8`)
- ✅ RTMP (`rtmp://example.com/stream`)

## 技术栈

### 后端
- Node.js 18+
- Express 4.x
- FFmpeg（视频录制）
- WebSocket（实时通信）
- Cron（定时任务）

### 前端
- Vue 2.7+
- Element UI
- Moment.js（时间处理）

## 快速开始

### 方法一：Docker Compose（推荐）

```bash
# 克隆项目
cd LiveStreamRecorder

# 构建并启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f

# 访问应用
# 前端页面: http://localhost:8088
# 后端 API: http://localhost:3009
```

### 方法二：手动运行

#### 环境要求

- Node.js 18+
- FFmpeg（需要安装在系统中）

#### 安装步骤

```bash
# 1. 克隆项目
cd LiveStreamRecorder

# 2. 安装并启动后端
cd backend
yarn install
yarn start

# 3. 新开终端，安装并启动前端开发服务
cd frontend
yarn install
yarn dev

# 4. 浏览器打开
# http://localhost:8080
```

## 使用说明

### 即时录制

1. 在"即时录制"区域输入直播地址
2. 可选：输入录制名称（用于标识文件）
3. 点击"开始录制"
4. 可以实时看到录制时长和文件大小
5. 点击"停止录制"结束录制

### 定时录制

1. 在"定时录制"区域输入直播地址
2. 输入录制名称
3. 设置开始时间
4. 可选：设置结束时间（不设置则需手动停止）
5. 可选：开启"重复录制"（每周同一时间自动录制）
6. 点击"添加定时任务"

### 录制文件存储

Docker Compose 部署时，录制文件存储在本地 `recordings/` 目录并挂载到容器 `/app/recordings`。
手动运行后端时，录制文件默认存储在 `backend/recordings/` 目录。

要访问录制的文件：

```bash
# Docker Compose 方式
ls recordings

# 手动运行方式
ls backend/recordings
```

## 项目结构

```
LiveStreamRecorder/
├── backend/               # 后端代码
│   ├── app.js             # Express 主入口
│   ├── routes/            # API / WebSocket 路由
│   └── utils/             # 录制与定时任务管理
├── frontend/              # 前端代码
│   ├── src/
│   │   ├── main.js        # Vue 主入口
│   │   └── App.vue        # 主组件
│   ├── public/
│   └── package.json
├── recordings/            # 录制文件存储（Docker 卷）
├── docker-compose.yml
└── README.md
```

## API 说明

### WebSocket 消息

#### 客户端发送

```javascript
// 心跳
'ping'
```

#### 服务端推送

```javascript
// 录制开始
{ type: 'RECORDING_STARTED', payload: recording }

// 录制进度
{ type: 'RECORDING_PROGRESS', payload: { id, duration, size } }

// 录制完成
{ type: 'RECORDING_COMPLETED', payload: recording }

// 录制错误
{ type: 'RECORDING_ERROR', payload: { id, error } }

// 定时任务添加
{ type: 'SCHEDULE_ADDED', payload: schedule }
```

### REST API

```bash
# 开始录制
POST /api/start-recording

# 停止录制
POST /api/stop-recording

# 获取录制列表
GET /api/recordings

# 获取录制状态
GET /api/recording-status

# 获取已完成录制
GET /api/completed-recordings

# 删除已完成录制
POST /api/remove-completed-recordings

# 添加定时任务
POST /api/add-schedule

# 删除定时任务
POST /api/remove-schedule

# 获取定时任务列表
GET /api/schedules
```

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3000 |
| NODE_ENV | 运行环境 | production |
| VUE_APP_BASE_API | 前端构建时使用的后端 API 地址 | 当前访问主机的 3009 端口 |
| VUE_APP_WS_API | 前端构建时使用的 WebSocket 地址 | 当前访问主机的 3009 端口 `/api/ws` |

## 常见问题

### Q: 录制的文件在哪里？

A: Docker Compose 部署时，文件在项目根目录的 `recordings/`。手动运行后端时，文件在 `backend/recordings/`。

### Q: 关闭页面后录制会停止吗？

A: 不会。录制进程在服务端运行，关闭页面不影响录制，除非手动停止或到达结束时间。

### Q: 支持哪些直播平台？

A: 只要提供 FLV、HLS 或 RTMP 格式的直播地址，都可以录制。

### Q: 如何查看录制日志？

```bash
docker-compose logs -f
```

### Q: 如何更新应用？

```bash
docker-compose build
docker-compose up -d
```

## 许可证

MIT
