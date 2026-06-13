"use strict";
export const compileGraphToCrewAI = (nodes, edges, permissions) => {
  if (nodes.length === 0) {
    throw new Error("Graph is empty");
  }
  const isHierarchical = edges.length === 0;
  let sortedNodes = [];
  if (isHierarchical) {
    sortedNodes = [...nodes];
  } else {
    const outEdges = /* @__PURE__ */ new Map();
    const inDegree = /* @__PURE__ */ new Map();
    nodes.forEach((n) => {
      outEdges.set(n.id, []);
      inDegree.set(n.id, 0);
    });
    edges.forEach((e) => {
      if (outEdges.has(e.source) && outEdges.has(e.target)) {
        outEdges.get(e.source).push(e.target);
        inDegree.set(e.target, inDegree.get(e.target) + 1);
      }
    });
    let startNodes = nodes.filter((n) => inDegree.get(n.id) === 0);
    if (startNodes.length === 0) {
      startNodes = [...nodes].sort((a, b) => outEdges.get(b.id).length - outEdges.get(a.id).length).slice(0, 1);
    }
    const visits = /* @__PURE__ */ new Map();
    const traverse = (nodeId) => {
      const count = visits.get(nodeId) || 0;
      if (count >= 2) return;
      visits.set(nodeId, count + 1);
      const node = nodes.find((n) => n.id === nodeId);
      if (node) sortedNodes.push(node);
      const neighbors = outEdges.get(nodeId) || [];
      for (const neighbor of neighbors) {
        traverse(neighbor);
      }
    };
    startNodes.forEach((n) => traverse(n.id));
    const sortedIds = new Set(sortedNodes.map((n) => n.id));
    for (const node of nodes) {
      if (!sortedIds.has(node.id)) {
        sortedNodes.push(node);
      }
    }
  }
  let subagentConfigs = [];
  try {
    const saved = localStorage.getItem("mimi-subagent-configs");
    if (saved) {
      subagentConfigs = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to parse mimi-subagent-configs:", e);
  }
  const findSubAgentConfig = (role, name) => {
    if (!subagentConfigs || subagentConfigs.length === 0) return null;
    const rLower = (role || "").toLowerCase();
    const nLower = (name || "").toLowerCase();
    if (rLower.includes("manager") || rLower.includes("leader") || rLower.includes("pm") || rLower.includes("planner") || rLower.includes("\u67B6\u6784") || rLower.includes("architect") || rLower.includes("\u8D1F\u8D23\u4EBA") || rLower.includes("owner") || rLower.includes("\u4E3B\u63A7") || rLower.includes("\u8C03\u7814") || rLower.includes("research") || nLower.includes("hermes")) {
      const match = subagentConfigs.find((c) => c.id === "1" || c.name.toLowerCase().includes("hermes") || c.role.toLowerCase().includes("manager") || c.role.toLowerCase().includes("leader"));
      if (match) return match;
    }
    if (rLower.includes("frontend") || rLower.includes("ui") || rLower.includes("ux") || rLower.includes("designer") || rLower.includes("\u524D\u7AEF") || rLower.includes("\u89C6\u89C9") || rLower.includes("\u62A5\u544A") || rLower.includes("\u53EF\u89C6\u5316") || nLower.includes("antigravity")) {
      const match = subagentConfigs.find((c) => c.id === "2" || c.name.toLowerCase().includes("antigravity") || c.role.toLowerCase().includes("frontend"));
      if (match) return match;
    }
    if (rLower.includes("backend") || rLower.includes("api") || rLower.includes("database") || rLower.includes("db") || rLower.includes("\u540E\u7AEF") || rLower.includes("data") || rLower.includes("\u6570\u636E") || rLower.includes("\u91C7\u96C6") || rLower.includes("\u5206\u6790") || rLower.includes("worker") || rLower.includes("\u6267\u884C") || rLower.includes("writer") || rLower.includes("\u521B\u4F5C") || nLower.includes("codex")) {
      const match = subagentConfigs.find((c) => c.id === "3" || c.name.toLowerCase().includes("codex") || c.role.toLowerCase().includes("backend"));
      if (match) return match;
    }
    if (rLower.includes("qa") || rLower.includes("test") || rLower.includes("audit") || rLower.includes("cve") || rLower.includes("security") || rLower.includes("\u6D4B\u8BD5") || rLower.includes("\u5BA1\u8BA1") || rLower.includes("review") || rLower.includes("\u8BC4\u5BA1") || rLower.includes("editor") || rLower.includes("\u7F16\u8F91") || rLower.includes("\u5BA1\u7A3F") || rLower.includes("cleaner") || rLower.includes("\u6E05\u6D17") || nLower.includes("claude") || nLower.includes("qa")) {
      const match = subagentConfigs.find((c) => c.id === "4" || c.name.toLowerCase().includes("qa") || c.name.toLowerCase().includes("claude") || c.role.toLowerCase().includes("tester") || c.role.toLowerCase().includes("auditor"));
      if (match) return match;
    }
    if (rLower.includes("devops") || rLower.includes("ops") || rLower.includes("deploy") || rLower.includes("docker") || rLower.includes("k8s") || rLower.includes("\u8FD0\u7EF4") || rLower.includes("seo") || rLower.includes("\u4F18\u5316") || rLower.includes("specialist") || nLower.includes("devops")) {
      const match = subagentConfigs.find((c) => c.id === "5" || c.name.toLowerCase().includes("devops") || c.role.toLowerCase().includes("devops"));
      if (match) return match;
    }
    const nameMatch = subagentConfigs.find((c) => nLower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(nLower));
    if (nameMatch) return nameMatch;
    const roleMatch = subagentConfigs.find((c) => rLower.includes(c.role.toLowerCase()) || c.role.toLowerCase().includes(rLower));
    if (roleMatch) return roleMatch;
    return null;
  };
  const esc = (s) => (s || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');
  let code = `import os
import json
import sys
import random
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from langchain.callbacks.base import BaseCallbackHandler

def emit_event(event_type: str, agent_name: str, message: str, node_id: str = ""):
    payload = { "event": event_type, "agent": agent_name, "message": message, "node_id": node_id, "is_team": True }
    print(json.dumps(payload, ensure_ascii=False), flush=True)

def select_key(keys_str: str) -> str:
    if not keys_str:
        return ""
    keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    if not keys:
        return ""
    return random.choice(keys)

class JSONRPCCallbackHandler(BaseCallbackHandler):
    def __init__(self, agent_name: str, node_id: str = ""):
        self.agent_name = agent_name
        self.node_id = node_id

    def on_llm_start(self, *args, **kwargs):
        emit_event("agent_started", self.agent_name, "Started thinking...", self.node_id)

    def on_tool_start(self, serialized, input_str, *args, **kwargs):
        tool_name = serialized.get("name", "Unknown Tool")
        if "Ask question" in tool_name or "Delegate work" in tool_name or "coworker" in tool_name.lower():
            try:
                import ast
                # Try to extract the coworker name
                input_dict = ast.literal_eval(input_str)
                coworker = input_dict.get("coworker", "Coworker")
                emit_event("agent_delegated", self.agent_name, f"Delegating to {coworker}. Input: {input_str}", self.node_id)
            except:
                emit_event("agent_delegated", self.agent_name, f"Delegating to coworker. Input: {input_str}", self.node_id)
        else:
            emit_event("agent_action", self.agent_name, f"Using tool: {tool_name} with input: {input_str}", self.node_id)

    def on_llm_end(self, response, *args, **kwargs):
        try:
            text = response.generations[0][0].text
            emit_event("agent_finished", self.agent_name, text, self.node_id)
        except Exception:
            emit_event("agent_finished", self.agent_name, "Finished thinking.", self.node_id)

from langchain.tools import tool
import subprocess
import builtins

@tool("Read File")
def read_file(path: str) -> str:
    """Reads content from a file at the given absolute or relative path."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"

@tool("Write File")
def write_file(path: str, content: str) -> str:
    """Writes content to a file at the given path. Overwrites if exists, creates if not."""
    try:
${permissions?.writeFile === "ask" ? `        emit_event("ask_human", "\u7CFB\u7EDF\u62E6\u622A", f"\u667A\u80FD\u4F53\u8BF7\u6C42\u4FEE\u6539/\u521B\u5EFA\u6587\u4EF6\uFF1A\\n\\n\u8DEF\u5F84: {path}\\n\u5185\u5BB9\u957F\u5EA6: {len(content)}\\n\\n\u662F\u5426\u5141\u8BB8\uFF1F", "")
        user_input = builtins.input()
        if user_input.strip().lower() != 'y':
            return f"File write rejected by user. Feedback: {user_input}"` : ""}
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Successfully wrote to {path}"
    except Exception as e:
        return f"Error writing file: {str(e)}"

@tool("Execute Command")
def execute_command(command: str) -> str:
    """Executes a shell command on the local machine and returns its stdout/stderr output."""
    try:
${permissions?.executeCommand === "allow" ? "" : `        emit_event("ask_human", "\u7CFB\u7EDF\u62E6\u622A", f"\u667A\u80FD\u4F53\u8BF7\u6C42\u5728\u7EC8\u7AEF\u6267\u884C\u547D\u4EE4\uFF1A\\n\\n\`{command}\`\\n\\n\u662F\u5426\u5141\u8BB8\uFF1F(\u540C\u610F\u8BF7\u70B9\u51FB\u5141\u8BB8\uFF0C\u62D2\u7EDD\u8BF7\u63D0\u4F9B\u4FEE\u6539\u610F\u89C1)", "")
        user_input = builtins.input()
        if user_input.strip().lower() != 'y':
            return f"Command execution rejected by user. Feedback from user: {user_input}"
`}            
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=120)
        output = result.stdout if result.stdout else result.stderr
        return output if output else "Command executed successfully with no output."
    except Exception as e:
        return f"Command execution failed: {str(e)}"

@tool("List Directory")
def list_directory(path: str) -> str:
    """Lists files and folders inside the specified directory path."""
    try:
        items = os.listdir(path)
        return "\\n".join(items) if items else "Directory is empty."
    except Exception as e:
        return f"Error listing directory: {str(e)}"

local_tools = [read_file, write_file, execute_command, list_directory]

def run_native_team(project_path: str, task_description: str):
    emit_event("system", "System", "Initializing Native AgentFlow Team from Visual Builder...")

    # Global API config from environment (injected by Tauri backend)
    global_api_key = os.environ.get("OPENAI_API_KEY", "")
    global_base_url = os.environ.get("OPENAI_API_BASE", "https://api.openai.com/v1")
    global_model = os.environ.get("OPENAI_MODEL_NAME", "gpt-4o")
`;
  const agentVars = [];
  const taskVars = [];
  let managerVarName = "";
  let managerNodeIndex = -1;
  if (isHierarchical) {
    managerNodeIndex = sortedNodes.findIndex(
      (n) => n.data.role?.toLowerCase().includes("manager") || n.data.role?.toLowerCase().includes("leader")
    );
    if (managerNodeIndex === -1) managerNodeIndex = 0;
  }
  let usesGlobalApiKey = false;
  sortedNodes.forEach((node, i) => {
    const varName = `agent_${i}`;
    const llmVarName = `llm_${i}`;
    const taskVarName = `task_${i}`;
    if (isHierarchical && i === managerNodeIndex) {
      managerVarName = varName;
    } else {
      agentVars.push(varName);
    }
    const role = esc(node.data.role || "Expert");
    const name = esc(node.data.label || node.data.name || `Agent ${i}`);
    const nodeBaseUrl = (node.data.baseUrl || "").trim();
    const nodeModel = (node.data.model || "").trim();
    const nodeApiKey = (node.data.apiKey || "").trim();
    const matchedSub = findSubAgentConfig(node.data.role || "", node.data.label || node.data.name || "");
    let useBaseUrl = "global_base_url";
    let useModel = "global_model";
    let useApiKey = "global_api_key";
    if (matchedSub && matchedSub.baseUrl) {
      useBaseUrl = `"${esc(matchedSub.baseUrl)}"`;
    } else if (nodeBaseUrl) {
      useBaseUrl = `"${esc(nodeBaseUrl)}"`;
    }
    if (matchedSub && matchedSub.model) {
      useModel = `"${esc(matchedSub.model)}"`;
    } else if (nodeModel) {
      useModel = `"${esc(nodeModel)}"`;
    }
    if (matchedSub && matchedSub.apiKey) {
      useApiKey = `select_key("${esc(matchedSub.apiKey)}")`;
    } else if (nodeApiKey) {
      useApiKey = `select_key("${esc(nodeApiKey)}")`;
    } else {
      useApiKey = "global_api_key";
      usesGlobalApiKey = true;
    }
    const allowDelegation = isHierarchical && i === managerNodeIndex ? "True" : "False";
    code += `
    ${llmVarName} = ChatOpenAI(
        temperature=0.7,
        model_name=${useModel},
        base_url=${useBaseUrl},
        api_key=${useApiKey},
        callbacks=[JSONRPCCallbackHandler("${name}", "${node.id}")]
    )

    ${varName} = Agent(
        role='${role}',
        goal='Fulfill your role (${role}) to the best of your abilities.',
        backstory='You are ${name}, an AI assistant collaborating in a team.',
        verbose=True,
        allow_delegation=${allowDelegation},
        llm=${llmVarName},
        tools=local_tools
    )
    emit_event("system", "System", "Agent initialized: ${name} (${role})", "${node.id}")
`;
    if (!isHierarchical) {
      taskVars.push(taskVarName);
      const rawDesc = esc(node.data.taskDescription || "");
      const customDescription = node.data.taskDescription ? `f"""${rawDesc}\\n\\nProject Path: {project_path}\\nOverall Goal: {task_description}"""` : `f"The overall project goal is: {task_description}. You are ${name} (${role}). Please perform your specific duties and build upon the context provided by previous steps. Project Path: {project_path}"`;
      const rawExp = esc(node.data.expectedOutput || "");
      const customExpectedOutput = node.data.expectedOutput ? `f"""${rawExp}"""` : `"A professional output related to the domain of ${name} (${role})."`;
      const incomingEdges = edges.filter((e) => e.target === node.id);
      const contextTasks = incomingEdges.map((e) => {
        const sourceIdx = sortedNodes.findIndex((n) => n.id === e.source);
        return sourceIdx >= 0 && sourceIdx < i ? `task_${sourceIdx}` : null;
      }).filter(Boolean);
      const contextStr = contextTasks.length > 0 ? `,
        context=[${contextTasks.join(", ")}]` : "";
      code += `
    ${taskVarName} = Task(
        description=${customDescription},
        expected_output=${customExpectedOutput},
        agent=${varName},
        async_execution=${node.data.asyncExecution ? "True" : "False"}${contextStr}
    )
`;
    }
  });
  if (usesGlobalApiKey) {
    code += `
    if not global_api_key:
        emit_event("error", "System", "No API key configured. Please set your API key in Settings.")
        return
    `;
  }
  code += `
    emit_event("system", "System", "All agents and LLM configurations successfully loaded from sub-agent interface.")
  `;
  if (isHierarchical) {
    code += `
    main_task = Task(
        description=f"Project Path: {project_path}\\nTask: {task_description}",
        expected_output="A complete implementation of the requested feature.",
        agent=${managerVarName}
    )
    
    # --- Form the Crew (Hierarchical) ---
    crew = Crew(
        agents=[${agentVars.join(", ")}],
        tasks=[main_task],
        process=Process.hierarchical,
        manager_agent=${managerVarName}
    )
    emit_event("system", "System", "Team started in Hierarchical Mode (Manager delegates tasks).")
`;
  } else {
    code += `
    # --- Form the Crew (Sequential) ---
    crew = Crew(
        agents=[${agentVars.join(", ")}],
        tasks=[${taskVars.join(", ")}],
        process=Process.sequential
    )
    emit_event("system", "System", f"Team started in Sequential Mode ({len(crew.agents)} agents, {len(crew.tasks)} tasks).")
`;
  }
  code += `
    try:
        result = crew.kickoff()
        emit_event("success", "System", f"Team execution finished successfully.\\n\\n{result}")
    except Exception as e:
        emit_event("error", "System", f"Team execution failed: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"event": "error", "agent": "System", "message": "Usage: agentflow_native.py <project_path> <task>"}))
        sys.exit(1)
    
    project_path = sys.argv[1]
    task_description = sys.argv[2]
    run_native_team(project_path, task_description)
`;
  return code;
};
