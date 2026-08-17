# ============================================================
# AI 视频生成器（基于 Remotion）
# 使用 node:20-bookworm-slim（Debian 12 / glibc），
# 内置 Remotion Chrome Headless Shell 渲染所需系统库与 CJK 字体。
# ============================================================
FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Chrome Headless Shell（Remotion 渲染器）依赖的系统库 + 中文字体
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxext6 \
    libxshmfence1 \
    libxrender1 \
    libglib2.0-0 \
    fonts-noto-cjk \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先安装依赖（利用镜像层缓存）
COPY package.json package-lock.json ./
RUN npm ci

# 拷贝源码并构建
COPY . .
RUN npm run build

# 持久化目录：项目数据、渲染任务、输出 MP4
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["npm", "start"]
