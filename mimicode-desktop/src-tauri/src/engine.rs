use std::collections::{HashMap, HashSet};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter, Manager};
use crate::blueprint::{BlueprintDefinition, BlueprintNode, BlueprintRunStatus};

#[derive(Clone, serde::Serialize)]
pub struct BlueprintEvent {
    pub blueprint_id: String,
    pub node_id: String,
    pub status: BlueprintRunStatus,
    pub message: String,
    pub output: Option<String>,
}

pub struct BlueprintEngine {
    blueprint: BlueprintDefinition,
    app_handle: AppHandle,
    node_outputs: HashMap<String, String>,
}

use std::sync::Mutex;
use tokio::sync::oneshot;

pub struct ApprovalDecision {
    pub decision: String,
    pub comment: Option<String>,
}

pub struct EngineState {
    pub pending_approvals: Mutex<HashMap<String, oneshot::Sender<ApprovalDecision>>>,
}

impl Default for EngineState {
    fn default() -> Self {
        Self {
            pending_approvals: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub async fn run_blueprint_engine(app_handle: AppHandle, blueprint_json: String) -> Result<(), String> {
    let definition: BlueprintDefinition = serde_json::from_str(&blueprint_json)
        .map_err(|e| format!("Failed to parse blueprint JSON: {}", e))?;
    
    let mut engine = BlueprintEngine::new(definition, app_handle);
    engine.run().await
}

#[tauri::command]
pub async fn resolve_approval(
    state: tauri::State<'_, EngineState>,
    blueprint_id: String,
    node_id: String,
    decision: String,
    comment: Option<String>,
) -> Result<(), String> {
    if let Some(tx) = state.pending_approvals.lock().unwrap().remove(&node_id) {
        let _ = tx.send(ApprovalDecision { decision, comment });
        Ok(())
    } else {
        Err("Approval node not found or already resolved".to_string())
    }
}

impl BlueprintEngine {
    pub fn new(blueprint: BlueprintDefinition, app_handle: AppHandle) -> Self {
        Self {
            blueprint,
            app_handle,
            node_outputs: HashMap::new(),
        }
    }

    pub async fn run(&mut self) -> Result<(), String> {
        // Topological sort logic here
        let mut in_degree: HashMap<String, usize> = HashMap::new();
        let mut adj_list: HashMap<String, Vec<String>> = HashMap::new();

        for node in &self.blueprint.nodes {
            in_degree.insert(node.id.clone(), 0);
            adj_list.insert(node.id.clone(), vec![]);
        }

        for edge in &self.blueprint.edges {
            if let Some(count) = in_degree.get_mut(&edge.target) {
                *count += 1;
            }
            if let Some(list) = adj_list.get_mut(&edge.source) {
                list.push(edge.target.clone());
            }
        }

        let mut queue: Vec<String> = vec![];
        for (node_id, degree) in &in_degree {
            if *degree == 0 {
                queue.push(node_id.clone());
            }
        }
        let mut skipped_nodes: HashSet<String> = HashSet::new();

        while !queue.is_empty() {
            let current_node_id = queue.remove(0);
            
            if skipped_nodes.contains(&current_node_id) {
                // Emit skipped event
                let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                    blueprint_id: self.blueprint.id.clone(),
                    node_id: current_node_id.clone(),
                    status: BlueprintRunStatus::Skipped,
                    message: "Skipped due to condition".to_string(),
                    output: None,
                });

                // Propagate skip to downstream
                for edge in self.blueprint.edges.iter().filter(|e| e.source == current_node_id) {
                    skipped_nodes.insert(edge.target.clone());
                    if let Some(count) = in_degree.get_mut(&edge.target) {
                        *count -= 1;
                        if *count == 0 {
                            queue.push(edge.target.clone());
                        }
                    }
                }
                continue;
            }

            // Execute the current node
            self.execute_node(&current_node_id).await?;
            let output = self.node_outputs.get(&current_node_id).cloned().unwrap_or_default();

            // Process downstream nodes
            for edge in self.blueprint.edges.iter().filter(|e| e.source == current_node_id) {
                let neighbor = &edge.target;
                
                // Check condition
                let mut edge_blocked = false;
                if let Some(cond) = &edge.condition {
                    let cleaned_out = output.trim().to_lowercase();
                    let cleaned_cond = cond.trim().to_lowercase();
                    if !cleaned_out.contains(&cleaned_cond) && cleaned_out != cleaned_cond {
                        edge_blocked = true;
                    }
                }

                if edge_blocked {
                    skipped_nodes.insert(neighbor.clone());
                }

                if let Some(count) = in_degree.get_mut(neighbor) {
                    *count -= 1;
                    if *count == 0 {
                        queue.push(neighbor.clone());
                    }
                }
            }
        }

        Ok(())
    }

    async fn execute_node(&mut self, node_id: &str) -> Result<(), String> {
        let node = self.blueprint.nodes.iter().find(|n| n.id == node_id).ok_or("Node not found")?.clone();

        // Emit running event
        let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
            blueprint_id: self.blueprint.id.clone(),
            node_id: node.id.clone(),
            status: BlueprintRunStatus::Running,
            message: format!("Running {}", node.data.label),
            output: None,
        });

