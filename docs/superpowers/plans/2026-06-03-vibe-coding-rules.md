# AgentFlow Vibe Coding Rules Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 深度优化 AgentFlow 的 hermes.md 提示词、opencode.md 提示词以及 agentflow.py 规则模板，像素级植入 Vibe Coding 的五稳原则、九阳神功、双层 Review、测试/日志先行以及防范上下文腐化的重置回滚自愈机制。

**Architecture:** 
1. 重构 `.agentflow/prompts/hermes.md`：改版 6 轮 Grill-Me SOP，增加非目标收敛，强化带日志与测试先行的契约任务拆卡。
2. 重构 `.agentflow/prompts/opencode.md`：引入“测试先行”隔离特征开发、“Git 刹车”小步存档、纠错 2 次失败强制 `git reset --hard HEAD` 并告警 `/clear`。
3. 优化 `.agentflow/agentflow.py`：升级 `base_template`，嵌入“五稳原则”、“九阳神功”、/clear 上下文防腐机制与 `@file` 精确文件引用规范，并同步生成根目录规则。

**Tech Stack:** Python 3, Markdown Rules, Bash Command Line

---

### Task 1: 升级 Hermes (Planner) 提示词规程

**Files:**
- Modify: `.agentflow/prompts/hermes.md`

- [ ] **Step 1: 修改 hermes.md 中的 Grill-Me 拷问规程**
  修改 `## ⚖️ 三、 Grill-Me 深度拷问标准`，将 6 轮访谈聚焦维度重构为：
  - 第一轮：需求目标与非目标收敛（确认做什么，**强制定义不做什么**）。
  - 第二轮：数据模型与 API 报文设计（定义数据库 Schema 变更及交互 JSON 数据契约）。
  - 第三轮：前端组件、视觉结构与 MIMIcode 设计令牌对接。
  - 第四轮：三态交互表现细节（Loading 骨架屏、Empty 空状态、Error 异常 Retry）。
  - 第五轮：可观测性日志与异常边界（**明确要求在哪些核心位置注入日志，如何进行异常捕获**）。
  - 第六轮：定义完成验收标准（**怎么算做完，提供对应的自动化编译/测试/Lint验证命令**）。

- [ ] **Step 2: 修改任务卡片验收条件（Checklist）与 Git 刹车存档提示**
  修改 `## 🛠️ 五、 任务拆解与分发纪律` 中的“验收条件 (Acceptance Criteria) 书写铁律”，确保每个 Checklist 包含：
  - 精确的文件 Clickable File 链接（如 `file:///D:/agentcode/src/...`）。
  - **测试先行锚点**：必须标明具体的测试输入输出与单元测试命令。
  - **日志可观测性埋点契约**：明确要求在特定的执行分支写入特定的日志。
  - **Git 刹车存档提示**：在每一个 Checklist 项后加上 `[ ] 存档提示：通过此项测试后请执行 git commit -m "feat: TASK-XXX pass Y"`。
  - 任务 Markdown 文件模板中的样例也进行相应的修改更新，加入日志和 TDD 的描述。

- [ ] **Step 3: 运行 git diff 检查 hermes.md 修改**
  运行：`git diff .agentflow/prompts/hermes.md`
  期待：Grill-Me 拷问与任务契约拆包描述已全面重构成文。

- [ ] **Step 4: Commit 任务一**
  运行：
  ```bash
  git add .agentflow/prompts/hermes.md
  git commit -m "feat: upgrade hermes.md prompt with vibe coding goals, logs, and TDD check"
  ```

---

### Task 2: 升级 OpenCode (Refactorer) 提示词规程

**Files:**
- Modify: `.agentflow/prompts/opencode.md`

- [ ] **Step 1: 修改 opencode.md 中的全局重构防炸防退化逻辑**
  在 `## 🔍 二、 全局搜索与重构分析规程` 中增加对 API 接口更新的“向下兼容机制”：
  - 重构公共 API 时，必须保留旧 API 的正常编译并在代码中标记为 `@deprecated`。
  - 在任务卡片最后一项加入“清理并彻底移除废弃 API”的任务，实现渐进式重构。

