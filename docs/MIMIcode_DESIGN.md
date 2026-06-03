# MIMIcode 桌面端研发软件系统设计与规范 (SDD)

本设计文档详细记录了基于 AgentFlow 本地多智能体协作框架升级为桌面端 **MIMIcode** 软件的系统架构、智能体分工、运行机制与 UI 交互规范。

---

## 一、 系统定位与智能体分工 (Agent Division of Labor)

MIMIcode 是一个高度自动化的本地开发环境。系统运行 5 个各司其职的智能体/CLI，形成“脑暴-规划-执行-重构-评审”闭环：

| 角色名称 | 类型 | 核心职责 | 修改权限范围 |
| :--- | :--- | :--- | :--- |
| **Hermes Agent** | Agent (Planner) | 接收用户创意，进行 6 轮以上 Grill-Me 脑暴，生成/更新 PRD/设计/架构文档，拆解 Epics 并调用 CLI 创建原子任务卡。 | `docs/` 目录及任务数据库 |
| **OpenCode CLI** | CLI Tool | 执行跨文件的复杂重构、代码搜索与批量修改，辅助开发 Agent。 | 全局源码目录（按指令执行） |
| **Antigravity** | Agent (Frontend) | 领单执行前端开发，编写组件、页面、动效，遵守统一 UI UX 规范。 | `src/frontend/` 目录 |
| **Codex** | Agent (Backend) | 领单执行后端开发，编写 API 接口、业务逻辑、数据库 schema。 | `src/backend/` 目录 |
| **Claudecode** | Agent (Reviewer) | 运行多阶段自动化质量门禁跑测，审计代码，判定是否通过并合并。 | 全局读写（仅限合并与打回操作） |

---

## 二、 技术栈选型 (Technology Stack)

*   **外壳框架**：Tauri v2 (基于 Rust)
*   **前端框架**：React + Vite + TypeScript + Tailwind CSS + shadcn/ui 组件库
*   **通信协议**：Tauri Commands (Rust IPC)
*   **任务元数据存储**：SQLite 数据库（`.agentflow/tasks.db`）作为高性能缓存
*   **密钥存储**：系统原生密钥环（Windows Credential Manager / macOS Keychain），通过 Tauri Keyring 插件集成
*   **配置文件**：操作系统 AppData 路径下的加密 JSON 配置文件，防密钥明文泄露

---

## 三、 并发与进程生命周期管理 (Lifecycle & Concurrency)

### 1. 并发隔离：Git Worktree 机制
为了允许多个任务并发执行且互不干扰，Tauri 在 Rust 层接管 Git Worktree 的生命周期：
*   **开启任务**：当用户在桌面端启动某个任务 `TASK-XXX` 时，Tauri 调用 Rust `Command` 执行：
    ```bash
    git worktree add ../worktrees/TASK-XXX feature/task-xxx
    ```
*   **路径映射**：该任务下运行的 CLI 工具（如 `antigravity`）其运行的工作路径（`cwd`）被映射重定向至 `../worktrees/TASK-XXX`。
*   **任务合入**：`claudecode` 审查通过并执行 `git merge` 合并到主开发分支后，Tauri 自动清理 Worktree 物理目录与特征分支：
    ```bash
    git worktree remove ../worktrees/TASK-XXX
    git branch -d feature/task-xxx
    ```

### 2. 守护进程运行 (Daemonization)与日志重连
*   **Detached 启动**：当 Agent 启动运行时，Tauri 以 detached 模式生成子进程，避免 GUI 关闭导致 CLI 任务异常终止。
*   **日志持久化**：所有 `stdout`/`stderr` 重定向输出至物理文件 `.agentflow/logs/test_TASK-XXX.log`。
*   **日志读取与重连**：前端 UI 通过 `xterm.js` 实时流式读取该日志文件。软件重启时，通过扫描运行中的子进程 PID 重新挂载，实现日志无感恢复。

### 3. 环境诊断中心与自愈
*   桌面端内置诊断中心，启动时自动检测 Python, Git, OpenCode CLI, Hermes Agent。
*   如果缺少 Python 依赖，使用 `uv` 包管理器极速创建隔离的 Python 虚拟环境并静默安装框架运行所需依赖，实现一键式自愈。

---

## 四、 视觉风格与交互规范 (UI/UX Specification)

MIMIcode 采用 **现代科技极简风 (Sleek Slate & Modern SaaS)**，打造高品质、高保真开发体验：

1.  **颜色系统**：
    *   **主背景色**：优雅深灰色（Zinc-950 `#09090b`）
    *   **卡片/面板背景**：半透明毛玻璃面板（Zinc-900 `#18181b`，透明度 80%，`backdrop-filter` 模糊）
    *   **边框**：极细边框（`#27272a`），透明度 50%
    *   **高亮/提示色**：通过使用柔和绿（`emerald-500`），运行中/待审使用琥珀黄（`amber-500`），打回/错误使用朱红（`red-500`）。
2.  **布局设计（双面板布局）**：
    *   **左侧面板**：结构化状态区，包含开发看板（Kanban 卡片拖拽流转）、环境检测卡片、当前激活分支、EPIC 关系链。
    *   **右侧面板**：可折叠开发者控制台，内置 `xterm.js` 实时显示当前运行 Agent 的完整流式日志。
3.  **交互拦截（Interception Modal）**：
    *   当 Hermes 进行 Grill-Me 深度访谈或开发 Agent 遇到异常需要人类输入时，右侧终端面板上方自动呈现半透明毛玻璃遮罩输入框，将纯文本终端对话转换为高雅的图形化表单与输入框。
