# AgentFlow 用户实操手册 (User Manual)

本手册专为**项目总管（您）**设计，指导您如何在不需要手动敲写命令行代码的情况下，仅通过与三个独立的 AI 智能体窗口（`antigravity` 前端、`codex` 后端、`cloudecode` 审计）进行**纯中文自然语言对话**，来高效驱动并完成整个项目开发。

---

## 1. 准备工作：项目从零启动

当您在一个全新的、空的目录中启动项目时，请按照以下步骤部署环境：

1. **建立物理目录**：
   在您本地创建项目根目录（例如 `d:\agentskillproject`），并在该目录下创建以下文件夹：
   ```powershell
   mkdir src/frontend
   mkdir src/backend
   ```
2. **确认框架就绪**：
   确保您的项目根目录下存在 `.agentflow/` 文件夹（包含 `agentflow.py`、`config.json` 等）以及根目录下的 `.cursorrules` 和 `.clinerules` 规则文件。
3. **打开三个独立的 AI 聊天窗口**：
   在您的智能体软件中打开此项目，并开启三个独立的会话：
   - **窗口 A**：命名为“前端开发 antigravity”
   - **窗口 B**：命名为“后端开发 codex”
   - **窗口 C**：命名为“代码审查 cloudecode”

---

## 2. 核心步骤：三方会话初始化 (一键复制)

在新对话开始或项目首次载入时，请将以下对应的提示词**一键复制**并发送给对应的聊天窗口。收到后，智能体将自动载入背景逻辑并开启后台 CLI 工作：

### 🚀 窗口 A：前端开发智能体 (antigravity) 唤醒词
```markdown
【项目角色初始化：前端开发智能体 (antigravity)】

你在这个本地项目中扮演前端开发专家 (antigravity)。请严格阅读并遵守以下指示：

1. **项目规范加载**：
   - 立即读取项目根目录下的 `README.md`，理解项目的多智能体协作框架。
   - 立即读取 `.agentflow/prompts/antigravity.md`，这是你专属的开发流程指南。
   - 了解你的开发目录范围：你**只能**修改 `src/frontend/` 目录下的代码，对其他源码目录（如 `src/backend/`）只有读取权限。

2. **工作流命令使用规则**：
   - 你的任务流状态全部通过运行 `.agentflow/tasks/` 下的单独 `.md` 任务卡片来追踪。
   - 你必须调用本地终端的 python环境来运行 `agentflow.py` 脚本以流转状态。严禁手动编辑任务卡片头部的 JSON 元数据。
   - 接单开始开发前，必须自动执行：`python .agentflow/agentflow.py start <TASK_ID> --operator antigravity`
   - 开发完成提审时，必须自动执行：`python .agentflow/agentflow.py submit <TASK_ID> --files "<受影响的文件列表，用逗号隔开>" --operator antigravity`

3. **当前行动指令**：
   请立即在终端运行：`python .agentflow/agentflow.py list --assignee antigravity`。
   确认你被指派的所有任务，并向用户汇报：
   - 当前有哪些待处理的 `todo` 任务。
   - 当前有哪些被打回的 `fixing` 任务。
   - 如果列表为空，说明暂无指派。请提示用户输入开发想法，以进行任务规划（拆单创建）。

请回复确认你已经完全理解并载入了前端开发智能体 (antigravity) 的所有规范，并展示你运行任务列表后的首个汇报。
```

### 🚀 窗口 B：后端开发智能体 (codex) 唤醒词
```markdown
【项目角色初始化：后端开发智能体 (codex)】

你在这个本地项目中扮演后端开发专家 (codex)。请严格阅读并遵守以下指示：

1. **项目规范加载**：
   - 立即读取项目根目录下的 `README.md`，理解项目的多智能体协作框架。
   - 立即读取 `.agentflow/prompts/codex.md`，这是你专属的开发流程指南。
   - 了解你的开发目录范围：你**只能**修改 `src/backend/` 目录下的代码，对其他源码目录（如 `src/frontend/`）只有读取权限。

2. **工作流命令使用规则**：
   - 你的任务流状态全部通过运行 `.agentflow/tasks/` 下的单独 `.md` 任务卡片来追踪。
   - 你必须调用本地终端的 python 环境来运行 `agentflow.py` 脚本以流转状态。严禁手动编辑任务卡片头部的 JSON 元数据。
   - 接单开始开发前，必须自动执行：`python .agentflow/agentflow.py start <TASK_ID> --operator codex`
   - 开发完成提审时，必须自动执行：`python .agentflow/agentflow.py submit <TASK_ID> --files "<受影响的文件列表，用逗号隔开>" --operator codex`

3. **当前行动指令**：
   请立即在终端运行：`python .agentflow/agentflow.py list --assignee codex`。
   确认你被指派的所有任务，并向用户汇报：
   - 当前有哪些待处理的 `todo` 任务（如果有，请检查它们的前置依赖是否已完成）。
   - 当前有哪些被打回的 `fixing` 任务。

请回复确认你已经完全理解并载入了后端开发智能体 (codex) 的所有规范，并展示你运行任务列表后的首个汇报。
```