- [ ] **Step 2: 增加测试先行与 Git 刹车自愈回退及重置防腐规范**
  修改 `### 第三步：开展重构` 和 `## 🛠️ 四、 全局重构最佳实践`，写入以下具体规则：
  - 隔离特征开发：运行任务前必须切入 `feature/task-xxx`。
  - 小步提交点：一改一测一 commit，跑通 Lint、类型检查与单元测试后方可存档。
  - **纠错2次即回滚**：如果一个 Bug 连续修复 2 次依旧报错，禁止盲目补丁，必须立刻执行 `git reset --hard HEAD` 回退到上一个安全存档点。
  - **告警重置**：回退后主动警报，提示用户发送 `/clear` 重置会话，清理冗长上下文，重新发送精简后的 Prompt。

- [ ] **Step 3: 运行 git diff 检查 opencode.md 修改**
  运行：`git diff .agentflow/prompts/opencode.md`
  期待：向下兼容、Git 刹车回退及 /clear 告警机制已完整写入。

- [ ] **Step 4: Commit 任务二**
  运行：
  ```bash
  git add .agentflow/prompts/opencode.md
  git commit -m "feat: upgrade opencode.md with git brake, backward compatibility, and /clear alert"
  ```

---

### Task 3: 优化 agentflow.py 及同步模板

**Files:**
- Modify: `.agentflow/agentflow.py`

- [ ] **Step 1: 修改 base_template 变量**
  定位 `.agentflow/agentflow.py` 中的 `sync_rules()` 内部的 `base_template` 变量（第 681-759 行左右）。
  重构模板：
  - 增加“四步闭环流”章节：探索（Explore）、规划（Plan）、实现（Implement）、提交（Commit）。
  - 将 `## 4. Vibe Coding 五大痛点与实战解法` 替换为新版的**“需求稳、结构稳、质量稳、排错稳、交付稳”**五稳指南。
  - 在 `## 6. Context Management & Security` 章节中增加“纠错 2 次失败强制重置 `/clear`”和“使用 `@file` 精确文件引用避免路径笼统”的具体指令。
  - 确保模板内的 Hermes、OpenCode 智能体职责概述与新版保持同步。

- [ ] **Step 2: 运行 git diff 检查 agentflow.py**
  运行：`git diff .agentflow/agentflow.py`
  期待：`base_template` 内容已更新，包含四步流、五稳原则、/clear 及精准引用的描述。

- [ ] **Step 3: Commit 任务三**
  运行：
  ```bash
  git add .agentflow/agentflow.py
  git commit -m "feat: update agentflow.py base_template with 5-steady, 4-step workflow, /clear, and file references"
  ```

---

### Task 4: 执行同步并验证规则文件生成

**Files:**
- Run Commands
- Create/Modify: `.cursorrules`, `.clinerules`

- [ ] **Step 1: 运行 agentflow.py sync 规则同步命令**
  在根目录运行：
  `python .agentflow/agentflow.py sync`
  期待输出：
  `[+] SQLite 缓存重构成功...`
  `[+] 成功更新规则文件: .cursorrules`
  `[+] 成功更新规则文件: .clinerules`

- [ ] **Step 2: 验证规则文件内容**
  使用文本阅读工具检查项目根目录下的 `.cursorrules` 与 `.clinerules`。
  检查项：
  - 是否包含 "需求稳、结构稳、质量稳、排错稳、交付稳" 五稳指南。
  - 是否包含关于 `/clear` 规避上下文腐化和 `@file` 精确引用的规则。
  - 是否包含新版 `hermes` 和 `opencode` 的提示词。

- [ ] **Step 3: 运行构建测试进行全局验证**
  在根目录运行：
  `npm run build` 或项目的验证命令，确保无语法报错，规则文件的修改不影响项目构建。

- [ ] **Step 4: Commit 所有同步产生的文件**
  运行：
  ```bash
  git add .cursorrules .clinerules
  git commit -m "chore: sync workspace cursorrules and clinerules to version 0.0.3"
  ```
