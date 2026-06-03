// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::process::{Command, Stdio};
use std::path::{Path, PathBuf};
use std::fs;
use keyring::Entry;
use chrono::Local;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

// Structs for response data
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct EnvStatus {
    git_installed: bool,
    git_version: String,
    python_installed: bool,
    python_version: String,
    uv_installed: bool,
    uv_version: String,
    venv_initialized: bool,
    project_db_shared: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct TaskProcessInfo {
    task_id: String,
    pid: u32,
    log_path: String,
    worktree_path: String,
}

// ----------------------------------------------------
// 1. Helper Functions
// ----------------------------------------------------
fn get_command_version(cmd: &str, args: &[&str]) -> String {
    #[cfg(windows)]
    let mut command = Command::new("cmd");
    #[cfg(windows)]
    command.args(&["/C", cmd]).args(args);
    
    #[cfg(not(windows))]
    let mut command = Command::new(cmd);
    #[cfg(not(windows))]
    command.args(args);

    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    let child = match command.spawn() {
        Ok(c) => c,
        Err(_) => return String::new(),
    };

    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let result = child.wait_with_output();
        let _ = tx.send(result);
    });

    match rx.recv_timeout(std::time::Duration::from_millis(1500)) {
        Ok(Ok(output)) => {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !version.is_empty() {
                    return version;
                }
                return String::from_utf8_lossy(&output.stderr).trim().to_string();
            }
        }
        _ => {}
    }
    String::new()
}

fn get_machine_guid() -> String {
    #[cfg(windows)]
    {
        let output = Command::new("reg")
            .args(&["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"])
            .output();
        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines() {
                if line.contains("MachineGuid") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 3 {
                        return parts[2].to_string();
                    }
                }
            }
        }
    }
    "MIMIcodeDefaultHardwareKeySalt".to_string()
}

fn encrypt_decrypt(data: &str, key: &str) -> String {
    let key_bytes = key.as_bytes();
    let data_bytes = data.as_bytes();
    let mut result = Vec::with_capacity(data_bytes.len());
    for (i, &byte) in data_bytes.iter().enumerate() {
        result.push(byte ^ key_bytes[i % key_bytes.len()]);
    }
    result.iter().map(|b| format!("{:02x}", b)).collect()
}

fn decrypt_hex(hex_str: &str, key: &str) -> Result<String, String> {
    let mut bytes = Vec::new();
    for i in (0..hex_str.len()).step_by(2) {
        if i + 2 <= hex_str.len() {
            let byte = u8::from_str_radix(&hex_str[i..i+2], 16)
                .map_err(|_| "Invalid hex string".to_string())?;
            bytes.push(byte);
        }
    }
    let key_bytes = key.as_bytes();
    let mut decrypted = Vec::with_capacity(bytes.len());
    for (i, &byte) in bytes.iter().enumerate() {
        decrypted.push(byte ^ key_bytes[i % key_bytes.len()]);
    }
    String::from_utf8(decrypted).map_err(|e| e.to_string())
}

fn get_fallback_path() -> PathBuf {
    let app_data = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\Temp".to_string());
    let mut path = PathBuf::from(app_data);
    path.push("MIMIcode");
    fs::create_dir_all(&path).ok();
    path.push("credentials.json");
    path
}

// ----------------------------------------------------
// 2. Tauri Commands
// ----------------------------------------------------

#[tauri::command]
fn check_environment(project_path: String) -> EnvStatus {
    let git_version = get_command_version("git", &["--version"]);
    let python_version = get_command_version("python", &["--version"]);
    let uv_version = get_command_version("uv", &["--version"]);
    
    let venv_path = Path::new(&project_path).join(".agentflow").join("venv");
    let venv_initialized = venv_path.exists() && 
        (venv_path.join("Scripts").join("python.exe").exists() || 
         venv_path.join("bin").join("python").exists());

    EnvStatus {
        git_installed: !git_version.is_empty(),
        git_version,
        python_installed: !python_version.is_empty(),
        python_version,
        uv_installed: !uv_version.is_empty(),
        uv_version,
        venv_initialized,
        project_db_shared: true,
    }
}

#[tauri::command]
fn setup_environment(project_path: String) -> Result<String, String> {
    let agentflow_dir = Path::new(&project_path).join(".agentflow");
    let venv_dir = agentflow_dir.join("venv");
    
    // Check if uv is installed
    let use_uv = if cfg!(windows) {
        Command::new("cmd").args(&["/C", "uv", "--version"]).output().is_ok()
    } else {
        Command::new("uv").arg("--version").output().is_ok()
    };

    let status = if use_uv {
        let mut cmd = Command::new("uv");
        cmd.args(&["venv", venv_dir.to_str().unwrap()]);
        cmd.output().map_err(|e| e.to_string())?
    } else {
        let mut cmd = Command::new("python");
        cmd.args(&["-m", "venv", venv_dir.to_str().unwrap()]);
        cmd.output().map_err(|e| e.to_string())?
    };

    if !status.status.success() {
        return Err(format!(
            "Failed to create virtual environment: {}",
            String::from_utf8_lossy(&status.stderr)
        ));
    }

    Ok("Virtual environment initialized successfully".to_string())
}