        match node.data.node_type {
            crate::blueprint::BlueprintNodeType::Trigger => {
                let out = node.data.prompt.clone().unwrap_or_default();
                self.node_outputs.insert(node.id.clone(), out.clone());
                
                let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                    blueprint_id: self.blueprint.id.clone(),
                    node_id: node.id.clone(),
                    status: BlueprintRunStatus::Succeeded,
                    message: "Trigger completed".to_string(),
                    output: Some(out),
                });
            }
            crate::blueprint::BlueprintNodeType::Agent => {
                let upstream_content = self.get_upstream_outputs(node_id);
                let agent_name = node.data.agent.as_deref().unwrap_or("claude");
                let prompt = node.data.prompt.clone().unwrap_or_default();
                
                let combined_prompt = format!("Context from previous steps:\n{}\n\nTask:\n{}", upstream_content, prompt);
                
                // CLI Adapter Execution
                let out = match Self::run_cli_agent(agent_name, &combined_prompt).await {
                    Ok(result) => result,
                    Err(e) => format!("Agent execution failed: {}", e),
                };
                
                self.node_outputs.insert(node.id.clone(), out.clone());

                let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                    blueprint_id: self.blueprint.id.clone(),
                    node_id: node.id.clone(),
                    status: BlueprintRunStatus::Succeeded,
                    message: "Agent completed".to_string(),
                    output: Some(out),
                });
            }
            crate::blueprint::BlueprintNodeType::Approval => {
                let (tx, rx) = oneshot::channel();
                {
                    let state: tauri::State<'_, EngineState> = self.app_handle.state();
                    state.pending_approvals.lock().unwrap().insert(node.id.clone(), tx);
                }

                // Suspend and wait for human input
                let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                    blueprint_id: self.blueprint.id.clone(),
                    node_id: node.id.clone(),
                    status: BlueprintRunStatus::WaitingApproval,
                    message: "Waiting for user approval".to_string(),
                    output: Some(self.get_upstream_outputs(node_id)),
                });
                
                if let Ok(decision) = rx.await {
                    match decision.decision.as_str() {
                        "approve" => {
                            self.node_outputs.insert(node.id.clone(), "Approved".to_string());
                            let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                                blueprint_id: self.blueprint.id.clone(),
                                node_id: node.id.clone(),
                                status: BlueprintRunStatus::Succeeded,
                                message: "Approval granted".to_string(),
                                output: Some("Approved".to_string()),
                            });
                        }
                        "reject" => {
                            let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                                blueprint_id: self.blueprint.id.clone(),
                                node_id: node.id.clone(),
                                status: BlueprintRunStatus::Failed,
                                message: "Approval rejected by user".to_string(),
                                output: None,
                            });
                            return Err("Workflow rejected by user".to_string());
                        }
                        "feedback" => {
                            let comment = decision.comment.unwrap_or_default();
                            self.node_outputs.insert(node.id.clone(), format!("Feedback: {}", comment));
                            let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                                blueprint_id: self.blueprint.id.clone(),
                                node_id: node.id.clone(),
                                status: BlueprintRunStatus::Succeeded,
                                message: "Feedback sent, moving forward".to_string(),
                                output: Some(format!("Feedback: {}", comment)),
                            });
                        }
                        _ => {}
                    }
                }
            }
            crate::blueprint::BlueprintNodeType::Condition => {
                let upstream_content = self.get_upstream_outputs(node_id);
                let prompt = node.data.prompt.clone().unwrap_or_else(|| "Evaluate condition".to_string());
                let agent_name = node.data.agent.as_deref().unwrap_or("claude");
                let combined_prompt = format!("Context:\n{}\n\nEvaluate Condition and reply ONLY with the branch name (e.g., true/false, pass/fail):\n{}", upstream_content, prompt);
                
                let out = match Self::run_cli_agent(agent_name, &combined_prompt).await {
                    Ok(result) => result.trim().to_string(),
                    Err(e) => format!("Condition execution failed: {}", e),
                };
                
                self.node_outputs.insert(node.id.clone(), out.clone());
                let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                    blueprint_id: self.blueprint.id.clone(),
                    node_id: node.id.clone(),
                    status: BlueprintRunStatus::Succeeded,
                    message: format!("Condition evaluated to: {}", out),
                    output: Some(out),
                });
            }
            crate::blueprint::BlueprintNodeType::Loop => {
                let upstream_content = self.get_upstream_outputs(node_id);
                let prompt = node.data.prompt.clone().unwrap_or_else(|| "Evaluate if loop should continue".to_string());
                let agent_name = node.data.agent.as_deref().unwrap_or("claude");
                let combined_prompt = format!("Context:\n{}\n\nEvaluate if we need to loop again. Reply ONLY with 'loop' or 'continue':\n{}", upstream_content, prompt);
                
                let out = match Self::run_cli_agent(agent_name, &combined_prompt).await {
                    Ok(result) => result.trim().to_lowercase(),
                    Err(e) => format!("Loop evaluation failed: {}", e),
                };
                
                self.node_outputs.insert(node.id.clone(), out.clone());
                let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                    blueprint_id: self.blueprint.id.clone(),
                    node_id: node.id.clone(),
                    status: BlueprintRunStatus::Succeeded,
                    message: format!("Loop evaluated to: {}", out),
                    output: Some(out),
                });
            }
            crate::blueprint::BlueprintNodeType::Manager => {
                let upstream_content = self.get_upstream_outputs(node_id);
                let prompt = node.data.prompt.clone().unwrap_or_else(|| "Analyze the context and break it down into parallel sub-tasks.".to_string());
                
                let combined_prompt = format!(
                    "Context:\n{}\n\nInstruction:\n{}\n\nRespond STRICTLY with a valid JSON array of strings representing the sub-tasks. Example: [\"task1\", \"task2\"]. Do not output any markdown code blocks.", 
                    upstream_content, prompt
                );
                
                let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                    blueprint_id: self.blueprint.id.clone(),
                    node_id: node.id.clone(),
                    status: BlueprintRunStatus::Running,
                    message: "Manager dividing tasks".to_string(),
                    output: None,
                });
                
                let out = match Self::run_cli_agent("claude", &combined_prompt).await {
                    Ok(result) => {
                        let cleaned = result.trim();
                        let cleaned = cleaned.strip_prefix("```json").unwrap_or(cleaned);
                        let cleaned = cleaned.strip_prefix("```").unwrap_or(cleaned);
                        let cleaned = cleaned.strip_suffix("```").unwrap_or(cleaned);
                        cleaned.trim().to_string()
                    },
                    Err(e) => format!("[\"Error dividing tasks: {}\"]", e),
                };
                
                self.node_outputs.insert(node.id.clone(), out.clone());

                let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                    blueprint_id: self.blueprint.id.clone(),
                    node_id: node.id.clone(),
                    status: BlueprintRunStatus::Succeeded,
                    message: "Tasks divided".to_string(),
                    output: Some(out),
                });
            }
            crate::blueprint::BlueprintNodeType::ManagerSlot => {
                let upstream_content = self.get_upstream_outputs(node_id);
                let agent_name = node.data.agent.clone().unwrap_or_else(|| "claude".to_string());
                let prompt_template = node.data.prompt.clone().unwrap_or_else(|| "Process this sub-task:".to_string());

                let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                    blueprint_id: self.blueprint.id.clone(),
                    node_id: node.id.clone(),
                    status: BlueprintRunStatus::Running,
                    message: "ManagerSlot launching parallel agents".to_string(),
                    output: None,
                });

                // Parse the upstream content as JSON array
                let tasks: Vec<String> = match serde_json::from_str(&upstream_content) {
                    Ok(t) => t,
                    Err(_) => vec![upstream_content]
                };

                let mut handles = Vec::new();
                for (i, task) in tasks.iter().enumerate() {
                    let combined_prompt = format!("{}\n\nTask {}:\n{}", prompt_template, i + 1, task);
                    let agent = agent_name.clone();
                    
                    handles.push(tauri::async_runtime::spawn(async move {
                        Self::run_cli_agent(&agent, &combined_prompt).await
                    }));
                }

                let mut results = Vec::new();
                for handle in handles {
                    if let Ok(res) = handle.await {
                        match res {
                            Ok(output) => results.push(output),
                            Err(err) => results.push(format!("Error: {}", err)),
                        }
                    } else {
                        results.push("Thread execution error".to_string());
                    }
                }

                let final_out = serde_json::to_string(&results).unwrap_or_else(|_| "[]".to_string());
                
                self.node_outputs.insert(node.id.clone(), final_out.clone());

                let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                    blueprint_id: self.blueprint.id.clone(),
                    node_id: node.id.clone(),
                    status: BlueprintRunStatus::Succeeded,
                    message: "Parallel execution completed".to_string(),
                    output: Some(final_out),
                });
            }
            crate::blueprint::BlueprintNodeType::Summary => {
                let upstream_content = self.get_upstream_outputs(node_id);
                let prompt = node.data.prompt.clone().unwrap_or_else(|| "Summarize and combine the following outputs into a cohesive final result.".to_string());
                
                let combined_prompt = format!(
                    "Context (Multiple outputs):\n{}\n\nInstruction:\n{}", 
                    upstream_content, prompt
                );
                
                let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                    blueprint_id: self.blueprint.id.clone(),
                    node_id: node.id.clone(),
                    status: BlueprintRunStatus::Running,
                    message: "Summarizing outputs".to_string(),
                    output: None,
                });
                
                let out = match Self::run_cli_agent("claude", &combined_prompt).await {
                    Ok(result) => result,
                    Err(e) => format!("Summary execution failed: {}", e),
                };
                
                self.node_outputs.insert(node.id.clone(), out.clone());

                let _ = self.app_handle.emit("blueprint-event", BlueprintEvent {
                    blueprint_id: self.blueprint.id.clone(),
                    node_id: node.id.clone(),
                    status: BlueprintRunStatus::Succeeded,
                    message: "Summary completed".to_string(),
                    output: Some(out),
                });
            }
        }

        Ok(())
    }

    async fn run_cli_agent(agent_name: &str, prompt: &str) -> Result<String, String> {
        let mut command = match agent_name {
            "claude_code" | "claude" => {
                let mut cmd = Command::new("python");
                cmd.args(&["-c", &format!("import time; time.sleep(1); print('Claude Code executed: {}')", prompt.replace("'", "\\'"))]);
                cmd
            }
            "openclaw" => {
                let mut cmd = Command::new("python");
                cmd.args(&["-c", &format!("import time; time.sleep(1); print('OpenClaw Executor processed: {}')", prompt.replace("'", "\\'"))]);
                cmd
            }
            "codex" => {
                let mut cmd = Command::new("python");
                cmd.args(&["-c", &format!("import time; time.sleep(1); print('Codex Copilot generated code for: {}')", prompt.replace("'", "\\'"))]);
                cmd
            }
            _ => {
                // Fallback dummy
                let mut cmd = Command::new("python");
                cmd.args(&["-c", &format!("print('Dummy execution for {}: {}')", agent_name, prompt.replace("'", "\\'"))]);
                cmd
            }
        };

        // Suppress window on Windows
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let output = command.output().map_err(|e| e.to_string())?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }

    fn get_upstream_outputs(&self, current_node_id: &str) -> String {
        let mut outputs = Vec::new();
        for edge in &self.blueprint.edges {
            if edge.target == current_node_id {
                if let Some(out) = self.node_outputs.get(&edge.source) {
                    outputs.push(out.clone());
                }
            }
        }
        outputs.join("\n")
    }
}
