# AgentFlow 框架从零构建指南 (Bootstrap Guide)

本指南指导您在任何本地空目录下，通过向 AI 助手提供一个**项目名称**，让 AI 全自动创建对应的项目文件夹、解压或部署完整的 **AgentFlow** 极简多智能体协同开发框架：

1.  **【一键复制】动态项目创建与部署提示词**：直接发给 AI 助手，提供项目名称，指示其全自动部署。
2.  **【输入文档】框架设计规格说明书**：定义框架的目录、CLI 命令、状态机与 Git 分支管理逻辑。

---

## 资产一：【一键复制】动态项目创建与部署提示词

请新建一个 AI 助手会话（确保能读写本地工作区），修改并发送以下内容：

```markdown
【项目启动：全自动创建新项目并部署 AgentFlow 框架】

【我的项目名称】：<请在此处输入您的项目名称，如：MyAmazingApp>

你好！我需要在当前本地目录下，为我的新项目全自动创建对应的文件夹并部署 AgentFlow 多智能体协作框架。请扮演系统运维与架构专家，利用你的终端命令执行和文件管理工具，在后台自动完成以下搭建动作（我不需要手动操作任何终端）：

1. 在当前目录下，创建一个以【我的项目名称】命名的子文件夹（以下简称为项目目录）。
2. 在后台自动解压当前目录下的 `agentflow.zip` 压缩包，将里面所有的框架文件释放到项目目录中。确保释放后包含：
   - 项目目录/.agentflow/ (包含控制脚本 agentflow.py, 配置文件 config.json, prompts/规程)
   - 项目目录/.cursorrules (自动生效的 Cursor 规则)
   - 项目目录/.clinerules (自动生效的 Cline 规则)
3. 动态配置 config.json：
   - 自动修改项目目录下的 `.agentflow/config.json`，将里面的 `"project_name"` 字段更新为我的【我的项目名称】。
4. 建立基本的物理源码目录：
   - 在项目目录下创建 `src/frontend/` 与 `src/backend/`。
   - 在项目目录下创建 `docs/` 用于存放设计共识文档。
5. 初始化本地 Git 仓库并做首次 Commit 存档：
   - 进入项目目录，在后台自动运行 `git init`。
   - 执行 `git add .` 与 `git commit -m "chore: initialize AgentFlow project"`。

搭建完成后，请告知我项目已成功创建在哪个路径，并详细列出已成功部署的结构。
```
1. 创建如下基础目录结构：
   - `.agentflow/` (主配置及脚本)
   - `.agentflow/tasks/` (去中心化任务卡片库)
   - `.agentflow/logs/` (自动化测试日志归档)
   - `.agentflow/prompts/` (智能体专属系统提示词)
   - `src/frontend/` (前端源码保护区)
   - `src/backend/` (后端源码保护区)

2. 自动编写核心控制脚本 `.agentflow/agentflow.py`：
   - 用 Python 3.x 编写，无外部依赖。
   - 实现任务的 CRUD（子命令：add, list, show）。
   - 实现状态机流转控制：
     - `start <TASK_ID>`：校验 dependencies 下的前置任务是否已 Done。通过后切入或创建 feature/task-xxx 本地 Git 分支，并将状态置为 in_progress。
     - `submit <TASK_ID>`：将特征分支修改 add 并 commit，指派给 claudecode 并将状态置为 review。
     - `review <TASK_ID> --run-tests`：顺序执行 config.json 中配置的 lint_command、type_check_command 和 test_command，重定向控制台输出到 .agentflow/logs/test_TASK-XXX.log，捕获退出码。
     - `review <TASK_ID> --approve`：状态置为 done，指派给 user。在特征分支上做最后一次 commit，然后切回 master/main 主分支，执行 --no-ff 安全合并特征分支，并在本地彻底删除该特征分支。
     - `review <TASK_ID> --reject`：状态置为 fixing，指派回原开发，保留在当前特征分支上。
     - `review <TASK_ID> --env-fail`：挂起状态，指派给 user，提示人类总管进行环境故障排除。

3. 自动创建配置文件 `.agentflow/config.json`：
   - 规定 scopes 划分（frontend, backend）及各角色的职责作用域。
   - 预设空或占位式的代码风格与跑测命令（支持用户后期覆盖）。

4. 自动生成 3 个智能体的中文专属规程文档：
   - `.agentflow/prompts/antigravity.md` (前端开发规程，限制在 src/frontend/)
   - `.agentflow/prompts/codex.md` (后端开发规程，限制在 src/backend/)
   - `.agentflow/prompts/claudecode.md` (代码审查与修复规程，包含三态校验、防死循环熔断、Production Readiness 核对)

5. 在项目根目录下自动创建项目级 IDE 卡点规则文件：
   - `.cursorrules` 与 `.clinerules`。
   - 写入严苛的工作区限制：角色只写作用域，必须 start 锁定任务，必须一次只开发一个 Acceptance Criteria 验收项，跑通后必须 commit 微存档，遇到代码崩溃立即 reset --hard 回滚。

