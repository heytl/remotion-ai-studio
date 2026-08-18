# 部署文档

> 适用范围：Remotion AI Studio（`remotion-ai-studio`）
> 部署方式：Docker Compose（单机 / 单容器）
> 最后更新：2026-08-18

本文档覆盖从零开始把项目部署到一台远程 Linux 服务器的完整流程，以及上线后的运维、更新、备份、故障排查与安全加固。

---

## 目录

1. [部署架构](#一部署架构)
2. [环境要求](#二环境要求)
3. [准备工作：安装 Docker](#三准备工作安装-docker)
4. [获取代码](#四获取代码)
5. [配置服务密钥](#五配置服务密钥)
6. [构建与启动](#六构建与启动)
7. [首次访问与配置](#七首次访问与配置)
8. [验证部署](#八验证部署)
9. [更新与升级](#九更新与升级)
10. [数据持久化与备份](#十数据持久化与备份)
11. [常用运维命令](#十一常用运维命令)
12. [可选：Nginx 反向代理 + HTTPS](#十二可选nginx-反向代理--https)
13. [安全加固建议](#十三安全加固建议)
14. [常见问题排查](#十四常见问题排查)
15. [附录：配置项速查表](#十五附录配置项速查表)

---

## 一、部署架构

```
用户浏览器
    │  http/https :3000
    ▼
Nginx（可选，反向代理 + HTTPS）
    │
    ▼
Docker 容器 remotion-ai-studio
    ├── Next.js 15（前端 + API 同容器）
    ├── Remotion 渲染器（Chrome Headless Shell）
    └── 数据目录 /app/data（挂载到命名卷，持久化）
            ├── config.json      # 界面保存的配置
            ├── projects/        # 项目（大纲/文稿/Schema）
            └── renders/         # 渲染任务与 MP4 产物

外部服务（由服务器出网调用）：
    ├── 大模型（OpenAI 兼容，如 DeepSeek）
    ├── TTS（OpenAI audio/speech 协议）
    └── 联网搜索（Tavily / Serper / Bocha 博查）
```

关键点：

- **无数据库**：所有数据存本地 JSON 文件，落在命名卷 `remotion-ai-studio-data`。
- **配置优先级**：环境变量 > 界面/文件配置（`data/config.json`）。
- **渲染队列**：单进程内存队列，一次渲染一个任务；服务重启后未完成任务标记为失败。

---

## 二、环境要求

| 项目 | 最低要求 | 推荐 |
| --- | --- | --- |
| 操作系统 | Linux（Ubuntu / Debian / CentOS） | Ubuntu 22.04+ |
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB（渲染 MP4 较吃内存） | 4 GB |
| 磁盘 | 10 GB 可用（含镜像、依赖、视频产物） | 20 GB+ |
| 网络 | 可访问外网（拉镜像 + 调用 LLM/TTS/搜索 API） | — |
| Docker | 20.10+，含 Docker Compose v2 | 最新版 |

> ⚠️ 内存不足 2GB 时，长视频渲染可能失败或极慢；可适当缩短视频时长。

---

## 三、准备工作：安装 Docker

SSH 登录服务器，执行：

```bash
curl -fsSL https://get.docker.com | sh
```

给当前用户授权（避免每次 `sudo`）：

```bash
sudo usermod -aG docker $USER
```

**退出 SSH 重新登录一次**，然后验证：

```bash
docker --version
docker compose version
```

> 若 `docker compose` 不可用，老版本用 `docker-compose`（带横杠），后文命令对应替换。

---

## 四、获取代码

### 方式 A：Git 克隆（推荐）

```bash
git clone https://github.com/heytl/remotion-ai-studio.git
cd remotion-ai-studio
```

### 方式 B：上传压缩包（服务器访问不了 GitHub 时）

在你**本地电脑**打包（Windows PowerShell 下把 `tar` 换成 `tar.exe`）：

```bash
# 排除 node_modules、.git、运行时数据
tar --exclude=node_modules --exclude=.git --exclude=data -czf studio.tar.gz .
```

上传并解压到服务器：

```bash
scp studio.tar.gz 用户名@服务器IP:/opt/
# 服务器上：
cd /opt
mkdir -p remotion-ai-studio
tar -xzf studio.tar.gz -C remotion-ai-studio
cd remotion-ai-studio
```

> 上传完成后务必检查源码完整：`ls app components lib remotion` 四个目录都应存在且包含文件。

---

## 五、配置服务密钥

在项目根目录（与 `docker-compose.yml` 同级）创建 `.env` 文件：

```bash
nano .env
```

粘贴以下内容并**替换成你自己的 Key**：

```bash
# ============ 大模型（OpenAI 兼容） ============
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=sk-你的大模型key
LLM_MODEL=deepseek-v4-flash
LLM_TEMPERATURE=0.7

# ============ TTS（OpenAI audio/speech 协议） ============
TTS_ENABLED=true
TTS_BASE_URL=https://tts.321666.xyz/v1
TTS_API_KEY=sk-tts-你的tts-key
TTS_MODEL=tts-1
TTS_VOICE=alloy

# ============ 联网搜索 ============
SEARCH_ENABLED=true
# 国内网络推荐 bocha 或 serper（tavily 可能被墙）
SEARCH_PROVIDER=bocha
SEARCH_API_KEY=sk-你的搜索key
SEARCH_MAX_RESULTS=5
```

说明：

- `.env` 会被 Docker Compose 自动读取，**不会提交到仓库**（已在 `.gitignore`）。
- 含 `$`、`#` 等特殊字符的值请加引号。
- 也可以不写 `.env`，启动后在网页「设置」页填（数据会存进容器卷），但 `.env` 更适合自动化部署。

保存：`Ctrl+O` 回车 → `Ctrl+X` 退出。

---

## 六、构建与启动

```bash
docker compose up -d --build
```

- 首次构建需要拉镜像、装依赖、跑 `next build`，**通常 3–10 分钟**，请耐心等待。
- `-d` 表示后台运行。

查看构建/启动日志：

```bash
docker compose logs -f
```

看到类似 `Ready` / `started server on 0.0.0.0:3000` 即启动成功。按 `Ctrl+C` 退出日志（**不会停止服务**）。

---

## 七、首次访问与配置

浏览器访问：

```
http://你的服务器IP:3000
```

若打不开，先放行端口（见下方）。

### 放行 3000 端口

```bash
# Ubuntu / Debian 防火墙
sudo ufw allow 3000
```

**云服务器（阿里云/腾讯云/华为云等）还需在控制台「安全组」放行 3000 端口**，否则外网进不来。

### 首次配置

1. 点右上角齿轮进「设置」。
2. 分别确认/填写「大模型」「TTS」「联网搜索」三块（若已用 `.env`，会自动带出，无需重填）。
3. 每块点「测试连接」：
   - 大模型 → 「连接成功」
   - TTS → 「连接成功」并可试听
   - 搜索 → 「连接成功，返回 N 条结果」

> 某个服务测试失败，说明**服务器访问不到该 API**，见 [常见问题排查](#十四常见问题排查)。

---

## 八、验证部署

走一遍完整流程：

1. 首页输入主题 → 创建项目。
2. 需求 → 大纲（联网搜索默认开启，生成后可看到「参考来源」）→ 文稿 → 预览 → 导出 MP4。
3. 下载 MP4 播放确认音画正常。

---

## 九、更新与升级

代码更新后（你本地 push 了新提交），在服务器上：

```bash
cd /opt/remotion-ai-studio    # 你的项目目录
git pull                      # 拉最新代码
docker compose up -d --build  # 重新构建并重启
```

- 项目数据、配置、导出视频都在命名卷 `remotion-ai-studio-data` 里，**重新构建不会丢**。
- 若构建出现依赖/缓存异常，加 `--no-cache` 强制全新构建：

```bash
docker compose build --no-cache
docker compose up -d
```

---

## 十、数据持久化与备份

### 数据都在哪

所有运行时数据在命名卷 `remotion-ai-studio-data`（容器内 `/app/data`）：

```
data/
├── config.json       # 界面保存的配置
├── projects/         # 项目数据
└── renders/          # 渲染任务 + 导出 MP4
```

### 备份

```bash
# 查看卷挂载路径
docker volume inspect remotion-ai-studio-data

# 备份整卷到宿主机（示例）
docker run --rm -v remotion-ai-studio-data:/data -v /opt/backup:/backup alpine \
  tar czf /backup/studio-data-$(date +%Y%m%d).tar.gz -C /data .
```

### 恢复

```bash
docker run --rm -v remotion-ai-studio-data:/data -v /opt/backup:/backup alpine \
  tar xzf /backup/studio-data-20260818.tar.gz -C /data
```

---

## 十一、常用运维命令

```bash
docker compose ps                  # 查看容器状态
docker compose logs -f             # 实时日志
docker compose logs --tail=100     # 最近 100 行日志
docker compose restart             # 重启服务
docker compose down                # 停止并删除容器（数据卷保留）
docker compose down -v             # ⚠️ 连同数据卷一起删除（会丢数据！慎用）
docker compose up -d               # 后台启动（复用已有镜像）
```

---

## 十二、可选：Nginx 反向代理 + HTTPS

### 安装 Nginx

```bash
sudo apt-get update && sudo apt-get install -y nginx
```

### 配置反代

新建 `/etc/nginx/sites-available/studio`：

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

### 申请 HTTPS 证书（Let's Encrypt）

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

按提示完成即可，证书会自动续期。

> 配置好 Nginx 后，可以把服务器防火墙的 3000 端口关闭，只开放 80/443，更安全。

---

## 十三、安全加固建议

1. **API Key 脱敏**：后端已对返回前端的 Key 打码（显示为 `••••••••xxxx`），F12 看不到明文；仅存在服务器 `.env` / `data/config.json`。
2. **不要暴露 3000 到公网**：配好 Nginx 后只开放 80/443。
3. **限制设置页访问**：如需，可在 Nginx 上对 `/settings` 加 Basic Auth 或 IP 白名单。
4. **`.env` 权限**：`chmod 600 .env`，避免其他用户读取。
5. **定期备份**：见 [数据持久化与备份](#十数据持久化与备份)。
6. **密钥不进仓库**：`.env`、`data/` 均在 `.gitignore` 中，切勿手误提交。

---

## 十四、常见问题排查

### 1. 构建报 `Module not found: Can't resolve '@/...'`

- 原因：webpack 未识别 `@` 路径别名。
- 已修复：`next.config.mjs` 显式声明了 `@` 别名。
- 处理：确认代码为最新（`git pull`），用 `--no-cache` 重新构建。

### 2. 构建报 `Cannot find module 'tailwindcss'`

- 原因：Dockerfile 曾在顶部设 `NODE_ENV=production`，导致 `npm ci` 跳过 devDependencies。
- 已修复：改为构建完成后才设 `NODE_ENV=production`。
- 处理：`git pull` 拉取修复后的 Dockerfile，再 `docker compose build --no-cache`。

### 3. 网页打不开 / 连接超时

- 服务器防火墙未放行 3000（`sudo ufw allow 3000`）。
- 云服务器「安全组」未放行 3000。
- 检查：`docker compose ps` 容器是否 Up，`docker compose logs` 是否报错。

### 4. 「测试连接」失败（大模型/TTS/搜索）

- 服务器访问不到该 API（网络/墙/代理问题）。
- 例：Tavily 在国内常被墙，改用 `bocha` 或 `serper`。
- 检查服务器出网：`curl -I https://api.deepseek.com`（换成对应域名）。

### 5. 渲染 MP4 很慢或失败

- 内存/CPU 不足（建议 ≥2GB 内存、2 核）。
- 视频过长（先试 30–60 秒）。
- 查看日志：`docker compose logs --tail=100`。

### 6. 设置页搜索服务商不对（`.env` 配了 bocha 却显示 tavily）

- 旧版本 env 解析漏了 `bocha`，已修复。
- 处理：`git pull` 更新到最新代码后重新构建。

### 7. 中文字体显示为方块

- 镜像已内置 Noto CJK，正常不会出现；若仍出现，确认使用的是仓库自带 Dockerfile。

---

## 十五、附录：配置项速查表

### 大模型

| 配置项 | 环境变量 | 默认值 |
| --- | --- | --- |
| Base URL | `LLM_BASE_URL` | `https://api.openai.com/v1` |
| API Key | `LLM_API_KEY` | 空 |
| 模型 | `LLM_MODEL` | `gpt-4o-mini` |
| 温度 | `LLM_TEMPERATURE` | `0.7` |

### TTS

| 配置项 | 环境变量 | 默认值 |
| --- | --- | --- |
| 启用 | `TTS_ENABLED` | `false` |
| Base URL | `TTS_BASE_URL` | `https://api.openai.com/v1` |
| API Key | `TTS_API_KEY` | 空 |
| 模型 | `TTS_MODEL` | `tts-1` |
| 音色 | `TTS_VOICE` | `alloy` |

### 联网搜索

| 配置项 | 环境变量 | 默认值 |
| --- | --- | --- |
| 启用 | `SEARCH_ENABLED` | `false` |
| 服务商 | `SEARCH_PROVIDER` | `tavily`（可选 `tavily`/`serper`/`bocha`） |
| API Key | `SEARCH_API_KEY` | 空 |
| 结果数量 | `SEARCH_MAX_RESULTS` | `5` |

### 服务

| 配置项 | 环境变量 | 默认值 |
| --- | --- | --- |
| 监听端口 | `PORT` | `3000` |

> 优先级：**环境变量 > 界面/文件配置（`data/config.json`）**。