#[tauri::command]
fn store_credential(service: String, username: String, secret: String) -> Result<(), String> {
    // Try keyring first
    let entry = Entry::new(&service, &username);
    if let Ok(ent) = entry {
        if ent.set_password(&secret).is_ok() {
            return Ok(());
        }
    }
    
    // Fallback to encrypted AppData file
    let path = get_fallback_path();
    let salt = get_machine_guid();
    let encrypted = encrypt_decrypt(&secret, &salt);
    
    let mut file_content = serde_json::Map::new();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(obj) = json.as_object() {
                    file_content = obj.clone();
                }
            }
        }
    }
    
    file_content.insert(format!("{}:{}", service, username), serde_json::Value::String(encrypted));
    let serialized = serde_json::to_string_pretty(&file_content).map_err(|e| e.to_string())?;
    fs::write(&path, serialized).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn get_credential(service: String, username: String) -> Result<String, String> {
    // Try keyring first
    let entry = Entry::new(&service, &username);
    if let Ok(ent) = entry {
        if let Ok(password) = ent.get_password() {
            return Ok(password);
        }
    }
    
    // Fallback
    let path = get_fallback_path();
    if !path.exists() {
        return Err("Credential not found".to_string());
    }
    
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    let key = format!("{}:{}", service, username);
    if let Some(encrypted) = json.get(&key).and_then(|v| v.as_str()) {
        let salt = get_machine_guid();
        let decrypted = decrypt_hex(encrypted, &salt)?;
        return Ok(decrypted);
    }
    
    Err("Credential not found in local keyring or fallback storage".to_string())
}

#[tauri::command]
fn manage_git_worktree(project_path: String, op: String, task_id: String) -> Result<String, String> {
    let repo_dir = Path::new(&project_path);
    let task_id_upper = task_id.to_uppercase();
    let task_id_lower = task_id.to_lowercase();
    
    let parent = repo_dir.parent().ok_or_else(|| "Invalid project path".to_string())?;
    let worktree_dir = parent.join("mimicode_worktrees").join(&task_id_upper);

    if op == "add" {
        let worktree_parent = worktree_dir.parent().unwrap();
        fs::create_dir_all(worktree_parent).map_err(|e| e.to_string())?;

        // Check if branch exists
        let branch_exists = {
            let output = Command::new("git")
                .args(&["show-ref", &format!("refs/heads/feature/{}", task_id_lower)])
                .current_dir(repo_dir)
                .output()
                .map_err(|e| e.to_string())?;
            output.status.success()
        };

        let branch_name = format!("feature/{}", task_id_lower);
        let mut git_args = vec!["worktree", "add", worktree_dir.to_str().unwrap()];
        if branch_exists {
            git_args.push(&branch_name);
        } else {
            git_args.push("-b");
            git_args.push(&branch_name);
        }

        let output = Command::new("git")
            .args(&git_args)
            .current_dir(repo_dir)
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            return Err(format!(
                "Failed to add Git Worktree: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        return Ok(worktree_dir.to_str().unwrap().to_string());
    } else if op == "remove" {
        if !worktree_dir.exists() {
            return Ok("Worktree directory does not exist".to_string());
        }

        let output = Command::new("git")
            .args(&["worktree", "remove", worktree_dir.to_str().unwrap(), "--force"])
            .current_dir(repo_dir)
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            return Err(format!(
                "Failed to remove Git Worktree: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        // Clean up branch
        Command::new("git")
            .args(&["branch", "-d", &format!("feature/{}", task_id_lower)])
            .current_dir(repo_dir)
            .output().ok();

        return Ok("Worktree removed successfully".to_string());
    }

    Err("Invalid operation. Choose either 'add' or 'remove'.".to_string())
}

#[tauri::command]
fn start_agent_task(
    project_path: String,
    task_id: String,
    worktree_path: String,
    command_args: Vec<String>,
) -> Result<TaskProcessInfo, String> {
    let repo_dir = Path::new(&worktree_path);
    
    // Choose Python executable (check local venv first)
    let venv_python = if cfg!(windows) {
        Path::new(&project_path).join(".agentflow").join("venv").join("Scripts").join("python.exe")
    } else {
        Path::new(&project_path).join(".agentflow").join("venv").join("bin").join("python")
    };
    
    let python_exe = if venv_python.exists() {
        venv_python.to_str().unwrap().to_string()
    } else {
        "python".to_string()
    };

    // Log directory setup
    let log_dir = Path::new(&project_path).join(".agentflow").join("logs");
    fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
    let log_path = log_dir.join(format!("test_{}.log", task_id));

    // Create log file with initial stamp
    {
        let mut lf = fs::File::create(&log_path).map_err(|e| e.to_string())?;
        use std::io::Write;
        writeln!(lf, "=== MIMIcode Daemon Execution Log (TASK: {}) ===", task_id).ok();
        writeln!(lf, "Start Time: {}", Local::now().to_rfc3339()).ok();
        writeln!(lf, "Worktree: {}", worktree_path).ok();
        writeln!(lf, "------------------------------------------------").ok();
    }

    // Open in append mode for process pipes
    let log_file = fs::OpenOptions::new()
        .append(true)
        .open(&log_path)
        .map_err(|e| e.to_string())?;
    let log_file_err = log_file.try_clone().map_err(|e| e.to_string())?;

    let mut cmd = Command::new(&python_exe);
    
    // Inject shared SQLite db environment variable
    let db_path = Path::new(&project_path).join(".agentflow").join("tasks.db");
    cmd.env("AGENTFLOW_DB_PATH", db_path.to_str().unwrap());

    // Exec agentflow.py
    let agentflow_py = Path::new(&project_path).join(".agentflow").join("agentflow.py");
    cmd.arg(agentflow_py.to_str().unwrap());
    
    for arg in command_args {
        cmd.arg(arg);
    }

    // Windows detached spawn config
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        const DETACHED_PROCESS: u32 = 0x00000008;
        cmd.creation_flags(CREATE_NO_WINDOW | DETACHED_PROCESS);
    }

    cmd.stdout(Stdio::from(log_file));
    cmd.stderr(Stdio::from(log_file_err));
    cmd.current_dir(repo_dir);

    let child = cmd.spawn().map_err(|e| format!("Failed to spawn child: {}", e))?;
    let pid = child.id();

    // Write PID file
    let pid_path = log_dir.join(format!("{}.pid", task_id));
    fs::write(&pid_path, pid.to_string()).ok();

    Ok(TaskProcessInfo {
        task_id,
        pid,
        log_path: log_path.to_str().unwrap().to_string(),
        worktree_path,
    })
}

#[tauri::command]
fn get_agent_status(pid: u32) -> bool {
    let mut system = sysinfo::System::new_all();
    system.refresh_all();
    system.process(sysinfo::Pid::from(pid as usize)).is_some()
}

#[tauri::command]
fn stop_agent_task(pid: u32) -> Result<(), String> {
    let mut system = sysinfo::System::new_all();
    system.refresh_all();
    if let Some(process) = system.process(sysinfo::Pid::from(pid as usize)) {
        process.kill();
        return Ok(());
    }
    Err("Process not found or already terminated".to_string())
}

#[tauri::command]
fn run_agentflow_cmd(project_path: String, args: Vec<String>) -> Result<String, String> {
    let venv_python = if cfg!(windows) {
        Path::new(&project_path).join(".agentflow").join("venv").join("Scripts").join("python.exe")
    } else {
        Path::new(&project_path).join(".agentflow").join("venv").join("bin").join("python")
    };
    
    let python_exe = if venv_python.exists() {
        venv_python.to_str().unwrap().to_string()
    } else {
        "python".to_string()
    };

    let agentflow_py = Path::new(&project_path).join(".agentflow").join("agentflow.py");
    let db_path = Path::new(&project_path).join(".agentflow").join("tasks.db");

    let mut cmd = Command::new(&python_exe);
    cmd.env("AGENTFLOW_DB_PATH", db_path.to_str().unwrap());
    cmd.arg(agentflow_py.to_str().unwrap());
    for arg in args {
        cmd.arg(arg);
    }
    
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output().map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr_str = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !stderr_str.is_empty() {
            Err(stderr_str)
        } else {
            Err(stdout_str)
        }
    }
}

#[tauri::command]
fn read_task_log(project_path: String, task_id: String) -> Result<String, String> {
    let log_path = Path::new(&project_path).join(".agentflow").join("logs").join(format!("test_{}.log", task_id));
    if !log_path.exists() {
        return Ok("Log file not created yet... Waiting for agent to spawn.\n".to_string());
    }
    fs::read_to_string(log_path).map_err(|e| e.to_string())
}

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
        let _ = std::process::Command::new("powershell")
            .args(&[
                "-Command",
                &format!(
                    "Get-Content -Raw -Encoding UTF8 '{}' | Set-Clipboard",
                    prompt_path.to_string_lossy()
                ),
            ])
            .output();
    }
}

