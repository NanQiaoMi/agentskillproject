# MIMIcode AgentFlow Prompt Injection Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现当用户在 MIMIcode Studio 启动外部智能体 CLI 时，自动将对应的 AgentFlow 角色提示词复制到系统剪贴板，并在新启动的控制台窗口中输出绿色的粘贴注入引导通知。

**Architecture:** 
1. 在 Rust 后端新增一个辅助函数 `inject_prompt_to_clipboard`，在拉起 CLI 进程前利用 Windows 原生的 PowerShell 读取提示词文件并写入剪贴板。
2. 重构 Rust 后端的 `launch_external_cli` 接口，首先触发剪贴板复制，再拼接 Windows cmd `echo` 回显字样及 color 0a 绿字指引，最终运行 CLI 工具。

**Tech Stack:** Rust, Tauri Backend, Windows Command Prompt (CMD), PowerShell

---

### Task 1: 在 Rust 后端实现剪贴板提示词注入函数

**Files:**
- Modify: `mimicode-desktop/src-tauri/src/lib.rs`

- [ ] **Step 1: 在 lib.rs 中声明与引入相关模块**
  确认 `lib.rs` 的头部是否已引入 `std::path::Path` 与 `std::process::Command` 等必要模块（已知已有）。

- [ ] **Step 2: 编写 `inject_prompt_to_clipboard` 辅助函数**
  在 `lib.rs` 的合适位置（例如 `launch_external_cli` 的定义上方，即 486 行左右）插入该辅助函数的定义：
  ```rust
  fn inject_prompt_to_clipboard(project_path: &str, cli_name: &str) {
      let role_filename = match cli_name {
          "claude" => "claudecode",
          "gemini" => "antigravity",
          "codex" => "codex",
          "opencode" => "opencode",
          "hermes_agent" | "hermes_dashboard" => "hermes",
          _ => return,
      };
      let prompt_path = std::path::Path::new(project_path)
          .join(".agentflow")
          .join("prompts")
          .join(format!("{}.md", role_filename));

      if prompt_path.exists() {
          // 通过运行系统内置的 PowerShell Get-Content -Raw | Set-Clipboard
          // 极高稳定性地完成文本复制，自动支持特殊字符转义和长内容
          let _ = std::process::Command::new("powershell")
              .args(&[
                  "-Command",
                  &format!(
                      "Get-Content -Raw '{}' | Set-Clipboard",
                      prompt_path.to_string_lossy()
                  ),
              ])
              .output();
      }
  }
  ```

- [ ] **Step 3: 运行 cargo check 检查语法**
  在 `mimicode-desktop/src-tauri` 目录下运行：
  `cargo check`
  期待：无编译报错。

- [ ] **Step 4: Commit 任务一**
  运行：
  ```bash
  git add mimicode-desktop/src-tauri/src/lib.rs
  git commit -m "feat: implement inject_prompt_to_clipboard in Tauri backend"
  ```

---

### Task 2: 在 lib.rs 中重构 `launch_external_cli` 命令

**Files:**
- Modify: `mimicode-desktop/src-tauri/src/lib.rs`

- [ ] **Step 1: 在 launch_external_cli 首行引入剪贴板注入**
  在 `launch_external_cli` 的第一行加入：
  ```rust
  // 先将专属提示词写入系统剪贴板
  inject_prompt_to_clipboard(&project_path, &cli_name);
  ```

