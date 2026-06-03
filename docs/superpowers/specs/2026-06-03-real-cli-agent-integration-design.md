# 真实 CLI 智能体后端集成与生命周期控制设计规程

本文档详细规范了将真实本地 CLI 智能体（Hermes, Antigravity/Gemini, Codex, Claude Code, OpenCode）接入 MIMIcode Studio 对话框的架构设计、数据流、异常边界与生命周期管理机制。

## 1. 架构目标

彻底替换聊天对话框的模拟 AI 回复（云端 LLM 直连），使其直接绑定本地 CLI。当在聊天中激活某个智能体（如 `@Antigravity` 或指派智能体）时，在后台以无窗口、非交互模式（One-shot/Headless）启动该智能体对应的本地命令行程序。执行结束后，将其终端输出渲染至聊天对话框中，并同步记录到对应的任务 Markdown 文档中。

---

## 2. 后端设计 (Rust Tauri Command)

后端主要新增两个核心命令：`run_agent_cli` 用于运行 CLI，`stop_agent_cli` 用于中止当前正在运行的进程。

### 2.1 进程与生命周期管理

后端在 Rust 中引入一个线程安全的全局进程管理器（使用 `std::sync::Mutex` 或 `lazy_static` 包装的 `HashMap<String, u32>`），用来存储当前正在运行的任务或 CLI 名称与其进程 ID (PID) 的映射关系。

```rust
use std::collections::HashMap;
use std::sync::Mutex;
use lazy_static::lazy_static;

lazy_static! {
    static ref RUNNING_AGENTS: Mutex<HashMap<String, u32>> = Mutex::new(HashMap::new());
}
```

- **任务注册**：当启动一个 CLI 进程时，将其 PID 注册进 `RUNNING_AGENTS`（Key 可使用 `format!("{}_{}", project_path, cli_name)`）。
- **任务注销**：进程运行正常结束或被中止时，将其从 Map 中移除。
- **中止机制 (`stop_agent_cli`)**：前端点击中止时，Rust 后端根据 Key 查找到 PID，调用系统指令（Windows 下使用 `taskkill /F /PID <pid> /T` 强杀子进程树），以释放文件锁并立即释放资源。

### 2.2 Tauri 命令签名

#### 1. 运行 CLI 智能体
```rust
#[tauri::command]
pub async fn run_agent_cli(
    cli_name: String,
    project_path: String,
    task_id: Option<String>,
    prompt: String,
) -> Result<String, String>;
```

- **执行路径解析与自动降级**：
  1. 如果存在 `task_id`，且项目父级目录的 Git 工作区目录 `parent_dir.join("mimicode_worktrees").join(task_id.to_uppercase())` 存在，则将执行的 `current_dir` 设为该工作区。
  2. 若该工作区目录不存在，则自动降级回退到 `project_path`（主项目路径）中执行。
- **环境变量**：不主动注入凭证密钥，由进程继承操作系统环境变量（用户需自己在 Windows 系统级配置好如 `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` 等环境变量）。
- **CLI 映射与非交互式命令组合**：
  - **hermes**: `"C:\\Users\\Legion\\AppData\\Local\\hermes\\hermes-agent\\venv\\Scripts\\hermes.exe"` | 参数：`["-z", prompt]`
  - **antigravity**: `"D:\\npm_global\\gemini.cmd"` | 参数：`["-p", prompt, "-y"]`
  - **codex**: `"D:\\npm_global\\codex.cmd"` | 参数：`["exec", prompt, "--dangerously-bypass-approvals-and-sandbox"]`
  - **claudecode**: `"D:\\npm_global\\claude.cmd"` | 参数：`["-p", prompt, "--permission-mode", "bypassPermissions"]`
  - **opencode**: `"D:\\npm_global\\opencode.cmd"` | 参数：`["run", prompt, "--dangerously-skip-permissions"]`