#[tauri::command]
fn launch_external_cli(cli_name: String, project_path: String) -> Result<String, String> {
    let repo_dir = Path::new(&project_path);
    if !repo_dir.exists() {
        return Err("指定的项目路径不存在，请先在配置中选择或修改。".to_string());
    }

    // 先将专属提示词写入系统剪贴板
    inject_prompt_to_clipboard(&project_path, &cli_name);

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
    
    match status {
        Ok(_) => Ok(format!("Successfully launched {}", cli_name)),
        Err(e) => Err(format!("Failed to launch {}: {}", cli_name, e)),
    }
}

#[derive(serde::Serialize, Clone)]
pub struct AgentConfigInfo {
    model: String,
    config_path: String,
}

fn get_home_dir() -> PathBuf {
    if let Ok(profile) = std::env::var("USERPROFILE") {
        PathBuf::from(profile)
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home)
    } else {
        PathBuf::from("C:\\Users\\Legion")
    }
}

#[tauri::command]
fn read_agent_configs() -> std::collections::HashMap<String, AgentConfigInfo> {
    let home = get_home_dir();
    let mut configs = std::collections::HashMap::new();

    // 1. Hermes
    let hermes_path = home.join("AppData").join("Local").join("hermes").join("profiles").join("mimi2").join("config.yaml");
    let mut hermes_model = "mimo-v2.5-pro".to_string();
    if let Ok(content) = fs::read_to_string(&hermes_path) {
        let mut in_model_block = false;
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("model:") {
                in_model_block = true;
            } else if in_model_block {
                if trimmed.starts_with("default:") {
                    if let Some(val) = trimmed.split(':').nth(1) {
                        hermes_model = val.trim().trim_matches('\'').trim_matches('"').to_string();
                        break;
                    }
                } else if !line.starts_with(" ") && !line.starts_with("\t") {
                    in_model_block = false;
                }
            }
        }
    }
    configs.insert(
        "hermes".to_string(),
        AgentConfigInfo {
            model: hermes_model,
            config_path: hermes_path.to_string_lossy().to_string(),
        },
    );

    // 2. Gemini CLI (Antigravity)
    let gemini_path = home.join(".gemini").join(".env");
    let mut gemini_model = "deepseek-v4-flash".to_string();
    if let Ok(content) = fs::read_to_string(&gemini_path) {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("GEMINI_MODEL=") {
                gemini_model = trimmed.split('=').nth(1).unwrap_or("").trim().to_string();
                break;
            }
        }
    }
    configs.insert(
        "antigravity".to_string(),
        AgentConfigInfo {
            model: gemini_model,
            config_path: gemini_path.to_string_lossy().to_string(),
        },
    );

    // 3. Codex
    let codex_path = home.join(".codex").join("cc-switch-model-catalog.json");
    let config_toml_path = home.join(".codex").join("config.toml");
    let mut codex_model = "MiniMax-M3".to_string();
    if let Ok(content) = fs::read_to_string(&codex_path) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(models_arr) = val.get("models").and_then(|m| m.as_array()) {
                if let Some(first_model) = models_arr.first() {
                    if let Some(slug) = first_model.get("slug").and_then(|s| s.as_str()) {
                        codex_model = slug.to_string();
                    }
                }
            }
        }
    }
    configs.insert(
        "codex".to_string(),
        AgentConfigInfo {
            model: codex_model,
            config_path: config_toml_path.to_string_lossy().to_string(),
        },
    );

    // 4. Claude Code
    let claude_path = home.join(".claude").join("settings.json");
    configs.insert(
        "claudecode".to_string(),
        AgentConfigInfo {
            model: "claude-3.5-sonnet".to_string(),
            config_path: claude_path.to_string_lossy().to_string(),
        },
    );

    // 5. OpenCode
    let opencode_path = home.join(".config").join("opencode").join("opencode.json");
    let mut opencode_model = "MiniMax-M2.7-highspeed".to_string();
    if let Ok(content) = fs::read_to_string(&opencode_path) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(models) = val.pointer("/provider/ccx/models").and_then(|m| m.as_object()) {
                if let Some(first_key) = models.keys().next() {
                    opencode_model = first_key.clone();
                }
            }
        }
    }
    configs.insert(
        "opencode".to_string(),
        AgentConfigInfo {
            model: opencode_model,
            config_path: opencode_path.to_string_lossy().to_string(),
        },
    );

    configs
}

