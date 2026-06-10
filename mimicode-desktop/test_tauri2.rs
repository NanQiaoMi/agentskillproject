use std::fs;
use std::process::Command;

fn main() {
    let output = Command::new(r"d:\projecttest\.agentflow\venv\Scripts\python.exe")
        .env("AGENTFLOW_DB_PATH", r"d:\projecttest\.agentflow\tasks.db")
        .arg(r"d:\projecttest\.agentflow\agentflow.py")
        .arg("json-list")
        .output()
        .unwrap();
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    fs::write("test_tauri_invoke_log_projecttest.txt", stdout).unwrap();
}
