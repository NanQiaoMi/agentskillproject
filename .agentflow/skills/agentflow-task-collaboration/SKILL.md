---
name: agentflow-task-collaboration
description: 本地多智能体协作开发与任务管理技能，规范 antigravity (前端开发)、codex (后端开发)、cloudecode (代码审查与修复) 在本地工作区中的代码编写、测试运行、审计通过以及状态流转的一整套闭环动作。
---

# AgentFlow 本地多智能体协作开发与任务管理技能

本技能用于规范当前项目工作区中 `antigravity`、`codex` 和 `cloudecode` 三个角色的日常开发及协作动作，确保本地任务状态机的一致性与代码库的稳定性。

---

## 1. 技能适用场景与触发条件
- **场景**：当大模型智能体接手本项目工作区，需要开展任何前端、后端开发，或是代码审计、问题修复时。
- **触发**：智能体在载入工作区后，应第一时间自主阅读并执行此技能。

---

## 2. 角色分工与执行规范 (Personas & Boundaries)

智能体在执行任务前，必须明确自己当前代表的角色，并遵守其特定的写入和执行权限边界：

### 2.1 前端开发智能体 (antigravity)
- **写入权限范围**：仅限 `src/frontend/` 目录。
- **操作指令**：
  1. 通过终端执行：`python .agentflow/agentflow.py list --assignee antigravity --status todo` 获取待办。
  2. 接单并变更状态为进行中：`python .agentflow/agentflow.py start <TASK_ID> --operator antigravity`。
  3. 修改 `src/frontend/` 中的代码，编写完成后，运行提审命令：`python .agentflow/agentflow.py submit <TASK_ID> --files "src/frontend/<修改的文件>" --operator antigravity`。

### 2.2 后端开发智能体 (codex)
- **写入权限范围**：仅限 `src/backend/` 目录。
- **操作指令**：
  1. 通过终端执行：`python .agentflow/agentflow.py list --assignee codex --status todo` 获取待办。
  2. 接单并变更状态为进行中：`python .agentflow/agentflow.py start <TASK_ID> --operator codex`。
  3. 修改 `src/backend/` 中的代码，编写完成后，运行提审命令：`python .agentflow/agentflow.py submit <TASK_ID> --files "src/backend/<修改的文件>" --operator codex`。

### 2.3 代码审查与修复智能体 (cloudecode)
- **读写权限范围**：全局工作区，重点审查 `affected_files` 中列出的改动。
- **操作指令**：
  1. 获取审查任务：`python .agentflow/agentflow.py list --status review`。
  2. 执行自动化测试核验代码：`python .agentflow/agentflow.py review <TASK_ID> --run-tests`。
  3. 根据测试日志（`.agentflow/logs/test_<TASK_ID>.log`）判断是否通过：
     - 若通过：`python .agentflow/agentflow.py review <TASK_ID> --approve --comment "审查报告内容..."`。
     - 若为微小缺陷直接在本地修复，并在 comments 中附带具体修复记录后予以通过。
     - 若逻辑不合格：`python .agentflow/agentflow.py review <TASK_ID> --reject --comment "打回的明确理由"`。
     - 若本地环境缺失导致测试无法启动：`python .agentflow/agentflow.py review <TASK_ID> --env-fail --comment "提示用户排查环境"`。

---

## 3. 核心工具与命令清单
本技能强依赖于 `.agentflow/agentflow.py` CLI 脚本。任何涉及任务流状态的更改，**必须**使用对应的 CLI 命令，严禁通过手动编辑 `.agentflow/tasks/TASK-XXX.md` 中的 JSON 头部元数据。

- **添加任务**：`python .agentflow/agentflow.py add --title "标题" --desc "需求" --assignee "<负责人>"`
- **查看任务**：`python .agentflow/agentflow.py show <TASK_ID>`
- **变更状态**：`python .agentflow/agentflow.py start / submit / review` 等子命令。

---

## 4. 人机协同与熔断避错规范
1. **防死循环逻辑**：如果同一个任务在 `history` 里的 `review` <-> `fixing` 的状态交替次数已达到 3 次，且均由于相同原因未能通过，则 `cloudecode` 不得再次 reject。应当直接在 comment 中输出求助信息并使用 `--env-fail` 将 assignee 指定给 `user`（用户），暂停自动流水线以引入人工调试。
2. **Git 冲突处理**：框架不会对代码文件进行写保护锁定。如果智能体在写入时发现由于人机并发修改导致了 Git 冲突，智能体应立即中断当前任务，并输出提示信息请用户在本地解决冲突。
