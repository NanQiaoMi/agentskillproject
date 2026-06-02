# MIMIcode Studio UI 重构设计规范 (UI Redesign Spec)

本规格说明书详细定义了将 MIMIcode Studio 客户端各个界面进行像素级复刻重构的设计方案。所有设计均基于用户提供的设计图细节，力求做到完整还原，不省略任何交互与视觉元素。

---

## 1. 任务看板 (Kanban Board) — `TasksView.tsx`

### 1.1 页面头部 (Header)
- **标题**：`Tasks Board` (左侧)。
- **操作键**：右侧包含 `Filter` 下拉按钮，`Group: Status` 分组选择器，以及搜索图标按钮。
- **新建任务**：保留顶部 `+ New Task` 键，点击调起创建任务弹窗。

### 1.2 看板列 (Kanban Columns)
- 分为四列排列：
  1. **Todo** (待处理)
  2. **In Progress** (进行中)
  3. **In Review** (审查中)
  4. **Done** (已完成)
- 每列头部展示列名称、当前任务数圆圈徽章。
- 列底部放置 `+ New Task` 快速创建按键。

### 1.3 看板任务卡片 (Task Cards)
- **卡片头部**：左侧展示灰色小字 ID（如 `TASK-142`），右侧展示对应状态的彩色状态小点。
- **卡片标题**：加粗的中文字体标题。
- **卡片底部**：
  - 左侧：渲染分配的智能体头像圈（带背景色和首字母）及智能体名字（如 `Codex`）。
  - 右侧：渲染优先级徽章。
    - `High` 优先级：浅红背景，红字，红色小点。
    - `Medium` 优先级：浅黄背景，黄字，黄色小点。
    - `Low` 优先级：浅蓝背景，蓝字，蓝色小点。

---

## 2. 任务详情与子任务 — `TaskDetailView.tsx`

### 2.1 主内容页签 (Tabs)
- 页签调整为：`Overview` (概览)、`Subtasks` (子任务)、`Files` (文件)、`Logs` (日志)、`Activity` (活动)。
- `Subtasks` 页签右侧带数字标记，如 `Subtasks (4)`。

### 2.2 任务元数据 (Task Metadata)
- 在页签下方展示：
  - **执行智能体 (Agent)**：展示智能体圆形头像及名称。
  - **优先级 (Priority)**：展示对应的优先级颜色徽章。
  - **截止日期 (Due Date)**：格式为 `YYYY-MM-DD`。

### 2.3 子任务列表 (Subtasks List)
- 展示带有勾选框的子任务列表。
- 已完成的子任务复选框呈选中状态，文本变灰并带删除线。
- 列表底部提供 `+ Add Subtask` 按钮。
- 每条子任务右侧显示执行智能体名称和当前日期（如 `2024-05-20`）或状态文本（如 `In Progress` 绿色、`To Do` 灰色）。

### 2.4 右侧辅助栏 (Right Side Pane)
- **描述 (Description)**：展示任务背景文本。
- **技术标准 (Technical Standards)**：复选框验收条件列表。
- **标签 (Tags)**：渲染标签胶囊，如 `auth`, `backend`, `api`。

---

## 3. Git Worktree 详情 — `WorktreesView.tsx`

### 3.1 页面布局
- 调整为左右双栏面板布局。

### 3.2 左半栏 (Basic Metadata)
- 标题为 `Worktree: wt-task-XXX`。
- 路径显示在标题下方。
- 字段列表：
  - **Branch (分支)**：显示当前开发分支，并附带绿色 `Active` 徽章。
  - **Base Branch (基准分支)**：如 `main`。
  - **Created (创建时间)**：日期时间字符串。
  - **Location (本地路径)**：物理磁盘绝对路径。
  - **Status (状态)**：如 `Clean`。
  - **Head Commit (当前提交)**：显示 commit 哈希及提交说明。
- 底部操作键：`Open in Finder / Explorer` (在资源管理器中打开) 和 `Open in Terminal` (在终端中打开)。

### 3.3 右半栏 (Changes & Commits)
- **文件变更 (File Changes)**：
  - 头部显示变更总结，如 `3 files changed +45 -12`。
  - 列表列出各变动文件的路径，右侧显示变动行数指示器（如 `+32 -4` 等）。
- **最近提交 (Recent Commits)**：
  - 列出当前分支最近的 3 条 Git 提交记录，显示哈希、信息、作者和时间戳。

---

## 4. 规格说明书 (Specifications) — `SpecificationsView.tsx`

### 4.1 页签导航
- 支持切换页签：`PRD`、`Design`、`Architecture`、`API Contracts`。

### 4.2 PRD 查看器
- 标题为 `PRD-001: 用户登录与权限系统`，带灰色 `Draft` 状态标。
- 头部右侧包含 `Edit` 和 `Export` 按钮。
- 正文排版：支持 Markdown 样式的标题分级、段落及列表。

### 4.3 架构图查看器 (Architecture)
- 渲染系统架构总体拓扑图：
  - 前端 (React) $\rightarrow$ API Gateway $\rightarrow$ 后端 (FastAPI)。
  - 下方连接：PostgreSQL (DB)、Redis (Cache)、MinIO / MIMI (Storage)。
- 下方配以“技术选型”列表。

---

## 5. 诊断页与日志查看器整合 — `DiagnosticsView.tsx`

### 5.1 子页签切换
- 顶部导航增加 `System Diagnostics` 和 `Logs` 双页签。

### 5.2 日志查看器 (Log Viewer)
- 筛选行：
  - 智能体筛选下拉框 (`All Agents`)。
  - 级别筛选下拉框 (`All Levels`)。
  - 时间筛选下拉框 (`Today`)。
  - 右侧带 `Search logs...` 输入框。
- 控制台窗口：
  - 黑底绿字，等宽字体。
  - 每行显示格式：`[时间戳] [级别] [智能体名] 日志详情`。
- 底部控制栏：`Auto scroll` 自动滚动开关，`Clear` 按钮，`Export` 按钮。

---

## 6. 系统设置 — `SettingsView.tsx`

### 6.1 Models (模型设置)
- 展示可用模型列表（Opus 4.5、Sonnet 3.7、GPT-4o、DeepSeek V3）。
- 首选主模型右侧加绿色 `Primary` 徽章。
- 提供 `Enable Model Fallback` 切换开关。
- 提供 API Keys 集中输入框（Anthropic Key, OpenAI Key, DeepSeek Key）和独立保存按钮。
- 底部带 `Test Connection` 测试键。

### 6.2 Agents (智能体配置)
- 顶部带 `+ Add Agent` 按钮。
- 列表包含智能体启用开关、介绍文本和选择运行模型的下拉框。

---

## 7. 新建项目向导 (New Project Wizard) — `src/components/NewProjectWizard.tsx`

### 7.1 触发与弹窗
- 点击主界面顶部工作区旁边的 "+" 触发新建项目多步引导弹窗。

### 7.2 步骤与内容
- 左栏步骤条：
  1. `Project Info` (项目基本信息，包含 Project Name、Description、Location 选择器、Git 初始化开关)。
  2. `Template`
  3. `Environment`
  4. `Agents Setup`
  5. `Review`
- 底部包含 `Cancel` 和 `Next` / `Finish` 控制键。
