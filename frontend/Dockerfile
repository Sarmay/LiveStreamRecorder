# 构建阶段：使用 node 镜像
FROM node:18-alpine as builder
WORKDIR /app

# 1. 复制包管理文件（利用 Docker 缓存，优先安装依赖）
COPY package.json ./
# 添加国内 npm 源加速依赖安装（可选，解决安装慢的问题）
RUN yarn config set registry https://registry.npmmirror.com && yarn install

# 2. 关键修复：复制整个项目源码（包含 src、public 等目录）
COPY . .

# 3. 执行构建命令
RUN yarn lint --fix && yarn run build

# 部署阶段：使用 nginx 镜像
FROM nginx:alpine as final
# 复制构建产物到 nginx 静态目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 可选：复制自定义 nginx 配置（解决前端路由刷新404问题）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx（前台运行）
CMD ["nginx", "-g", "daemon off;"]