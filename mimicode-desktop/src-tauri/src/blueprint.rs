use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BlueprintNodeType {
    Trigger,
    Agent,
    Approval,
    Condition,
    Manager,
    ManagerSlot,
    Summary,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BlueprintRunStatus {
    Idle,
    Queued,
    Running,
    Succeeded,
    Failed,
    Cancelled,
    WaitingApproval,
    Skipped,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BlueprintNodeData {
    pub label: String,
    #[serde(rename = "type")]
    pub node_type: BlueprintNodeType,
    pub status: Option<BlueprintRunStatus>,
    pub disabled: Option<bool>,
    pub prompt: Option<String>,
    pub agent: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BlueprintNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: String, // from frontend like "customNode"
    pub position: Position,
    pub data: BlueprintNodeData,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BlueprintEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub source_handle: Option<String>,
    pub target_handle: Option<String>,
    pub condition: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BlueprintDefinition {
    pub id: String,
    pub name: String,
    pub version: u32,
    pub nodes: Vec<BlueprintNode>,
    pub edges: Vec<BlueprintEdge>,
    pub variables: HashMap<String, String>,
}
