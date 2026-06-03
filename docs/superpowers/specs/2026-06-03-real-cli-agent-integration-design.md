# 真实 CLI 智能体后端接入设计规程

本文档设计了将真实 CLI 智能体（Hermes, Antigravity/Gemini, Codex, Claude Code, OpenCode）通过 Rust 后端无窗口静默启动并捕获输出，在 MIMIcode Studio 软件前端聊天对话框中直接展示的集成方案。

## 1. 目标与背景

当前 MIMIcode Studio 的聊天界面在输入 `@Antigravity` 等特定 Agent 时，仅在前端模拟了大模型的对话回复（调用了云端的 Sensenova DeepSeek-V4-Flash 模型），并未真正启动本地底层的 CLI 智能体去修改代码、执行测试或重构项目。
本设计将替换这一模拟对话逻辑：当用户在聊天对话框中激活或 @ 提及某个智能体时，直接在 Rust 后端以非交互模式启动其本地 CLI 工具，在任务指定的 Git 工作区或项目路径下自动运行，并将执行后的终端详细日志/答复返回，作为该 Agent 的正式对话回复显示在前端聊天界面中。

## 2. 后端设计 (Rust Tauri Command)

在 `mimicode-desktop/src-tauri/src/lib.rs` 中新增一个 Tauri 命令 `run_agent_cli`：

### 2.1 函数签名
```rust
#[tauri::command]
pub async fn run_agent_cli(
    cli_name: String,
    project_path: String,
    task_id: Option<String>,
    prompt: String,
) -> Result<String, String>;
```

### 2.2 工作目录解析规则
1. 如果 `task_id` 存在（如 `TASK-101`），则检测位于项目父级目录的 Git 工作区：
   `let worktree_dir = parent_dir.join("mimicode_worktrees").join(task_id.to_uppercase());`
2. 如果该工作区目录存在，则将执行的当前工作目录 (`current_dir`) 设置为该工作区目录。
3. 否则，默认在 `project_path`（主项目目录）中运行。

### 2.3 智能体 CLI 可执行文件及参数映射
不同智能体 CLI 的无提示、非交互式一键运行配置参数如下：
- **hermes**:
  - 路径：`C:\Users\Legion\AppData\Local\hermes\hermes-agent\venv\Scripts\hermes.exe`
  - 参数：`["-z", prompt]`
- **antigravity**:
  - 路径：`D:\npm_global\gemini.cmd`
  - 参数：`["-p", prompt, "-y"]`
- **codex**:
  - 路径：`D:\npm_global\codex.cmd`
  - 参数：`["exec", prompt, "--dangerously-bypass-approvals-and-sandbox"]`
- **claudecode**:
  - 路径：`D:\npm_global\claude.cmd`
  - 参数：`["-p", prompt, "--permission-mode", "bypassPermissions"]`
- **opencode**:
  - 路径：`D:\npm_global\opencode.cmd`
  - 参数：`["run", prompt, "--dangerously-skip-permissions"]`

### 2.4 进程执行与捕获
使用 Rust 的 `std::process::Command` 启动可执行文件，隐藏命令行窗口（Windows 下设置 `CREATE_NO_WINDOW = 0x08000000`），将标准输出 `stdout` 与标准错误 `stderr` 统一捕获，并作为 `String` 返回给前端。如果进程返回非 0 退出状态，也将详细错误捕获并返回。

---

## 3. 前端设计 (React ChatView.tsx)

在 `mimicode-desktop/src/views/ChatView.tsx` 中修改 `handleSubmit` 逻辑：

### 3.1 激活的智能体判定
利用已有的 `getActiveAgent` 解析当前对话的智能体信息（根据 `@` 提及、上下文上一次回复或任务默认指派人）：
- 如果 `activeAgent.file` 为 `null`（代表统筹大脑 `MIMIcode`），继续走原有的云端大模型回复机制。
- 如果 `activeAgent.file` 不为 `null`（值为 `'hermes'`, `'antigravity'`, `'codex'`, `'claudecode'`, `'opencode'` 之一），则触发本地 CLI 执行。

### 3.2 对话框执行与状态展示
当需要触发本地 CLI 时：
1. 前端向界面实时渲染一条用户输入的消息，并将聊天输入框清空、禁用以防重复提交。
2. 将 `thinkingAgent` 设置为当前 Agent 的姓名，设置 `isThinking(true)`，展示“思考中...”状态。
3. 调用 Tauri 命令：
   ```typescript
   const replyText = await invoke<string>('run_agent_cli', {
     cliName: activeAgent.file,
     projectPath,
     taskId: selectedTask ? selectedTask.id : null,
     prompt: userMsg
   });
   ```
4. 将捕获的终端返回文本（`replyText`）构造为一条新的 comment，作者 (`author`) 设为该智能体名（例如 `"Antigravity"`），保存写入 markdown 文件并触发 `sync` 同步，最后在聊天框界面渲染出来。
5. 关闭 `isThinking` 状态，恢复输入框可用状态。

---

## 4. 验证计划

1. **自动编译测试**：执行 `cargo check` 和 `npm run build` 确保 Rust 后端和 React 前端编译成功，没有类型错误。
2. **人工测试**：
   - 启动软件，打开一个任务卡片（例如包含 Git 工作区的任务）。
   - 在聊天栏输入 `@Antigravity 创建一个 hello_world.html` 并回车。
   - 验证后台是否自动调用 `gemini.cmd` 并在该任务的 Git 工作区目录下成功创建了该文件。
   - 验证对话框是否成功显示了 `Antigravity` 真实终端输出日志，且没有报错。
