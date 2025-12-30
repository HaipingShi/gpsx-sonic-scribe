# GPSX Sonic Scribe

<div align="center">
<img width="1200" alt="GPSX Sonic Scribe Cover" src="./assets/cover.png" />
<br/>
<h3>🚀 专业级语音转录与 AI 文本深度润色平台</h3>
<p><b>High Fidelity, High Efficiency, Cyberpunk Aesthetics</b></p>

[技术架构 (Architecture)](./ARCHITECTURE.md) | [开发路线图 (Roadmap)](./NEXT_PHASE_ROADMAP.md) | [变更日志 (Changelog)](./CHANGELOG.md)
</div>

---

**GPSX Sonic Scribe** 是一款专为极致生产力打造的语音转录与文本精炼工具。它完美融合了 **Aliyun FunASR** 语音识别引擎与 **Google Gemini 3 Flash / DeepSeek V3** 文本大模型，实现了从原始音频到结构化资产的全自动化闭环。

## 🌟 核心特性

- **🎭 双生主题系统**: 内置 **Matrix Green (矩阵绿)** 与 **Midnight Cyber (午夜霓虹)** 双模主题，极致的赛博朋克美学体验，支持全局一键无缝切换。
- **⚡ Solo Mode (全自动管线)**: 极简流转。一键触发音频压缩、VAD (语音活动检测) 切分、高并发转录、AI 串行精炼及最终合并。
- **🧠 认知级文本细修**: 搭载 **GPSX 神经网络核心**，支持 AI 智能补全、语气剔除、逻辑重组及符合专业语境的文本润色。
- **🔬 提示词实验室**: 深度支持自定义 `System Prompt`。独创 **Strict Protocol** 隔离机制，确保 AI 绝对遵循用户定义的格式契约。
- **🛡️ 隔离式资产管理**: 每个项目拥有独立的生命周期与物理存储目录，确保数据资产的安全性与可追溯性。

## 🛠️ 技术底座

### **Frontend / UI Layer**
- **Core**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS (自定义 HSL 变量主题引擎)
- **Icons**: Lucide React
- **Verification**: Browser-based Automated Testing

### **Backend / Engine Layer**
- **Runtime**: Node.js + Express
- **ORM**: Prisma (SQLite / PostgreSQL)
- **Audio**: FFmpeg (强制单声道 48kbps 压缩，VAD 动态切片)
- **AI Integration**:
    - **语音 (ASR)**: Aliyun FunASR (2025-11-07 通用模型)
    - **文本 (LLM)**: Gemini 3 Flash (原生流式响应), DeepSeek V3 (负载均衡)

## 🚀 极速部署

### 1. 环境依赖
- Node.js (v18+)
- FFmpeg (用于音频切分与压缩)
- 阿里云 (Aliyun) 及 Google AI Studio / DeepSeek API 凭证

### 2. 初始化项目
```bash
# 克隆仓库
git clone https://github.com/HaipingShi/gpsx-sonic-scribe.git
cd gpsx-sonic-scribe

# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd ../client && npm install
```

### 3. 环境配置
在 `server` 目录下创建 `.env`：
```env
PORT=3001
ALIYUN_API_KEY=your_key
GEMINI_API_KEY=your_key
DEEPSEEK_API_KEYS=key1,key2
```

### 4. 启动系统
```bash
# 启动服务端 (server)
npm run dev

# 启动客户端 (client)
npm run dev
```

访问 `http://localhost:5173` 即可进入系统。

## 🗺️ 演进路径
本项目正处于快速增长期。我们下一步的重点是 **全网多媒介提取 (YouTube/Bilibili)** 以及 **企业级云端多租户隔离方案**。更多详情请参阅 [NEXT_PHASE_ROADMAP.md](./NEXT_PHASE_ROADMAP.md)。

---
<div align="center">
Managed by <b>GPSX Laboratory</b>. Empowering Data Consciousness.
</div>
