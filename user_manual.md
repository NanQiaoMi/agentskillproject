# AgentFlow 用户实操手册 (User Manual)

本手册专为**项目总管（您）**设计，指导您如何在不需要手动敲写命令行代码的情况下，仅通过与三个独立的 AI 智能体窗口（`antigravity` 前端、`codex` 后端、`cloudecode` 审计）进行**纯中文自然语言对话**，来高效驱动并完成整个项目开发。

---

## 1. 准备工作：AI 自动解压与搭建

在新项目启动时，您不需要手动解压文件或建立目录，直接让 AI 助手为您服务：

1. **拖入压缩包**：
   将您打包好的 `agentflow.zip`（包含 `.agentflow/` 文件夹及规则文件）拖入空的项目目录中。
2. **在 AI 窗口对话**：
   在您打开的 AI 会话中发送一句话：
   > “*帮我将当前目录下的 agentflow.zip 解压到当前项目根目录，并自动初始化 Git 本地仓库和物理目录结构。*”
   - AI 助手在收到指令后，会自动在后台终端调用解压命令、建立前端/后端源码目录并执行 `git init`。
3. **分流三个独立会话窗口**：
   框架搭建完成后，开启三个独立的会话窗口分别对应各个智能体角色：
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
## 3. 核心心法实操全周期示例 (以“忘记密码”功能为例)

AgentFlow 完美契合 **Brainstorm → Spec → Build** 这一最稳的 Vibe Coding 节奏。请遵循以下三个步骤进行项目落地：

### 阶段 1：Brainstorm (头脑风暴与 Grill-Me 深度访谈)
当您有一个原始功能想法时，**不要急于写代码或创建任务**：
1. **获取提示词**：您可以在终端运行 `python .agentflow/agentflow.py brainstorm` 获取最新的 Grill-Me 启动提示词，或者直接从下方复制。
2. **启动深度访谈**：打开与 `codex` (后端助手) 或 `antigravity` (前端助手) 的会话窗口，完整复制并发送以下提示词以启动脑暴流程：

```markdown
【Vibe Coding 脑暴阶段启动：Grill-Me 深度访谈】

你好！我准备为我的项目开发一个新功能。请扮演系统架构师，根据《大脑风暴与深度访谈 (Grill-Me) 实操规程》，使用 AskUserQuestion 工具对我在后台进行至少 6 轮的深度访谈以澄清需求。

我的初始创意为：[在此处填写您的创意，例如：实现‘找回/重置密码’功能]

请聚焦技术栈选型、交互逻辑细节、边界异常场景、潜在技术难点与盲区，避免询问浅显表面问题。深挖那些我可能忽略的难点和盲区，分轮次提问，每轮只提出 1-2 个最关键的问题。

请持续迭代提问，直至所有关键细节确认完毕，最终输出一份完整、可落地的详细项目开发文档（包括 docs/PRD.md, docs/DESIGN.md, docs/ARCHITECTURE.md 草案），并根据我的反馈反复优化，直到我完全满意。内容需要经过多次迭代。

现在，请向我提第一轮问题。
```

3. **进行访谈**：与 AI 进行至少 6 轮深度对话，补充并确认架构、色调、三态设计与异常逻辑细节，直至最终在 `/docs` 目录固化成 SDD 设计文档。

### 阶段 2：Spec (建立共识)
头脑风暴结束后，由智能体在后台自动调用 `add` 命令创建任务卡片。**此时创建的任务卡片即为您和 AI 开发前按下的“同意键”（Spec）**：
- 在后台生成 `TASK-003.md`（后端 API）和 `TASK-004.md`（前端页面，依赖 TASK-003）。
- **每个任务卡片必须包含明确的原子化“验收项清单（Acceptance Criteria）”**。例如 `TASK-003` 包含：
  - `[ ] 验收项 1: 调用 /api/forgot-password 传入不存在的邮箱时，返回 success: true（模糊返回防止撞库）`
  - `[ ] 验收项 2: 传入合规邮箱时，数据库生成有效 Token，并向测试日志中输出发送的 Mock 链接`

### 阶段 3：Build (小步开发，跑通存档)
这是开发阶段。**切忌将整份 Spec (任务描述) 丢给 AI 直接写完**。应指挥智能体执行以下节奏：
1. **启动并锁定任务**：
   在 `codex` 窗口输入：“*启动任务 TASK-003，拉出独立分支。*”
   - AI 自动执行 `python .agentflow/agentflow.py start TASK-003`，切入特征分支 `feature/task-003`。
2. **一次只做一个验收项**：
   在 `codex` 窗口指挥：“*我们先实现 TASK-003 中的 验收项 1（邮箱不合法检查与模糊响应），其他功能先不管。*”
   - AI 仅编写这部分逻辑。
3. **跑通并存档**：
   - 运行本地测试（或让 AI 编写临时验证脚本并执行）。
   - 确认通过后，指挥 AI 执行本地 commit 存档：`git commit -m "feat: TASK-003 pass criterion 1"`。
4. **递进完成，拒绝源码乱麻**：
   - 接着以同样“小步跑通、立刻存档”的节奏实现“验收项 2”。
   - 如果实现“验收项 2”时把之前的代码改坏了，**立刻回滚到 criterion 1 存档点**，避免代码陷入不可挽回的泥潭。
5. **提交审查**：
   所有验收项全部小步通过并存档后，AI 自动执行：
   ```bash
   python .agentflow/agentflow.py submit TASK-003 --files "src/backend/forgot_password.py" --operator codex
   ```
6. **审查与合并**：
   在 `cloudecode` 窗口跑测并审批。通过后，任务归档为 `done`，`feature/task-003` 自动安全合并到 `master` 且被删除。
7. **解锁前端任务**：
   此时，前端 `antigravity` 检测到前置依赖已 `done`，可以启动并以同样的“一次开发一个验收项”的节奏，完成 `TASK-004` 的前端页面编码。

---

## 4. 常见问题与容错机制

### 4.1 代码被 cloudecode 打回（Reject）
- **现象**：测试失败或四维度审计发现硬伤，任务退回 `fixing` 状态。
- **应对心法**：打开开发窗口，输入“*查看打回原因，按照‘一次只修复一个痛点，跑通即存档’的原则进行修复并重新提审*”。

### 4.2 本地运行环境损坏（Env Fail）
- **现象**：测试跑不通是因为本地缺少依赖库或本地端口冲突。
- **应对心法**：任务负责人会自动变成 `user`。您只需在自己的电脑终端中手动安装对应依赖库或解决环境问题，完成后在 cloudecode 窗口输入“*环境问题已解决，重新跑测*”即可。