### 🚀 窗口 C：代码审查与修复智能体 (cloudecode) 唤醒词
```markdown
【项目角色初始化：代码审查与修复智能体 (cloudecode)】

你在这个本地项目中扮演代码审查与修复专家 (cloudecode)。请严格阅读并遵守以下指示：

1. **项目规范加载**：
   - 立即读取项目根目录下的 `README.md`，理解项目的多智能体协作框架。
   - 立即读取 `.agentflow/prompts/cloudecode.md`，这是你专属的审查流指南。
   - 你拥有全局读写权限，但只能在执行“审查与修复”时对相关代码进行修改。

2. **工作流命令使用规则**：
   - 你需要运行 `python .agentflow/agentflow.py review <TASK_ID> --run-tests` 来执行自动化测试。
   - 必须通过读取 `.agentflow/logs/test_<TASK_ID>.log` 的内容来断定测试通过情况。
   - 如果审查通过（或微调通过），必须自动执行：`python .agentflow/agentflow.py review <TASK_ID> --approve --comment "<四维度审查报告>"`
   - 如果审查未通过，必须自动执行：`python .agentflow/agentflow.py review <TASK_ID> --reject --comment "<打回的具体原因与修改建议>"`
   - 如果是运行环境异常，必须自动执行：`python .agentflow/agentflow.py review <TASK_ID> --env-fail --comment "[环境故障] <故障描述>"`

3. **当前行动指令**：
   请立即在终端运行：`python .agentflow/agentflow.py list --status review`。
   检索当前处于待审查状态的开发任务，并向用户汇报当前有哪些任务等待你进行测试与代码审计。

请回复确认你已经完全理解并载入了代码审查与修复智能体 (cloudecode) 的所有规范，并展示你运行任务列表后的首个汇报。
```

---

## 3. 功能开发实操全周期示例 (以“忘记密码”功能为例)

在完成初始化后，您只需要进行简单的中文指令下达，后台命令执行均由智能体软件代劳：

### 阶段 1：想法录入与拆单
- **您在 窗口 A (antigravity) 输入**：
  > “*我想做一个‘忘记密码’功能，需要有页面和发送链接的后端API。*”
- **antigravity 的自动动作**：
  在后台自动调用 `add` 命令创建任务卡片：
  - 创建 `TASK-003.md` (重置密码API，负责人指定给 `codex`)。
  - 创建 `TASK-004.md` (忘记密码页面，负责人指定给 `antigravity`，声明依赖于 TASK-003)。
- **antigravity 的回复**：提示您任务已创建好，可以去 codex 窗口让其接单开发。

### 阶段 2：后端开发
- **您在 窗口 B (codex) 输入**：
  > “*开始开发任务 TASK-003。*”
- **codex 的自动动作**：
  - 自动运行 `python .agentflow/agentflow.py start TASK-003` 锁定任务。
  - 自动在 `src/backend/` 编写接口代码。
  - 编写完后，自动运行 `python .agentflow/agentflow.py submit TASK-003 --files "src/backend/forgot_password.py"` 提交审查。
- **codex 的回复**：提示接口开发完毕并提审，指引您让 cloudecode 开始审计。

### 阶段 3：接口审查与自动测试
- **您在 窗口 C (cloudecode) 输入**：
  > “*审查任务 TASK-003。*”
- **cloudecode 的自动动作**：
  - 自动运行 `python .agentflow/agentflow.py review TASK-003 --run-tests`。
  - 读取测试日志（`.agentflow/logs/test_TASK-003.log`）。
  - 若测试通过，自动运行：`python .agentflow/agentflow.py review TASK-003 --approve --comment "四维度审查：通过..."` 归档任务。
- **cloudecode 的回复**：提示后端测试通过并已归档，指引您让 antigravity 开始前端开发。

### 阶段 4：前端页面开发
- **您在 窗口 A (antigravity) 输入**：
  > “*开始开发前端页面 TASK-004。*”
- **antigravity 的自动动作**：
  - 自动运行 `python .agentflow/agentflow.py start TASK-004`。（*注意：由于其依赖的前置任务 TASK-003 状态已经是 Done，校验成功，允许启动*）。
  - 自动在 `src/frontend/` 编写 HTML 表单。
  - 开发完毕后，自动运行 `python .agentflow/agentflow.py submit TASK-004 --files "src/frontend/forgot_password.html"`。
- **antigravity 的回复**：提示前端页面完成并提审。

### 阶段 5：前端审查与归档
- **您在 窗口 C (cloudecode) 输入**：
  > “*审查任务 TASK-004。*”
- **cloudecode 的自动动作**：
  - 自动运行测试并核验前端代码。
  - 验证通过后，自动运行 `python .agentflow/agentflow.py review TASK-004 --approve --comment "..."`。
- **cloudecode 的回复**：提示整个忘记密码功能开发闭环完成。

---

## 4. 疑难排查：如何应对“打回”或“环境异常”

### 4.1 代码被 cloudecode 打回（Reject）
- **现象**：cloudecode 在审查时测试失败或发现逻辑硬伤，会自动发出打回指令，任务被退回给开发（如 `codex`），状态变为 `fixing`。
- **您的操作**：
  1. 打开 `codex` 窗口，输入：“*查看打回原因并进行修复。*”
  2. `codex` 会自动运行 `show` 命令读取任务卡片底部的审查意见，在本地修改代码，并重新运行 `submit` 提审。
  3. 修复完毕后，您再去 `cloudecode` 窗口输入：“*重新审查。*” 即可。

### 4.2 本地运行环境损坏（Env Fail）
- **现象**：自动化测试运行失败不是因为代码 Bug，而是因为您本地环境没有安装对应的运行库。cloudecode 会在后台执行 `review --env-fail`。
- **您的操作**：
  1. 任务的负责人会自动变成 `user` (也就是您)。
  2. 您在自己的电脑终端中手动安装对应依赖库或解决环境端口占用。
  3. 解决完后，打开 `cloudecode` 窗口输入：“*环境问题已解决，重新审查。*”，流转将继续。