#[tauri::command]
fn check_agent_clis_running() -> std::collections::HashMap<String, bool> {
    let mut system = sysinfo::System::new_all();
    system.refresh_all();

    let mut status = std::collections::HashMap::new();
    status.insert("claudecode".to_string(), false);
    status.insert("codex".to_string(), false);
    status.insert("antigravity".to_string(), false);
    status.insert("opencode".to_string(), false);
    status.insert("hermes".to_string(), false);

    for (_pid, process) in system.processes() {
        let name = process.name().to_lowercase();
        let cmd_joined = process.cmd().iter().map(|s| s.to_lowercase()).collect::<Vec<_>>().join(" ");
        
        // Claude
        if name.contains("claude") || cmd_joined.contains("claude") {
            status.insert("claudecode".to_string(), true);
        }
        // Codex
        if name.contains("codex") || cmd_joined.contains("codex") {
            status.insert("codex".to_string(), true);
        }
        // Gemini
        if name.contains("gemini") || cmd_joined.contains("gemini") {
            status.insert("antigravity".to_string(), true);
        }
        // OpenCode
        if name.contains("opencode") || cmd_joined.contains("opencode") {
            status.insert("opencode".to_string(), true);
        }
        // Hermes
        if name.contains("hermes") || cmd_joined.contains("hermes") {
            status.insert("hermes".to_string(), true);
        }
    }

    status
}

fn run_git_cmd(args: &[&str], current_dir: &Path) -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    let mut cmd = Command::new("git");
    cmd.args(args).current_dir(current_dir);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let output = cmd.output().map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn select_directory() -> Result<String, String> {
    let result = rfd::FileDialog::new()
        .set_title("选择 MIMIcode 项目工作区目录")
        .pick_folder();
    
    match result {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("Operation cancelled by user".to_string()),
    }
}

#[tauri::command]
fn get_git_commits(repo_path: String) -> Result<String, String> {
    run_git_cmd(
        &["log", "-n", "50", "--pretty=format:%H|%an|%ad|%s", "--date=short"],
        Path::new(&repo_path),
    )
}

#[tauri::command]
fn get_git_diff(repo_path: String) -> Result<String, String> {
    let mut diff_str = String::new();
    let path = Path::new(&repo_path);
    if let Ok(out1) = run_git_cmd(&["diff"], path) {
        diff_str.push_str(&out1);
    }
    if let Ok(out2) = run_git_cmd(&["diff", "--cached"], path) {
        diff_str.push_str(&out2);
    }
    
    if diff_str.is_empty() {
        Ok("No changes".to_string())
    } else {
        Ok(diff_str)
    }
}

#[tauri::command]
fn list_git_worktrees(repo_path: String) -> Result<String, String> {
    run_git_cmd(&["worktree", "list"], Path::new(&repo_path))
}

