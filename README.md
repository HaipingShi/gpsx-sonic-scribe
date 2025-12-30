# AudioScribe Pro

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
<br/>
🚀 **专业级语音转录与 AI 文本智能润色平台**
<br/>
[技术架构 (Architecture)](file:///Users/geesh/projects/audioscribe-pro/ARCHITECTURE.md) | [开发路线图 (Roadmap)](file:///Users/geesh/projects/audioscribe-pro/NEXT_PHASE_ROADMAP.md)
</div>

AudioScribe Pro 是一款专为高效生产力设计的语音转录与文本润色工具。它集成了阿里云 FunASR 语音识别引擎与 Google Gemini / DeepSeek 文本大模型，实现了从音频上传、自动化转录到智能分块润色的全流程处理。

## ✨ 核心亮点

*   **双引擎 AI 润色**: 支持在 **Google Gemini 3 Flash** (核心推荐) 与 **DeepSeek V3** 之间动态切换，针对不同语境提供最优方案。
*   **Solo 模式 (一键流)**: 开启后系统自动执行音频压缩、VAD 切分、转录、精炼到最终合并的全自动化流程。
*   **智能切分策略**: 结合 VAD (语音活动检测) 与 AI 语义分析，确保长音频转写后的段落逻辑清晰、语义连贯。
*   **提示词实验室**: 深度支持自定义 System Prompt，具备 **Strict Protocol** 模式，确保 AI 100% 遵循用户定义的专业格式要求。
*   **项目隔离存储**: 采用文件夹级资产隔离，确保大规模任务处理时的文件安全性与可维护性。

## 🛠️ 技术架构

*   **前端**: React 18, TypeScript, TailwindCSS, Lucide Icons, Vite
*   **后端**: Node.js, Express, Prisma (SQLite/PostgreSQL)
*   **AI 引擎**: 
    - **语音**: Aliyun FunASR (最新 `2025-11-07` 模型，支持实时标点与 ITN)
    - **文本**: Google Gemini 3 Flash, DeepSeek V3 (支持多 Key 负载均衡)

> 详细设计方案请参考 [ARCHITECTURE.md](file:///Users/geesh/projects/audioscribe-pro/ARCHITECTURE.md)。

## 🚀 快速开始

### 准备工作
- 安装 Node.js (v18+)
- 准备阿里云 (Aliyun) 与 Google AI / DeepSeek API 凭证

### 1. 克隆并安装依赖
```bash
# 进入服务端并安装
cd server && npm install

# 进入客户端并安装
cd ../client && npm install
```

### 2. 环境配置
在 `server` 目录下创建 `.env` 文件：
```env
PORT=3001
DATABASE_URL="file:./dev.db"

# AI 配置
ALIYUN_API_KEY=your_aliyun_key
# 如果使用 Gemini
GEMINI_API_KEY=your_gemini_key
# 如果使用 DeepSeek (支持多个 key 逗号分隔)
DEEPSEEK_API_KEYS=key1,key2
```

### 3. 运行项目
```bash
# 启动服务端 (server 目录)
npm run dev

# 启动客户端 (client 目录)
npm run dev
```

访问 `http://localhost:5173` 即可开启专业转录之旅。

## 🗺️ 未来计划
本项目正处于快速迭代中，下一步计划包括“全网资源抓取模块”以及“多用户云端隔离方案”。详情请参见 [NEXT_PHASE_ROADMAP.md](file:///Users/geesh/projects/audioscribe-pro/NEXT_PHASE_ROADMAP.md)。

---
Managed by **AudioScribe Pro Team**. High Fidelity, High Efficiency.
