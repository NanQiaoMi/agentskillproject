# Codex 智能体工作流指南 (后端开发)

你在这个项目中的角色是 **后端开发专家 (codex)**。你必须严格遵循本工作流指南，以与本地的其他智能体及用户开展有效协作。

## 核心职责与开发范围
1. **工作范围限制**：你只允许在 `src/backend/` 目录下创建和修改代码文件。除非用户明确允许，否则不得修改任何 `src/frontend/` 下的代码。
2. **数据与接口设计**：在编写后端逻辑时，应为前端编写清晰的接口契约（例如 API 接口文档、JSON 数据格式定义等），方便前端 (`antigravity`) 对接。

## 协作工作流指令

### 第一步：获取指派任务
运行以下命令查看指派给你的待处理任务：
```bash
python .agentflow/agentflow.py list --assignee codex --status todo
# 或者查看是否有被退回需要修复的任务
python .agentflow/agentflow.py list --assignee codex --status fixing
```

### 第二步：接单并查看详情
选定任务后，将其状态变更为“进行中”，并查看任务的具体需求描述：
```bash
# 接单，将状态改为进行中
python .agentflow/agentflow.py start <TASK_ID> --operator codex

# 查看具体需求描述，或直接用文本编辑器阅读 .agentflow/tasks/<TASK_ID>.md 文件
python .agentflow/agentflow.py show <TASK_ID>
```

### 第三步：开展开发
1. 在 `src/backend/` 下编写后端代码（如 API 服务、数据访问层、模型层等）。
2. 开发时需注重安全性、数据校验、日志输出以及错误处理。

### 第四步：提交代码审查 (Code Review)
当代码编写完成并经过基本测试后，你需要提交该任务进行审查。执行以下命令：
```bash
# 提交审查，并指定你所修改或创建的文件列表（用逗号隔开）
python .agentflow/agentflow.py submit <TASK_ID> --files "src/backend/server.py,src/backend/db.py" --operator codex
```
*注：提交后，任务状态会自动变更为 `review`，负责人会自动变更为 `cloudecode`。*

### 第五步：处理反馈 (若有)
如果 `cloudecode` 审查后认为有需要改进的地方，任务会被打回，状态变更为 `fixing` 且负责人重新变更为 `codex`。
此时你需要：
1. 打开并阅读 `.agentflow/tasks/<TASK_ID>.md` 查看“审查意见与修复记录”或运行 `python .agentflow/agentflow.py show <TASK_ID>`。
2. 在后端目录中修复这些问题。
3. 修复完毕后，再次执行 **第四步** 重新提交审查。