#[tauri::command]
fn read_dir_recursive(path: String) -> Result<String, String> {
    run_git_cmd(&["ls-tree", "-r", "--name-only", "HEAD"], Path::new(&path))
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct PathMeta {
    created: String,
    is_clean: bool,
}

#[tauri::command]
fn get_path_metadata(path: String) -> Result<PathMeta, String> {
    let path_obj = Path::new(&path);
    if !path_obj.exists() {
        return Err("Path does not exist".to_string());
    }
    let metadata = fs::metadata(path_obj).map_err(|e| e.to_string())?;
    
    let created_time = metadata.created()
        .or_else(|_| metadata.modified())
        .map(|system_time| {
            let datetime: chrono::DateTime<chrono::Local> = system_time.into();
            datetime.format("%Y-%m-%d %H:%M").to_string()
        })
        .unwrap_or_else(|_| "Unknown".to_string());
        
    let is_clean = match run_git_cmd(&["status", "--porcelain"], path_obj) {
        Ok(out) => out.trim().is_empty(),
        Err(_) => true,
    };
    
    Ok(PathMeta {
        created: created_time,
        is_clean,
    })
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct GitDiagnostics {
    sync_status: String,
    untracked_count: usize,
    gitignore_rules: usize,
    loose_objects: usize,
    pack_files: usize,
}

#[tauri::command]
fn get_git_diagnostics(repo_path: String) -> Result<GitDiagnostics, String> {
    let repo_path_obj = Path::new(&repo_path);
    if !repo_path_obj.exists() {
        return Err("Repository path does not exist".to_string());
    }

    // 1. Get sync_status
    let mut sync_status = "未知 (Unknown)".to_string();
    if let Ok(out_str) = run_git_cmd(&["status", "-sb"], repo_path_obj) {
        let first_line = out_str.lines().next().unwrap_or("").trim();
        if first_line.starts_with("##") {
            let branch_info = &first_line[2..].trim();
            if branch_info.contains("...") {
                if branch_info.contains("[ahead") && branch_info.contains("behind") {
                    sync_status = "本地与远程分支冲突 (Diverged)".to_string();
                } else if branch_info.contains("[ahead") {
                    sync_status = "本地有未推送的提交 (Ahead)".to_string();
                } else if branch_info.contains("behind") {
                    sync_status = "落后于远程分支，请拉取 (Behind)".to_string();
                } else {
                    sync_status = format!("与远程同步 ({})", branch_info.split("...").next().unwrap_or(""));
                }
            } else {
                sync_status = format!("本地分支 ({})，无关联的远程分支", branch_info);
            }
        }
    }

    // 2. Count untracked files
    let mut untracked_count = 0;
    if let Ok(out_str) = run_git_cmd(&["status", "--porcelain"], repo_path_obj) {
        untracked_count = out_str.lines()
            .filter(|line| line.starts_with("??"))
            .count();
    }

    // 3. Count gitignore rules
    let mut gitignore_rules = 0;
    let gitignore_path = repo_path_obj.join(".gitignore");
    if gitignore_path.exists() {
        if let Ok(content) = fs::read_to_string(gitignore_path) {
            gitignore_rules = content.lines()
                .filter(|line| !line.trim().is_empty() && !line.trim().starts_with('#'))
                .count();
        }
    }

    // 4. Count loose objects and pack files
    let mut loose_objects = 0;
    let mut pack_files = 0;
    if let Ok(out_str) = run_git_cmd(&["count-objects", "-v"], repo_path_obj) {
        for line in out_str.lines() {
            if line.starts_with("count:") {
                if let Some(val_str) = line.split(':').nth(1) {
                    loose_objects = val_str.trim().parse().unwrap_or(0);
                }
            } else if line.starts_with("packs:") {
                if let Some(val_str) = line.split(':').nth(1) {
                    pack_files = val_str.trim().parse().unwrap_or(0);
                }
            }
        }
    }

    Ok(GitDiagnostics {
        sync_status,
        untracked_count,
        gitignore_rules,
        loose_objects,
        pack_files,
    })
}

#[tauri::command]
fn get_git_status(repo_path: String) -> Result<String, String> {
    run_git_cmd(&["status", "--porcelain"], Path::new(&repo_path))
}

#[tauri::command]
fn open_in_explorer(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        #[cfg(target_os = "macos")]
        Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?;
        #[cfg(target_os = "linux")]
        Command::new("xdg-open").arg(&path).spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
fn open_in_terminal(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        Command::new("cmd")
            .args(&["/C", "start", "cmd", "/K", &format!("cd /d {}", path)])
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        #[cfg(target_os = "macos")]
        Command::new("open").args(&["-a", "Terminal", &path]).spawn().map_err(|e| e.to_string())?;
        #[cfg(target_os = "linux")]
        Command::new("x-terminal-emulator").args(&["--working-directory", &path]).spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
fn read_file_content(path: String) -> Result<Option<String>, String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Ok(None);
    }
    std::fs::read_to_string(p)
        .map(Some)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file_content(path: String, content: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(p, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_node_version() -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    let mut cmd = Command::new("node");
    cmd.args(&["--version"]);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let output = cmd.output().map_err(|e| format!("Node.js not found: {}", e))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err("Node.js is not installed or not in PATH".to_string())
    }
}

#[tauri::command]
fn run_shell_command(command: String, cwd: String) -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    let mut cmd = Command::new("cmd");
    cmd.args(&["/C", &command]).current_dir(&cwd);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let output = cmd.output().map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if output.status.success() {
        Ok(stdout)
    } else {
        Ok(format!("{}{}", stdout, stderr))
    }
}

#[tauri::command]
async fn proxy_post_request(url: String, api_key: String, body: String) -> Result<String, String> {
    use std::io::Write;
    
    #[cfg(windows)]
    let mut cmd = Command::new("curl.exe");
    #[cfg(not(windows))]
    let mut cmd = Command::new("curl");
    
    cmd.args(&[
        "-s",
        "-X", "POST",
        &url,
        "-H", &format!("Authorization: Bearer {}", api_key),
        "-H", "Content-Type: application/json",
        "-d", "@-",
    ]);
    
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    
    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn curl: {}", e))?;
    
    {
        let mut stdin = child.stdin.take().ok_or("Failed to open stdin")?;
        stdin.write_all(body.as_bytes()).map_err(|e| format!("Failed to write to stdin: {}", e))?;
    }
    
    let output = child.wait_with_output().map_err(|e| format!("Failed to wait for output: {}", e))?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn running_agents() -> &'static std::sync::Mutex<std::collections::HashMap<String, u32>> {
    static RUNNING_AGENTS: std::sync::OnceLock<std::sync::Mutex<std::collections::HashMap<String, u32>>> = std::sync::OnceLock::new();
    RUNNING_AGENTS.get_or_init(|| std::sync::Mutex::new(std::collections::HashMap::new()))
}

fn strip_cursor_controls(s: &str) -> String {
    let mut result = String::new();
    let chars = s.chars().collect::<Vec<_>>();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '\x1b' && i + 1 < chars.len() && chars[i+1] == '[' {
            let start = i;
            i += 2;
            let mut digits = String::new();
            while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == ';' || chars[i] == '?') {
                digits.push(chars[i]);
                i += 1;
            }
            if i < chars.len() {
                let action = chars[i];
                i += 1;
                if action == 'm' {
                    result.push_str(&chars[start..i].iter().collect::<String>());
                }
            } else {
                result.push_str(&chars[start..].iter().collect::<String>());
                break;
            }
        } else {
            result.push(chars[i]);
            i += 1;
        }
    }
    result
}