#### 2. 中止 CLI 智能体
```rust
#[tauri::command]
pub async fn stop_agent_cli(cli_name: String, project_path: String) -> Result<(), String>;
```
- 根据 `project_path` 与 `cli_name` 拼接 key 查找到正在运行进程的 PID。
- 使用强杀子进程树命令结束进程：`Command::new("taskkill").args(&["/F", "/PID", &pid.to_string(), "/T"]).output()`。

### 2.3 终端输出控制字符的过滤（清洗）

从 stdout/stderr 捕获的文本需要经过清洗才可记录，清洗逻辑包含：
- **后端清洗**：使用正则表达式过滤掉终端动态刷新序列，例如 `\r` (回车退格)、`\x1b[K` (清除行)、退格键控制符、重复的进度条重画码以及光标移动码。
- 保留静态 ANSI 彩色/字形样式代码（如 `\x1b[32m` 绿色、`\x1b[1m` 粗体），交由前端解析。

---

## 3. 前端设计 (React ChatView.tsx)

前端重点负责**思考与中止状态控制**、**终端颜色样式渲染**以及**大体积日志的归档链接处理**。

### 3.1 界面交互流与生命周期控制
- **发送消息**：用户在输入框发送 Prompt，消息推入 `localComments`，清空并禁用输入框与发送按钮。
- **运行态呈现**：将 `thinkingAgent` 设为对应 Agent（如 Antigravity），设置 `isThinking(true)`。
- **中止按钮**：在“思考中...”消息框右侧呈现“中止运行”的红色按钮。点击时，调用后端 `invoke('stop_agent_cli', { cliName, projectPath })`，前端取消等待，并向聊天流追加“任务已被用户强制中止”的本地系统消息。
- **结束复原**：不论成功、失败或被强杀，执行结束后均恢复输入框可用状态。

### 3.2 控制字符的 ANSI 渲染
- 对话框中，对于由 CLI 返回的终端文本，不采用常规的 Markdown 文本显示，而是提供一个类似黑底终端面板的容器（如 `className="cli-terminal-log"`）。
- 使用 ANSI-to-React/HTML 工具（或前端正则解析器），将保留的 `\x1b[3x` 彩色代码转换成对应的 CSS 行内样式（如蓝色、绿色、黄色高亮），将 ANSI 的格式完美还原，并正确保留文本换行。

### 3.3 日志外置与关联同步 (Markdown)
当 CLI 执行结束获得完整输出（假设为 `fullTerminalOutput`）后：
1. **生成物理日志文件**：
   在项目路径下的 `.agentflow/logs/` 目录中，生成一个独立的时间戳日志文件，例如 `cli_antigravity_20260603_153000.log`，将 `fullTerminalOutput` 写入其中。
2. **截断与 Markdown 同步**：
   在任务对应的评论 Markdown 文件（如 `.agentflow/tasks/TASK-101.md`）中，仅记录经过清洗后的前 100 行输出日志（防止 Markdown 文件过大导致软件卡顿），并在文末附带上此日志文件的本地路径链接：
   `[查看完整执行终端日志](file:///<project_path>/.agentflow/logs/cli_antigravity_20260603_153000.log)`
3. **前端渲染逻辑**：
   前端渲染时，若检测到该 comment 含有本地日志链接，额外显示一个“打开完整日志文件”的按钮，调用 `open_in_explorer` 或直接在软件内部面板展示。

---

## 4. 边界场景与冲突处理

1. **Git 并发锁（`index.lock`）**：本版本不做全局独占式 Git 锁干预。若后台 CLI 与前端定时诊断/状态轮询发生 index.lock 并发冲突，终端会直接输出 Git 锁报错，用户点击重新执行即可。
2. **全局环境继承**：若用户未在 Windows 环境变量中配置 API Key 导致 CLI 启动后模型报错，错误信息会完整捕获在终端日志中展示（如 "API key not found" 或 "HTTP 404 Model Not Found"），用户看到后只需前往系统配置环境变量并重启 MIMIcode 即可。
