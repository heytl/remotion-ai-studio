# 🎬 Remotion AI Studio — 基于 Remotion 的 AI 视频生成器

> 项目名：**remotion-ai-studio**

一个可本地运行、可 Docker 部署的 AI 视频生成 Web 应用。用户输入主题/需求后，系统通过大模型自动完成：

**需求输入 → 生成大纲 → 生成文稿（分镜脚本）→ Remotion 实时预览 → 导出 MP4**

每一步结果都以**结构化数据**保存，并可在前端**手动编辑**，编辑结果会传递并影响后续步骤。

核心渲染基于 [Remotion](https://github.com/remotion-dev/remotion) 官方能力：
- 浏览器内实时预览：`@remotion/player`（真实可播放、可拖动进度条）
- 服务端导出 MP4：`@remotion/bundler` + `@remotion/renderer`

---

## 一、功能特性

| 步骤 | 能力 |
| --- | --- |
| 1. 需求输入 | 主题、目标时长、风格、受众、语言、画面比例（16:9 / 9:16 / 1:1） |
| 2. AI 大纲 | 结构化章节/场景（标题、要点、时长占比），卡片式编辑、拖拽排序、增删、单节重新生成 |
| 3. AI 文稿 | 逐场景旁白/字幕、画面描述、时长，逐场景编辑与单场景重新生成，可选 TTS 配音 |
| 4. 可视化预览 | Schema（JSON）驱动的 Remotion Composition，在线调节字体/字号/配色/背景/动画/时长/文字，**实时热更新** |
| 5. 导出 MP4 | 异步任务队列 + 进度反馈，完成后下载，历史记录持久化 |

## 二、技术栈

- **前端 + 后端**：Next.js 15（App Router，API Routes 同项目承载）
- **视频框架**：Remotion 4（`remotion` / `@remotion/player` / `@remotion/bundler` / `@remotion/renderer`）
- **UI**：React 19 + Tailwind CSS 3 + shadcn 风格组件（Radix UI 原语）
- **大模型接入**：OpenAI 兼容 Chat Completions 协议（`fetch` 直连，无厂商锁定）
- **数据持久化**：本地 JSON 文件（`data/` 目录，无需数据库）
- **TTS（可选）**：OpenAI `audio/speech` 协议

## 三、目录结构

```
remotion-ai-studio/
├── app/                        # Next.js App Router
│   ├── page.tsx                # 首页：新建项目 + 项目列表
│   ├── settings/page.tsx       # 设置：大模型 / TTS 配置 + 连接测试
│   ├── project/[id]/page.tsx   # 项目编辑器入口
│   └── api/                    # 后端 API
│       ├── projects/           # 项目 CRUD
│       ├── generate/           # 大纲/文稿生成（含单场景重新生成）
│       ├── config/             # 配置读写 + 连接测试
│       ├── tts/                # 配音合成
│       └── render/             # 渲染任务队列 + 状态 + 下载
├── components/                 # 前端组件（各步骤编辑器、Remotion 播放器封装）
├── lib/                        # 核心逻辑
│   ├── types.ts                # 全流程结构化类型
│   ├── schema-builder.ts       # 文稿 → Remotion Schema 转换
│   ├── store.ts                # JSON 文件持久化
│   ├── llm.ts / prompts.ts     # 大模型客户端与提示词
│   ├── tts.ts                  # TTS 客户端
│   ├── render-queue.ts         # Remotion 服务端渲染队列
│   └── api.ts / utils.ts
├── remotion/                   # Remotion Composition（Schema 驱动，可复用场景组件）
│   ├── index.ts / Root.tsx / VideoComposition.tsx
│   └── scenes/                 # 标题页/要点列表/图文/纯字幕/转场
├── docs/                       # 项目设计与维护文档
│   └── UI-DESIGN.md            # Motion Lab UI 设计规范
├── data/                       # 运行时数据（gitignore，自动创建）
├── Dockerfile / docker-compose.yml
└── .env.example
```

## UI 设计文档

本次重构的视觉方向、设计令牌、基础组件、页面信息架构、响应式与可访问性规则已整理在 [UI 设计规范](docs/UI-DESIGN.md)。后续新增或修改界面，请以该文档和 `components/ui/` 为准，避免引入新的视觉语言。

## 四、本地运行

### 环境要求

- Node.js ≥ 18（推荐 20/22）
- npm

### 步骤

```bash
# 1. 安装依赖
npm install

# 2.（可选）配置大模型。两种方式任选其一：
#    a) 复制环境变量示例（不会提交到仓库）
cp .env.example .env.local
#       编辑 .env.local，填入 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
#    b) 或在启动后访问 http://localhost:3000/settings 在界面中配置

# 3. 启动开发服务
npm run dev
```

访问 **http://localhost:3000**。

> 首次点击「生成」若未配置 API Key，页面会提示前往「设置」。也可随时到 `http://localhost:3000/settings` 修改并「测试连接」。

### 生产模式（本地）

```bash
npm run build
npm start
```

## 五、Docker 部署

```bash
# 方式一：通过环境变量注入配置
LLM_BASE_URL="https://api.openai.com/v1" \
LLM_API_KEY="sk-xxx" \
LLM_MODEL="gpt-4o-mini" \
docker compose up -d --build

# 方式二：先编辑 .env 文件（参考 .env.example），再启动
docker compose up -d --build
```

启动后访问 **http://localhost:3000**（容器端口 3000 映射到宿主机 3000，可在 `docker-compose.yml` 修改）。

- 数据（项目 / 渲染任务 / MP4）持久化在命名卷 `remotion-ai-studio-data`（容器内 `/app/data`）。
- 首次渲染会自动打包 Remotion Composition，耗时稍长，之后复用缓存。
- 镜像已内置 Chrome Headless Shell 所需系统库与 Noto CJK 中文字体。

## 六、大模型配置说明

系统按 **OpenAI 兼容 Chat Completions** 协议实现，可接入任意兼容服务商（OpenAI、DeepSeek、Moonshot、Qwen、GLM、本地 Ollama/vLLM 等），**切换服务商无需改代码**。

配置优先级：**环境变量 > 界面/文件配置**。

| 配置项 | 环境变量 | 说明 |
| --- | --- | --- |
| API Base URL | `LLM_BASE_URL` | 例：`https://api.openai.com/v1`（注意是否含 `/v1`） |
| API Key | `LLM_API_KEY` | 不硬编码、不入库到仓库 |
| 模型 | `LLM_MODEL` | 例：`gpt-4o-mini`、`deepseek-chat`、`moonshot-v1-8k` |
| 温度 | `LLM_TEMPERATURE` | 0-2，默认 0.7 |

界面配置保存在 `data/config.json`（已 gitignore）。

### 可选 TTS

| 配置项 | 环境变量 | 说明 |
| --- | --- | --- |
| 启用 | `TTS_ENABLED` | `true` / `false` |
| Base URL / Key / 模型 / 音色 | `TTS_BASE_URL` / `TTS_API_KEY` / `TTS_MODEL` / `TTS_VOICE` | OpenAI `audio/speech` 协议 |

启用后，在「文稿」步骤可为每个场景（或全部场景）生成旁白配音，配音会合成进最终 MP4。不启用则渲染为纯画面 + 字幕。

## 七、使用流程

1. 首页填写主题等需求 → 创建项目。
2. **需求**：确认/修改参数 → 下一步。
3. **大纲**：点「生成大纲」→ 拖拽排序、编辑、单节重新生成 → 下一步。
4. **文稿**：点「生成文稿」→ 逐场景编辑旁白/画面/时长，可单场景重新生成、生成配音 → 下一步（自动把文稿转成 Remotion Schema）。
5. **预览**：真实播放 Remotion 视频，左侧播放、右侧调主题/场景参数（实时热更新）。
6. **导出**：点「开始渲染 MP4」→ 查看进度 → 下载。

## 八、注意事项

- **渲染架构**：渲染队列为单进程内存队列（一次渲染一个任务），状态持久化到磁盘；服务重启后未完成任务会标记为失败，需重新发起。适合本地/单容器部署。
- **Remotion 许可**：Remotion 对个人与小型团队免费；公司商用需购买许可证（见 Remotion 官网）。
- **字体**：Docker 镜像内置 Noto CJK；本地预览使用系统字体。
- **首帧打包**：修改 `remotion/` 下代码后需重启服务使渲染缓存失效（预览不受影响）。

## 九、验收清单

- [x] 能通过 `npm install && npm run dev` 本地启动
- [x] 能通过 `docker compose up` 部署
- [x] 大模型配置可在界面/配置文件/环境变量中修改，切换 OpenAI 兼容服务无需改代码
- [x] 完整走通「需求 → 大纲 → 文稿 → Remotion 预览 → 导出 MP4」，每步可编辑
- [x] Remotion 预览为真实可交互播放（`@remotion/player`）
- [x] MP4 导出真实可用（`@remotion/renderer` 服务端渲染）
- [x] 渲染进度反馈（异步队列 + 百分比）
- [x] 代码结构清晰，含错误处理（LLM 失败、渲染失败、连接测试等）
- [x] README 完整，按文档可复现
- [x] 统一的 shadcn + Tailwind UI 设计系统，并提供维护规范