fn clean_ansi_output(input: &str) -> String {
    let mut cleaned_lines = Vec::new();
    for line in input.lines() {
        let mut final_segment = "";
        for segment in line.split('\r') {
            let trimmed = segment.trim_matches('\0');
            if !trimmed.is_empty() {
                final_segment = segment;
            }
        }
        
        if final_segment.is_empty() && !line.is_empty() {
            final_segment = line;
        }

        let mut cleaned_segment = final_segment.to_string();
        
        let patterns = [
            "\x1b[2K", "\x1b[K", "\x1b[?25h", "\x1b[?25l", 
            "\x1b[2J", "\x1b[H", "\x1b[?1049h", "\x1b[?1049l"
        ];
        for pat in &patterns {
            cleaned_segment = cleaned_segment.replace(pat, "");
        }
        
        cleaned_segment = strip_cursor_controls(&cleaned_segment);
        cleaned_lines.push(cleaned_segment);
    }
    cleaned_lines.join("\n")
}

#[tauri::command]
async fn run_agent_cli(
    cli_name: String,
    project_path: String,
    task_id: Option<String>,
    prompt: String,
) -> Result<String, String> {
    let repo_dir = Path::new(&project_path);
    let mut run_dir = repo_dir.to_path_buf();
    if let Some(ref tid) = task_id {
        if let Some(parent) = repo_dir.parent() {
            let worktree_dir = parent.join("mimicode_worktrees").join(tid.to_uppercase());
            if worktree_dir.exists() {
                run_dir = worktree_dir;
            }
        }
    }

    #[cfg(windows)]
    let (exe, args) = match cli_name.as_str() {
        "hermes" => (
            "C:\\Users\\Legion\\AppData\\Local\\hermes\\hermes-agent\\venv\\Scripts\\hermes.exe",
            vec!["-z".to_string(), prompt],
        ),
        "antigravity" => (
            "D:\\npm_global\\gemini.cmd",
            vec!["-p".to_string(), prompt, "-y".to_string()],
        ),
        "codex" => (
            "D:\\npm_global\\codex.cmd",
            vec![
                "exec".to_string(),
                prompt,
                "--dangerously-bypass-approvals-and-sandbox".to_string(),
            ],
        ),
        "claudecode" => (
            "D:\\npm_global\\claude.cmd",
            vec![
                "-p".to_string(),
                prompt,
                "--permission-mode".to_string(),
                "bypassPermissions".to_string(),
            ],
        ),
        "opencode" => (
            "D:\\npm_global\\opencode.cmd",
            vec![
                "run".to_string(),
                prompt,
                "--dangerously-skip-permissions".to_string(),
            ],
        ),
        _ => return Err("Unknown CLI name".to_string()),
    };

    #[cfg(not(windows))]
    let (exe, args) = match cli_name.as_str() {
        "hermes" => (
            "hermes",
            vec!["-z".to_string(), prompt],
        ),
        "antigravity" => (
            "gemini",
            vec!["-p".to_string(), prompt, "-y".to_string()],
        ),
        "codex" => (
            "codex",
            vec![
                "exec".to_string(),
                prompt,
                "--dangerously-bypass-approvals-and-sandbox".to_string(),
            ],
        ),
        "claudecode" => (
            "claude",
            vec![
                "-p".to_string(),
                prompt,
                "--permission-mode".to_string(),
                "bypassPermissions".to_string(),
            ],
        ),
        "opencode" => (
            "opencode",
            vec![
                "run".to_string(),
                prompt,
                "--dangerously-skip-permissions".to_string(),
            ],
        ),
        _ => return Err("Unknown CLI name".to_string()),
    };

    #[cfg(windows)]
    let mut cmd = Command::new("cmd");
    #[cfg(windows)]
    cmd.arg("/C").arg(exe).args(&args);

    #[cfg(not(windows))]
    let mut cmd = Command::new(exe);
    #[cfg(not(windows))]
    cmd.args(&args);

    cmd.current_dir(&run_dir)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child = cmd.spawn().map_err(|e| format!("Failed to spawn CLI process: {}", e))?;
    let pid = child.id();
    let map_key = format!("{}_{}", project_path, cli_name);

    {
        let mut map = running_agents().lock().map_err(|e| e.to_string())?;
        map.insert(map_key.clone(), pid);
    }

    let output = child.wait_with_output();

    {
        if let Ok(mut map) = running_agents().lock() {
            map.remove(&map_key);
        }
    }

    let output = output.map_err(|e| format!("Failed to wait for CLI execution: {}", e))?;

    let stdout_str = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr_str = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = format!("{}{}", stdout_str, stderr_str);

    let cleaned = clean_ansi_output(&combined);

    if output.status.success() {
        Ok(cleaned)
    } else {
        Err(cleaned)
    }
}

