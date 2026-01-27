FROM node:18-alpine

# 核心优化1：配置 Alpine 国内镜像源
RUN echo "https://mirrors.aliyun.com/alpine/v3.18/main/" > /etc/apk/repositories && \
    echo "https://mirrors.aliyun.com/alpine/v3.18/community/" >> /etc/apk/repositories

# 关键：安装 Alpine 缺失的系统依赖
# 修复点：添加条件判断，仅当软链接不存在时才创建
RUN apk add --no-cache \
    # 解决 iconv-lite/express 依赖问题
    libc6-compat \
    gcompat \
    # 安装 fluent-ffmpeg 所需的 ffmpeg
    ffmpeg \
    # 解决文件权限/网络问题
    curl \
    && if [ ! -f /lib/ld-linux-x86-64.so.2 ]; then \
        ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2; \
    fi

WORKDIR /app

# 复制包管理文件，利用 Docker 缓存
COPY package.json yarn.lock ./

# 核心优化2：优化 yarn 源和安装策略
RUN yarn config set registry https://registry.npmmirror.com \
    && npm config set registry https://registry.npmmirror.com \
    && yarn config set network-timeout 300000 \
    && yarn cache clean \
    && yarn install --force --production --ignore-optional

# 完整复制项目源码（包括配置/路由等）
COPY . .

# 创建 recordings 目录并设置权限（避免运行时权限不足）
RUN mkdir -p /app/recordings && chmod 777 /app/recordings

# 暴露端口
EXPOSE 3000

# 持久化 recordings 目录（建议配合 docker-compose 的 volumes 使用）
VOLUME ["/app/recordings"]

# 启动服务（用 node 直接启动，减少 yarn 依赖）
CMD ["node", "app.js"]