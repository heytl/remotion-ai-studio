# 部署文档

> 适用范围：Remotion AI Studio（`remotion-ai-studio`）
> 支持两种部署方式：**本地部署（Node.js）** 与 **Docker 部署**，二选一。
> 最后更新：2026-08-18

本文档覆盖从获取代码到上线运维的完整流程，以及更新、备份、故障排查与安全加固。

---

## 目录

1. [两种部署方式对比](#一两种部署方式对比)
2. [获取代码](#二获取代码)
3. [方式 A：本地部署（Node.js）](#三方式-a本地部署nodejs)
4. [方式 B：Docker 部署](#四方式-bdocker-部署)
5. [首次访问与配置](#五首次访问与配置)
6. [验证部署](#六验证部署)
7. [更新与升级](#七更新与升级)
8. [数据持久化与备份](#八数据持久化与备份)
9. [常用运维命令](#九常用运维命令)
10. [可选：Nginx 反向代理 + HTTPS](#十可选nginx-反向代理--https)
11. [安全加固建议](#十一安全加固建议)
12. [常见问题排查](#十二常见问题排查)
13. [附录：配置项速查表](#十三附录配置项速查表)

---

## 一、两种部署方式对比

| | 本地部署（Node.js） | Docker 部署 |
| --- | --- | --- |
| 前置依赖 | Node.js ≥ 18 + npm | Docker + Docker Compose |
| 优点 | 不依赖 Docker、启动快、便于调试 | 环境隔离、一键启动、中文字体与渲染系统库已内置 |
| 缺点 | 需自行准备 Node、字体等 | 镜像较大、首次构建较慢 |
| 适用场景 | 本地体验、开发调试 | 生产环境、远程服务器 |

> 远程服务器生产环境**推荐 Docker 部署**。

---

## 二、获取代码

### 方式 A：Git 克隆（推荐）

```bash
git clone https://github.com/heytl/remotion-ai-studio.git
cd remotion-ai-studio
```

### 方式 B：上传压缩包（服务器访问不了 GitHub 时）

本地打包（Windows 下 `tar` 换成 `tar.exe`）：

```bash
tar --exclude=node_modules --exclude=.git --exclude=data -czf studio.tar.gz .
```

上传解压：

```bash
scp studio.tar.gz 用户名@服务器IP:/opt/
# 服务器上：
cd /opt && mkdir -p remotion-ai-studio && tar -xzf studio.tar.gz -C remotion-ai-studio
cd remotion-ai-studio
```

> 上传完成后务必检查源码完整：`ls app components lib remotion` 四个目录都应存在且含文件。

---

## 三、方式 A：本地部署（Node.js）

### 3.1 环境要求

- Node.js ≥ 18（推荐 20 / 22）
- npm
- 首次渲染 MP4 时 Remotion 会自动下载 Chrome Headless Shell（需能访问外网）
- Linux 若渲染中文，建议安装 CJK 字体（如 `fonts-noto-cjk`）

### 3.2 配置环境变量

复制示例环境变量文件并修改：

```bash
cp .env.example .env.local
nano .env.local
```

按需修改以下字段（`.env.example` 里均有注释说明）：

```bash
# 大模型
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=sk-你的大模型key
LLM_MODEL=deepseek-v4-flash

# TTS（可选）
TTS_ENABLED=true
TTS_BASE_URL=https://tts.321666.xyz/v1
TTS_API_KEY=sk-tts-你的tts-key
TTS_MODEL=tts-1
TTS_VOICE=alloy

# 联网搜索（可选）
SEARCH_ENABLED=true
SEARCH_PROVIDER=bocha
SEARCH_API_KEY=sk-你的搜索key
SEARCH_MAX_RESULTS=5
```

> 也可以不配环境变量，启动后在网页「设置」页填写，数据会保存到 `data/config.json`。

### 3.3 安装依赖

```bash
npm install
```

### 3.4 构建与启动

生产模式：

```bash
npm run build
npm start
```

默认监听 `http://localhost:3000`。开发模式用 `npm run dev`。

---

## 四、方式 B：Docker 部署

> 前置条件：服务器已安装 Docker 与 Docker Compose（安装方法见 Docker 官方文档，本文不再赘述）。

### 4.1 环境要求

| 项目 | 最低要求 | 推荐 |
| --- | --- | --- |
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB（渲染 MP4 较吃内存） | 4 GB |
| 磁盘 | 10 GB 可用 | 20 GB+ |
| 网络 | 可访问外网（拉镜像 + 调用 LLM/TTS/搜索 API） | — |

### 4.2 配置环境变量

复制示例环境变量文件并修改（Docker Compose 会**自动读取同目录的 `.env`**）：

```bash
cp .env.example .env
nano .env
```

修改 `.env.example` 里带 `sk-...` 占位符的字段即可，例如：

```bash
# 大模型
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=sk-你的大模型key
LLM_MODEL=deepseek-v4-flash

# TTS（可选）
TTS_ENABLED=true
TTS_BASE_URL=https://tts.321666.xyz/v1
TTS_API_KEY=sk-tts-你的tts-key

# 联网搜索（可选）
SEARCH_ENABLED=true
SEARCH_PROVIDER=bocha
SEARCH_API_KEY=sk-你的搜索key
```

> 也可以不配 `.env`，启动后在网页「设置」页填写（数据存入容器卷 `remotion-ai-studio-data`）。

### 4.3 构建与启动

```bash
docker compose up -d --build
```

- 首次构建需拉镜像、装依赖、跑 `next build`，**通常 3–10 分钟**，请耐心等待。
- 查看日志：`docker compose logs -f`，看到 `Ready` / `started server on 0.0.0.0:3000` 即成功。

---

## 五、首次访问与配置

浏览器访问：

```
http://你的服务器IP:3000
```

打不开时先放行端口：

```bash
# Ubuntu / Debian 防火墙
sudo ufw allow 3000
```

> **云服务器（阿里云/腾讯云/华为云等）还需在控制台「安全组」放行 3000 端口**。

进入「设置」页（右上角齿轮），确认/填写「大模型」「TTS」「联网搜索」三块，并逐个点「测试连接」：

- 大模型 → 「连接成功」
- TTS → 「连接成功」并可试听
- 搜索 → 「连接成功，返回 N 条结果」

> 若某服务测试失败，说明服务器访问不到该 API，见 [常见问题排查](#十二常见问题排查)。

---

## 六、验证部署

走一遍完整流程：

1. 首页输入主题 → 创建项目。
2. 需求 → 大纲（联网搜索默认开启，生成后可看到「参考来源」）→ 文稿 → 预览 → 导出 MP4。
3. 下载 MP4 播放确认音画正常。

---

## 七、更新与升级

### 本地部署

```bash
cd remotion-ai-studio
git pull
npm install
npm run build
# 重启服务（Ctrl+C 停掉旧进程后）
npm start
```

### Docker 部署

```bash
cd remotion-ai-studio
git pull
docker compose up -d --build
```

- 构建异常时加 `--no-cache` 强制全新构建：

```bash
docker compose build --no-cache
docker compose up -d
```

- 重新构建**不会丢数据**（数据在卷/`data` 目录中）。

---

## 八、数据持久化与备份

### 数据存放位置

| 部署方式 | 数据目录 |
| --- | --- |
| 本地部署 | 项目根目录 `data/`（`config.json`、`projects/`、`renders/`） |
| Docker 部署 | 命名卷 `remotion-ai-studio-data`（容器内 `/app/data`） |

### 备份

本地部署直接压缩 `data/` 目录即可。

Docker 部署：

```bash
docker run --rm -v remotion-ai-studio-data:/data -v /opt/backup:/backup alpine \
  tar czf /backup/studio-data-$(date +%Y%m%d).tar.gz -C /data .
```

### 恢复

```bash
docker run --rm -v remotion-ai-studio-data:/data -v /opt/backup:/backup alpine \
  tar xzf /backup/studio-data-20260818.tar.gz -C /data
```

---

## 九、常用运维命令

### 本地部署

```bash
npm run build && npm start     # 构建并启动
ps aux | grep next             # 查看进程
```

### Docker 部署

```bash
docker compose ps                  # 查看容器状态
docker compose logs -f             # 实时日志
docker compose logs --tail=100     # 最近 100 行日志
docker compose restart             # 重启服务
docker compose down                # 停止并删除容器（数据卷保留）
docker compose down -v             # ⚠️ 连同数据卷删除（丢数据，慎用）
docker compose up -d               # 后台启动（复用镜像）
```

---

## 十、可选：Nginx 反向代理 + HTTPS

安装 Nginx 后，新建 `/etc/nginx/sites-available/studio`：

```nginx
server {
    listen 80;
    server_name your-domain.com;   # 改成你的域名

    client_max_body_size 200m;     # 允许上传大图/大文件

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;   # 渲染 MP4 耗时较长，放宽超时
        proxy_send_timeout 600s;
    }
}
```

启用：

```bash
sudo ln -s /etc/nginx/sites-available/studio /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

申请 HTTPS 证书（Let's Encrypt）：

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

> 配好 Nginx 后，可关闭服务器防火墙的 3000 端口，只开放 80/443，更安全。

---

## 十一、安全加固建议

1. **API Key 脱敏**：后端已对返回前端的 Key 打码（显示 `••••••••xxxx`），F12 看不到明文；真实 Key 仅存服务器端。
2. **不暴露 3000 到公网**：配好 Nginx 后只开放 80/443。
3. **限制设置页访问**：可在 Nginx 上对 `/settings` 加 Basic Auth 或 IP 白名单。
4. **`.env` 权限**：`chmod 600 .env`（或 `.env.local`）。
5. **密钥不进仓库**：`.env`、`.env.local`、`data/` 均在 `.gitignore` 中，切勿误提交。
6. **定期备份**：见 [数据持久化与备份](#八数据持久化与备份)。

---

## 十二、常见问题排查

### 1. Docker 构建报 `Module not found: Can't resolve '@/...'`

- 原因：webpack 未识别 `@` 路径别名。
- 已修复：`next.config.mjs` 显式声明了 `@` 别名。
- 处理：`git pull` 到最新代码，`docker compose build --no-cache`。

### 2. Docker 构建报 `Cannot find module 'tailwindcss'`

- 原因：Dockerfile 曾在顶部设 `NODE_ENV=production`，导致 `npm ci` 跳过 devDependencies。
- 已修复：改为构建完成后才设 `NODE_ENV=production`。
- 处理：`git pull` 拉取修复后的 Dockerfile，再重建。

### 3. 网页打不开 / 连接超时

- 服务器防火墙未放行 3000（`sudo ufw allow 3000`）。
- 云服务器「安全组」未放行 3000。
- 检查：`docker compose ps`（或本地进程）是否在跑，日志是否报错。

### 4. 「测试连接」失败（大模型/TTS/搜索）

- 服务器访问不到该 API（网络/墙/代理）。
- 例：Tavily 在国内常被墙，改用 `bocha` 或 `serper`。
- 检查出网：`curl -I https://api.deepseek.com`（换成对应域名）。

### 5. 渲染 MP4 很慢或失败

- 内存/CPU 不足（建议 ≥2GB 内存、2 核）。
- 视频过长（先试 30–60 秒）。
- 本地部署未装中文字体 / Headless Shell 下载失败。

### 6. 设置页搜索服务商不对（`.env` 配了 bocha 却显示 tavily）

- 旧版本 env 解析漏了 `bocha`，已修复。
- 处理：`git pull` 到最新代码后重启/重建。

### 7. 中文字体显示为方块

- Docker 镜像已内置 Noto CJK；本地部署需自行安装 CJK 字体（如 `fonts-noto-cjk`）。

---

## 十三、附录：配置项速查表

> 完整模板见 `.env.example`，复制后修改即可。下表为字段说明。

### 大模型

| 环境变量 | 说明 | 默认值 |
| --- | --- | --- |
| `LLM_BASE_URL` | API 地址（注意是否含 `/v1`） | `https://api.openai.com/v1` |
| `LLM_API_KEY` | API Key | 空 |
| `LLM_MODEL` | 模型名 | `gpt-4o-mini` |
| `LLM_TEMPERATURE` | 温度 0–2 | `0.7` |

### TTS

| 环境变量 | 说明 | 默认值 |
| --- | --- | --- |
| `TTS_ENABLED` | 是否启用 | `false` |
| `TTS_BASE_URL` | API 地址 | `https://api.openai.com/v1` |
| `TTS_API_KEY` | API Key | 空 |
| `TTS_MODEL` | 模型 | `tts-1` |
| `TTS_VOICE` | 音色 | `alloy` |

### 联网搜索

| 环境变量 | 说明 | 默认值 |
| --- | --- | --- |
| `SEARCH_ENABLED` | 是否启用 | `false` |
| `SEARCH_PROVIDER` | `tavily` / `serper` / `bocha` | `tavily` |
| `SEARCH_API_KEY` | API Key | 空 |
| `SEARCH_MAX_RESULTS` | 每个查询结果数 1–10 | `5` |

### 服务

| 环境变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | 监听端口 | `3000` |

> 优先级：**环境变量 > 界面/文件配置（`data/config.json`）**。