6. 创建一个说明文档 `README.md`。

请在完成以上所有文件的创建与编写后，向我列出所有已成功创建的文件结构，并详细向我汇报如何开展首个任务的脑暴与开发。
```

---

## 资产二：【输入文档】框架设计规格说明书 (Spec Document)

本文件是构建 `.agentflow/` 框架的底层设计蓝图，由人类或母体 AI 用作开发校验源：

### 1. 物理目录拓扑规范
```text
.
├── .agentflow/
│   ├── config.json          # 全局配置及跑测门禁指令定义
│   ├── agentflow.py         # 任务流状态机与 Git 分支管理器 (CLI)
│   ├── tasks/               # 单任务 Markdown 卡片存储目录
│   ├── logs/                # 测试重定向日志归档目录
│   └── prompts/             # 三方协作专属提示词规程
│       ├── antigravity.md   # 前端规程
│       ├── codex.md         # 后端规程
│       └── claudecode.md    # 审计规程
├── src/
│   ├── frontend/            # 前端写保护区
│   └── backend/             # 后端写保护区
├── .cursorrules             # Cursor 客户端自动化拦截器
└── .clinerules              # Cline / Roo Code 自动化拦截器
```

### 2. 状态机迁移状态与迁移条件
任务卡片（`.agentflow/tasks/TASK-XXX.md`）中的状态转移必须满足以下硬性条件：
*   `todo` $\rightarrow$ `in_progress`：
    *   **触发命令**：`python .agentflow/agentflow.py start TASK-XXX`
    *   **拦截条件**：如果 `dependencies` 清单中有任何一个任务卡片的 `status` 字段不等于 `done`，立即报错中断，拒绝流转。
    *   **Git 动作**：自动在本地执行 `git checkout -b feature/task-xxx`，如果分支已存在，执行 `git checkout feature/task-xxx`。
*   `in_progress` / `fixing` $\rightarrow$ `review`：
    *   **触发命令**：`python .agentflow/agentflow.py submit TASK-XXX --files "src/frontend/file.html"`
    *   **Git 动作**：在本地自动执行 `git add .` 与 `git commit -m "feat: implement TASK-XXX code"`，将受影响的文件路径存入卡片 `affected_files` 字段，把 `assignee` 变更为 `claudecode`。
*   `review` $\rightarrow$ `done`：
    *   **触发命令**：`python .agentflow/agentflow.py review TASK-XXX --approve --comment "..."`
    *   **Git 动作**：首先对卡片状态修改进行 commit 存档。然后安全切回主干分支 `master`/`main`。执行非快进合并：`git merge feature/task-xxx --no-ff`，成功后物理清理分支：`git branch -d feature/task-xxx`。
*   `review` $\rightarrow$ `fixing`：
    *   **触发命令**：`python .agentflow/agentflow.py review TASK-XXX --reject --comment "..."`
    *   **Git 动作**：状态变更为 `fixing`，指派人归还给原开发人员，工作区回切到特征分支 `feature/task-xxx` 以便开发修复。
*   `review` $\rightarrow$ `review (user挂起)`：
    *   **触发命令**：`python .agentflow/agentflow.py review TASK-XXX --env-fail --comment "..."`
    *   **拦截目的**：将负责人转交给 `user`。测试命令由于本地缺少基础运行库中断时，开发代码本身无罪，交由人类修复运行环境，修复后重新提审。

### 3. 配置格式规格 (config.json)
```json
{
  "project_name": "myproject",
  "version": "1.0.0",
  "scopes": {
    "frontend": "src/frontend",
    "backend": "src/backend"
  },
  "roles": {
    "antigravity": { "role": "frontend", "scope": "src/frontend" },
    "codex": { "role": "backend", "scope": "src/backend" },
    "claudecode": { "role": "reviewer", "scope": "all" }
  },
  "backend": {
    "lint_command": "python -m py_compile src/backend/my_script.py",
    "test_command": "python src/backend/my_script_test.py"
  }
}
```

### 4. 任务 Markdown 文件规约
每个生成的任务卡片文件必须以 HTML 注释作为元数据包裹（Frontmatter）：
```markdown
<!-- agentflow
{
  "id": "TASK-XXX",
  "title": "任务简述",
  "assignee": "指派给的人",
  "status": "todo|in_progress|review|fixing|done",
  "dependencies": ["TASK-001"],
  "affected_files": [],
  "comments": [],
  "history": []
}
-->
# TASK-XXX: 任务简述

## 任务描述
(此处为人类和开发智能体阅读的具体功能 Spec，必须列出明确的 验收项 - [ ] 清单)
```
通过以上规格说明，AI 开发助手将有 100% 确定性的参考源来从零构建出高健壮性的 AgentFlow 协同引擎。