#[tauri::command]
async fn stop_agent_cli(cli_name: String, project_path: String) -> Result<(), String> {
    let map_key = format!("{}_{}", project_path, cli_name);
    let pid_opt = {
        let mut map = running_agents().lock().map_err(|e| e.to_string())?;
        map.remove(&map_key)
    };

    if let Some(pid) = pid_opt {
        #[cfg(windows)]
        {
            let mut cmd = Command::new("taskkill");
            cmd.args(&["/F", "/PID", &pid.to_string(), "/T"]);
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
            let _ = cmd.output();
        }
        #[cfg(not(windows))]
        {
            let _ = Command::new("kill").args(&["-9", &pid.to_string()]).output();
        }
        Ok(())
    } else {
        Err("No running process found for this agent".to_string())
    }
}

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let name = entry.file_name();
        if ty.is_dir() {
            if name == "venv" || name == "__pycache__" || name == "logs" {
                continue;
            }
            copy_dir_all(&entry.path(), &dst.join(name))?;
        } else {
            if name == "tasks.db" {
                continue;
            }
            fs::copy(entry.path(), dst.join(name))?;
        }
    }
    Ok(())
}

#[tauri::command]
fn initialize_project(project_path: String) -> Result<String, String> {
    let target_agentflow = Path::new(&project_path).join(".agentflow");
    
    if !target_agentflow.exists() {
        let source_agentflow = Path::new("d:\\agentcode").join(".agentflow");
        if source_agentflow.exists() {
            copy_dir_all(&source_agentflow, &target_agentflow)
                .map_err(|e| format!("Failed to copy .agentflow templates: {}", e))?;
        } else {
            return Err("Template .agentflow directory not found in d:\\agentcode".to_string());
        }
    }
    
    let tasks_dir = target_agentflow.join("tasks");
    fs::create_dir_all(&tasks_dir).map_err(|e| e.to_string())?;
    
    let logs_dir = target_agentflow.join("logs");
    fs::create_dir_all(&logs_dir).map_err(|e| e.to_string())?;

    let venv_path = target_agentflow.join("venv");
    let has_venv = venv_path.exists() && 
        (venv_path.join("Scripts").join("python.exe").exists() || 
         venv_path.join("bin").join("python").exists());
         
    if !has_venv {
        setup_environment(project_path.clone())?;
    }
    
    let _ = run_agentflow_cmd(project_path, vec!["sync".to_string()]);
    
    Ok("Project initialized successfully".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_environment,
            setup_environment,
            store_credential,
            get_credential,
            manage_git_worktree,
            start_agent_task,
            get_agent_status,
            stop_agent_task,
            run_agentflow_cmd,
            read_task_log,
            launch_external_cli,
            select_directory,
            get_git_commits,
            get_git_diff,
            list_git_worktrees,
            read_dir_recursive,
            read_agent_configs,
            check_agent_clis_running,
            open_in_explorer,
            open_in_terminal,
            get_git_status,
            get_path_metadata,
            get_git_diagnostics,
            read_file_content,
            write_file_content,
            get_node_version,
            run_shell_command,
            proxy_post_request,
            initialize_project,
            run_agent_cli,
            stop_agent_cli
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_guid_retrieval() {
        let guid = get_machine_guid();
        assert!(!guid.is_empty());
    }

    #[test]
    fn test_encrypt_decrypt() {
        let secret = "my_super_secret_key_123";
        let salt = "hardware_guid_salt";
        let encrypted = encrypt_decrypt(secret, salt);
        let decrypted = decrypt_hex(&encrypted, salt).unwrap();
        assert_eq!(secret, decrypted);
    }

    #[test]
    fn test_fallback_storage() {
        let path = get_fallback_path();
        let service = "MIMIcodeTestService";
        let username = "test_user";
        let secret = "test_secret_value_987";
        
        let salt = get_machine_guid();
        let encrypted = encrypt_decrypt(secret, &salt);
        
        let mut file_content = serde_json::Map::new();
        file_content.insert(format!("{}:{}", service, username), serde_json::Value::String(encrypted));
        let serialized = serde_json::to_string_pretty(&file_content).unwrap();
        fs::write(&path, serialized).unwrap();
        
        // Read back
        let content = fs::read_to_string(&path).unwrap();
        let json: serde_json::Value = serde_json::from_str(&content).unwrap();
        let key = format!("{}:{}", service, username);
        let read_encrypted = json.get(&key).unwrap().as_str().unwrap();
        let decrypted = decrypt_hex(read_encrypted, &salt).unwrap();
        
        assert_eq!(secret, decrypted);
        
        // Cleanup test entry
        let mut file_content_clean = file_content.clone();
        file_content_clean.remove(&key);
        let serialized_clean = serde_json::to_string_pretty(&file_content_clean).unwrap();
        fs::write(&path, serialized_clean).unwrap();
    }

    #[test]
    fn test_git_worktree_lifecycle() {
        let project_path = "D:\\agentcode".to_string();
        let task_id = "TASK-TEST-999".to_string();
        
        // Ensure clean state
        let _ = manage_git_worktree(project_path.clone(), "remove".to_string(), task_id.clone());
        
        // Add worktree
        let res_add = manage_git_worktree(project_path.clone(), "add".to_string(), task_id.clone());
        assert!(res_add.is_ok(), "Failed to add worktree: {:?}", res_add);
        let path_str = res_add.unwrap();
        let path = Path::new(&path_str);
        assert!(path.exists());
        
        // Remove worktree
        let res_remove = manage_git_worktree(project_path.clone(), "remove".to_string(), task_id.clone());
        assert!(res_remove.is_ok(), "Failed to remove worktree: {:?}", res_remove);
        assert!(!path.exists());
    }

    #[test]
    fn test_agent_execution_lifecycle() {
        let project_path = "D:\\agentcode".to_string();
        let task_id = "TASK-TEST-EXEC".to_string();
        let worktree_path = "D:\\agentcode".to_string();
        
        // 1. Test run_agentflow_cmd synchronously
        let res_cmd = run_agentflow_cmd(project_path.clone(), vec!["json-list".to_string()]);
        assert!(res_cmd.is_ok(), "Failed to run agentflow json-list: {:?}", res_cmd);
        let output = res_cmd.unwrap();
        assert!(output.starts_with('[') || output.is_empty() || output.contains('{'));

        // 2. Test start_agent_task asynchronously (daemon mode)
        let res_spawn = start_agent_task(
            project_path.clone(),
            task_id.clone(),
            worktree_path.clone(),
            vec!["list".to_string()],
        );
        assert!(res_spawn.is_ok(), "Failed to start agent task daemon: {:?}", res_spawn);
        let info = res_spawn.unwrap();
        assert_eq!(info.task_id, task_id);
        assert!(info.pid > 0);
        
        // Check log file is created
        let log_file_path = Path::new(&info.log_path);
        assert!(log_file_path.exists());

        // Let the daemon execute for a brief moment
        std::thread::sleep(std::time::Duration::from_millis(500));

        // Read log
        let res_log = read_task_log(project_path.clone(), task_id.clone());
        assert!(res_log.is_ok());
        let log_content = res_log.unwrap();
        assert!(log_content.contains("MIMIcode Daemon Execution Log"));

        // Wait a bit more or kill it if it is still running
        if get_agent_status(info.pid) {
            let res_stop = stop_agent_task(info.pid);
            assert!(res_stop.is_ok());
        }
        
        // Clean up PID file and log file
        let log_dir = Path::new(&project_path).join(".agentflow").join("logs");
        let pid_path = log_dir.join(format!("{}.pid", task_id));
        fs::remove_file(pid_path).ok();
        fs::remove_file(log_file_path).ok();
    }

    #[test]
    fn test_worktree_metadata_and_status() {
        let project_path = "D:\\agentcode".to_string();
        let res_meta = get_path_metadata(project_path.clone());
        assert!(res_meta.is_ok(), "Failed to get path metadata: {:?}", res_meta);
        let meta = res_meta.unwrap();
        assert!(!meta.created.is_empty());
        
        let res_status = get_git_status(project_path.clone());
        assert!(res_status.is_ok(), "Failed to get git status: {:?}", res_status);
    }

    #[test]
    fn test_file_read_write_api() {
        let mut test_path = std::env::temp_dir();
        test_path.push("test_spec.md");
        let test_path_str = test_path.to_string_lossy().to_string();
        let test_content = "# Hello World\nThis is a test.".to_string();
        
        let res_write = write_file_content(test_path_str.clone(), test_content.clone());
        assert!(res_write.is_ok());
        
        let res_read = read_file_content(test_path_str.clone());
        assert!(res_read.is_ok());
        assert_eq!(res_read.unwrap(), Some(test_content));
        
        // Cleanup
        std::fs::remove_file(test_path).ok();
    }
}