- [ ] **Step 2: 重构 launch_external_cli 的 match 匹配分支**
  替换 `launch_external_cli` 函数中原本粗暴的 `Command` 启动逻辑，级联加入终端绿字 `color 0a` 和 `echo` 指引（注意把 hermes_agent 等启动路径的双反斜杠做正确保留，并显示特定角色扮演名称说明）：
  ```rust
      let status = match cli_name.as_str() {
          "claude" => Command::new("cmd").args(&[
              "/C", "start", "Claude Code", "cmd", "/k",
              "color 0a && echo ==================================================== && echo [AgentFlow] 提示词已自动复制到您的剪贴板！ && echo 请直接在此处 Ctrl+V 粘贴并回车以注入 [Claude Code: 审查审计规程] && echo ==================================================== && echo. && claude"
          ]).current_dir(repo_dir).spawn(),
          "codex" => Command::new("cmd").args(&[
              "/C", "start", "Codex CLI", "cmd", "/k",
              "color 0a && echo ==================================================== && echo [AgentFlow] 提示词已自动复制到您的剪贴板！ && echo 请直接在此处 Ctrl+V 粘贴并回车以注入 [Codex: 后端规程] && echo ==================================================== && echo. && codex"
          ]).current_dir(repo_dir).spawn(),
          "gemini" => Command::new("cmd").args(&[
              "/C", "start", "Gemini CLI", "cmd", "/k",
              "color 0a && echo ==================================================== && echo [AgentFlow] 提示词已自动复制到您的剪贴板！ && echo 请直接在此处 Ctrl+V 粘贴并回车以注入 [Antigravity: 前端规程] && echo ==================================================== && echo. && gemini"
          ]).current_dir(repo_dir).spawn(),
          "opencode" => Command::new("cmd").args(&[
              "/C", "start", "OpenCode CLI", "cmd", "/k",
              "color 0a && echo ==================================================== && echo [AgentFlow] 提示词已自动复制到您的剪贴板！ && echo 请直接在此处 Ctrl+V 粘贴并回车以注入 [OpenCode: 全局重构规程] && echo ==================================================== && echo. && opencode"
          ]).current_dir(repo_dir).spawn(),
          "hermes_agent" => Command::new("cmd").args(&[
              "/C", "start", "Hermes Agent", "cmd", "/k",
              "color 0a && echo ==================================================== && echo [AgentFlow] 提示词已自动复制到您的剪贴板！ && echo 请直接在此处 Ctrl+V 粘贴并回车以注入 [Hermes: 总规划师规程] && echo ==================================================== && echo. && C:\\Users\\Legion\\AppData\\Local\\hermes\\hermes-agent\\venv\\Scripts\\hermes.exe"
          ]).current_dir(repo_dir).spawn(),
          "hermes_dashboard" => Command::new("cmd").args(&[
              "/C", "start", "Hermes Dashboard", "cmd", "/k",
              "color 0a && echo ==================================================== && echo [AgentFlow] 提示词已自动复制到您的剪贴板！ && echo 请直接在此处 Ctrl+V 粘贴并回车以注入 [Hermes: Dashboard] && echo ==================================================== && echo. && C:\\Users\\Legion\\AppData\\Local\\hermes\\hermes-agent\\venv\\Scripts\\hermes.exe dashboard"
          ]).current_dir(repo_dir).spawn(),
          _ => return Err("Unknown CLI name".to_string()),
      };
  ```

- [ ] **Step 3: 运行 cargo check 验证编译**
  在 `mimicode-desktop/src-tauri` 目录下运行：
  `cargo check`
  期待：无编译报错。

- [ ] **Step 4: Commit 任务二**
  运行：
  ```bash
  git add mimicode-desktop/src-tauri/src/lib.rs
  git commit -m "feat: refactor launch_external_cli with clipboard injection and console instructions"
  ```

---

### Task 3: 运行本地 Tauri 编译并开展端到端验证

**Files:**
- Run Commands

- [ ] **Step 1: 编译 MIMIcode Studio 客户端**
  在 `mimicode-desktop` 目录下运行：
  `npm run tauri build` （或者使用 `cargo build` / `npm run dev` 运行开发服务器）
  期待：应用构建成功无报错。

- [ ] **Step 2: 启动应用开展端到端验证**
  - 运行应用，进入 Agents tab。
  - 选择项目目录为 `D:\agentcode`。
  - 点击“启动 Claude Code”或“启动 OpenCode CLI”的 Play (▶) 按钮。
  - 确认新开的命令行窗口背景为黑色且终端文字变为明绿色，窗口首部清晰回显了 [AgentFlow] 指引文字。
  - 在新开窗口的提示符下，按键盘 `Ctrl+V`，验证是否正确粘贴了对应的 `.agentflow/prompts` 下的角色提示词全文。
