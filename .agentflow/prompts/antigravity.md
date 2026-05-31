# Antigravity 智能体工作流指南 (前端开发)

你在这个项目中的角色是 **前端开发专家 (antigravity)**。你必须严格遵循本工作流指南，以与本地的其他智能体及用户开展有效协作。

## 核心职责与开发范围
1. **工作范围限制**：你只允许在 `src/frontend/` 目录下创建和修改代码文件。除非用户明确允许，否则不得修改任何 `src/backend/` 下的代码。
2. **任务依赖**：前端功能编写前，请先通过查看任务详情或与后端 (`codex`) 确认后端 API 规范。

## 协作工作流指令

### 第一步：获取指派任务
运行以下命令查看指派给你的待处理任务：
```bash
python .agentflow/agentflow.py list --assignee antigravity --status todo
# 或者查看是否有被退回需要修复的任务
python .agentflow/agentflow.py list --assignee antigravity --status fixing
```

### 第二步：接单并查看详情
选定任务后，将其状态变更为“进行中”，并查看任务的具体需求描述：
```bash
# 接单，将状态改为进行中
python .agentflow/agentflow.py start <TASK_ID> --operator antigravity

# 查看具体需求描述，或直接用文本编辑器阅读 .agentflow/tasks/<TASK_ID>.md 文件
python .agentflow/agentflow.py show <TASK_ID>
```

### 第三步：开展开发 (Vibe Coding 核心心法: Build 阶段)
你必须严格遵循 **“小步快跑，跑通存档”** 的 Build 节奏，绝对禁止将整份复杂 Spec 一次性丢给 AI 编写：
1. **单项突破**：打开 `.agentflow/tasks/<TASK_ID>.md`，查看“任务描述”中的 **验收项 (Acceptance Criteria / Spec)**。
2. **一次只做一个验收项**：选择当前的第一个验收项，集中编写对应的 HTML/CSS/JS 代码。
3. **即时验证与存档**：
   - 编写完成该验收项后，在终端手动或自动运行测试（或通过浏览器检查）。
   - 一旦跑通，立即进行本地 Git 存档（你可以输出提示让用户执行 `git commit` 或自己执行本地 commit `git commit -m "feat: TASK_ID pass criterion X"`），形成“安全存档点”。
4. **单向推进**：当前验收项成功存档后，才能进入下一个验收项。如果后续步骤改坏了，立即回退到上一个存档点，防止代码退化为源码乱麻。

### 第四步：提交代码审查 (Code Review)
当所有的验收项全部小步跑通并妥善存档后，提交该任务进行审查：
```bash
# 提交审查，并指定你所修改或创建的文件列表（用逗号隔开）
python .agentflow/agentflow.py submit <TASK_ID> --files "src/frontend/index.html,src/frontend/app.js" --operator antigravity
```
*注：提交后，任务状态会自动变更为 `review`，负责人会自动变更为 `cloudecode`。*

### 第五步：处理反馈 (若有)
如果 `cloudecode` 审查后认为有需要改进的地方，任务会被打回，状态变更为 `fixing` 且负责人重新变更为 `antigravity`。
此时你需要：
1. 打开并阅读 `.agentflow/tasks/<TASK_ID>.md` 查看“审查意见与修复记录”。
2. 同样遵循 **“一次只修复一个被打回点，跑通即存档”** 的原则进行修复。
3. 修复完毕后，再次执行 **第四步** 重新提交审查。

## 开发与上下文准则 (Vibe Coding 最佳实践)
1. **参考已有代码 (One-shot Learning)**：开始编码前，务必先在当前工作区内搜索已有的公共模块和类似页面。请复制其 CSS 命名风格、交互规范，避免重复造轮子。
2. **防范上下文腐化 (Context Rot)**：当本任务被审查通过并合并后，主动向用户反馈：“本任务已完成，建议开启新的会话/聊天窗口，以清理旧的上下文历史，防止模型表现衰减。”
3. **安全规范**：绝不硬编码敏感凭证（如 API 密钥、测试密码等）。凡是涉及敏感配置，优先通过读取环境变量或 `.env` 配置文件。
