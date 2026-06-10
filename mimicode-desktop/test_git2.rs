use std::process::Command;

fn main() {
    let output = Command::new("git")
        .args(&["worktree", "add", "-b", "feature/task-002", ".agentflow/worktrees/TASK-002"])
        .current_dir(r"d:\projecttest")
        .output()
        .unwrap();
    println!("success: {}", output.status.success());
    println!("stdout: {}", String::from_utf8_lossy(&output.stdout));
    println!("stderr: {}", String::from_utf8_lossy(&output.stderr));
}
