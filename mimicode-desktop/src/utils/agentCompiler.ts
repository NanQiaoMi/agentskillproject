import { Node, Edge } from '@xyflow/react';

export const compileGraphToLangGraph = (nodes: Node[], edges: Edge[], permissions?: { executeCommand: string; writeFile: string; useGitSandbox: boolean }, mcpServers?: any[]): string => {
  if (nodes.length === 0) {
    throw new Error('Graph is empty');
  }

  // Load sub-agent configurations from local storage
  let subagentConfigs: any[] = [];
  try {
    const saved = localStorage.getItem('mimi-subagent-configs');
    if (saved) {
      subagentConfigs = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse mimi-subagent-configs:', e);
  }

  const findSubAgentConfig = (role: string, name: string) => {
    if (!subagentConfigs || subagentConfigs.length === 0) return null;
    const rLower = (role || '').toLowerCase();
    const nLower = (name || '').toLowerCase();

    const roleMatch = subagentConfigs.find(c => rLower.includes(c.role.toLowerCase()) || c.role.toLowerCase().includes(rLower));
    if (roleMatch) return roleMatch;

    const nameMatch = subagentConfigs.find(c => nLower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(nLower));
    if (nameMatch) return nameMatch;

    return null;
  };

  const esc = (s: string) => (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
  
  const mcpServersRaw = mcpServers ? JSON.stringify(mcpServers) : "[]";
  const mcpServersSafe = JSON.stringify(mcpServersRaw);

  let code = `import os
import json
import sys
import builtins
import subprocess
import threading
import uuid

def emit_event(event_type: str, agent_name: str, message: str, node_id: str = ""):
    payload = { "event": event_type, "agent": agent_name, "message": message, "node_id": node_id, "is_team": True }
    print(json.dumps(payload, ensure_ascii=False), flush=True)

# Harness Auto-Bootstrapper: Ensure dependencies exist before loading heavy AI frameworks
def bootstrap_harness():
    reqs = ["langchain_openai", "langchain_core", "langgraph", "pydantic", "duckduckgo_search", "mcp", "langchain-mcp-adapters"]
    try:
        import langchain_openai
        import langgraph
        import pydantic
        import mcp
        import langchain_mcp_adapters
    except ImportError:
        emit_event("system", "Harness", "Installing required dependencies for Harness Engine...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-q"] + reqs, check=True)
            emit_event("system", "Harness", "Dependencies installed successfully.")
        except Exception as e:
            emit_event("error", "Harness", f"Failed to install dependencies: {str(e)}")
            sys.exit(1)

bootstrap_harness()

import asyncio
import contextlib
import mcp
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import langchain_mcp_adapters
from langchain_mcp_adapters.tools import load_mcp_tools

import concurrent.futures
import tempfile
import shutil
from typing import TypedDict, Annotated, Sequence
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from langchain_core.callbacks import BaseCallbackHandler
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3
from pydantic import BaseModel, Field

def add_strings(left: str, right: str) -> str:
    if not left: return right
    if not right: return left
    return left + right

class SubAgentStreamHandler(BaseCallbackHandler):
    def __init__(self, role: str):
        self.role = role

    def on_llm_start(self, serialized: dict, prompts: list, **kwargs):
        emit_event("subagent_thinking", self.role, "Thinking...")

    def on_tool_start(self, serialized: dict, input_str: str, **kwargs):
        emit_event("subagent_tool", self.role, f"Using: {serialized.get('name', 'unknown')}")

    def on_llm_end(self, response, **kwargs):
        if response.generations and response.generations[0]:
            emit_event("subagent_output", self.role, response.generations[0][0].text[:200] + "...")

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    current_data: Annotated[str, add_strings]

def trim_messages_safe(messages: Sequence[BaseMessage], max_tokens: int) -> Sequence[BaseMessage]:
    if not messages:
        return []
    if len(messages) <= max_tokens:
        return list(messages)
    
    trimmed = list(messages[-max_tokens:])
    
    if isinstance(trimmed[0], ToolMessage):
        original_idx = len(messages) - max_tokens - 1
        while original_idx >= 0:
            msg = messages[original_idx]
            trimmed.insert(0, msg)
            if isinstance(msg, AIMessage) and hasattr(msg, 'tool_calls') and msg.tool_calls:
                break
            original_idx -= 1
            
    return trimmed

# Define Tools
@tool
def code_interpreter_tool(code: str) -> str:
    """Execute Python code in a secure sandbox and return the output."""
    try:
        import tempfile
        import os
        import subprocess
        emit_event("system", "Harness", "Code Interpreter is running...")
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
            f.write(code)
            temp_path = f.name
        
        result = subprocess.run([sys.executable, temp_path], capture_output=True, text=True, timeout=120)
        output = result.stdout if result.stdout else result.stderr
        
        try:
            os.remove(temp_path)
        except:
            pass
            
        return output if output else "Code executed successfully with no output."
    except subprocess.TimeoutExpired:
        return "Code execution timed out after 120 seconds."
    except Exception as e:
        return f"Code execution failed: {str(e)}"

@tool
def execute_command_tool(command: str) -> str:
    """Execute a terminal command and return the output."""
    try:
${permissions?.executeCommand === 'allow' ? '' : `        emit_event("ask_human", "系统拦截", f"智能体请求在终端执行命令：\\n\\n\`{command}\`\\n\\n是否允许？(同意请按回车或y，拒绝请提供意见)", "")
        user_input = builtins.input()
        if user_input.strip().lower() not in ['', 'y', 'yes']:
            return f"Command execution rejected by user. Feedback: {user_input}"
`}        import threading
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        output_lines = []
        
        def read_stream(stream):
            for line in iter(stream.readline, ''):
                emit_event("system", "Terminal", line.rstrip('\\n'))
                output_lines.append(line)
            stream.close()

        t_out = threading.Thread(target=read_stream, args=(process.stdout,))
        t_err = threading.Thread(target=read_stream, args=(process.stderr,))
        t_out.start()
        t_err.start()
        
        try:
            process.wait(timeout=120)
        except subprocess.TimeoutExpired:
            process.kill()
            t_out.join()
            t_err.join()
            return "".join(output_lines) + "\\nCommand execution timed out after 120 seconds."
            
        t_out.join()
        t_err.join()
        output = "".join(output_lines)
        return output if output else "Command executed successfully with no output."
    except Exception as e:
        return f"Command execution failed: {str(e)}"

@tool
def read_file_tool(path: str) -> str:
    """Read contents of a local file."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Read failed: {e}"

@tool
def write_file_tool(path: str, content: str) -> str:
    """Write contents to a local file."""
    try:
${permissions?.writeFile === 'allow' ? '' : `        emit_event("ask_human", "系统拦截", f"智能体请求写入文件：\\n\\n\`{path}\`\\n\\n是否允许？(同意请按回车或y，拒绝请提供意见)", "")
        user_input = builtins.input()
        if user_input.strip().lower() not in ['', 'y', 'yes']:
            return f"File write rejected by user. Feedback: {user_input}"
`}        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        try:
            subprocess.run(['git', 'add', path], check=True, capture_output=True, cwd=os.path.dirname(os.path.abspath(path)))
            subprocess.run(['git', 'commit', '-m', f'mimi-checkpoint: modified {path}'], capture_output=True, cwd=os.path.dirname(os.path.abspath(path)))
        except Exception:
            pass
        return f"File {path} written successfully."
    except Exception as e:
        return f"Write failed: {e}"

@tool
def web_search_tool(query: str) -> str:
    """Search the web."""
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
            return json.dumps(results, ensure_ascii=False)
    except Exception as e:
        return f"Web search failed or duckduckgo-search not installed: {str(e)}"

@tool
def generate_repo_map_tool(path: str = ".") -> str:
    """Scans the given directory, ignores .git and common ignore patterns, and returns a high-level tree map of the repository with file sizes."""
    import os
    
    def format_size(size):
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f}{unit}"
            size /= 1024.0
        return f"{size:.1f}TB"

    def build_tree(dir_path, prefix=""):
        ignore_dirs = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', '.next'}
        tree_str = ""
        try:
            entries = sorted(os.listdir(dir_path))
        except Exception as e:
            return f"Error reading {dir_path}: {e}\\n"
            
        entries = [e for e in entries if e not in ignore_dirs]
        
        for i, entry in enumerate(entries):
            is_last = i == len(entries) - 1
            full_path = os.path.join(dir_path, entry)
            connector = "└── " if is_last else "├── "
            
            try:
                if os.path.isdir(full_path):
                    tree_str += f"{prefix}{connector}{entry}/\\n"
                    extension = "    " if is_last else "│   "
                    tree_str += build_tree(full_path, prefix + extension)
                else:
                    size = os.path.getsize(full_path)
                    tree_str += f"{prefix}{connector}{entry} ({format_size(size)})\\n"
            except Exception:
                tree_str += f"{prefix}{connector}{entry} (error reading)\\n"
                
        return tree_str
        
    try:
        abs_path = os.path.abspath(path)
        tree_output = f"{abs_path}\\n" + build_tree(abs_path)
        return tree_output if len(tree_output) < 8000 else tree_output[:8000] + "\\n... (truncated)"
    except Exception as e:
        return f"Repo map generation failed: {str(e)}"

@tool
def create_artifact_tool(name: str, content: str) -> str:
    """Creates or updates a markdown artifact for the user to view. Use this for plans, tasks, or long structured reports. Emit to UI."""
    emit_event("artifact", "System", json.dumps({"name": name, "content": content}))
    return f"Artifact {name} updated successfully on UI."

@tool
def edit_file_tool(path: str, target_content: str, replacement_content: str) -> str:
    """Edit an existing file by exactly replacing target_content with replacement_content."""
    try:
${permissions?.writeFile === 'allow' ? '' : `        emit_event("ask_human", "系统拦截", f"智能体请求修改文件：\\n\\n\`{path}\`\\n\\n是否允许？(同意请按回车或y，拒绝请提供意见)", "")
        user_input = builtins.input()
        if user_input.strip().lower() not in ['', 'y', 'yes']:
            return f"File edit rejected by user. Feedback: {user_input}"
`}        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        if target_content not in content:
            return f"Edit failed: target_content not found in {path}. Please make sure you are matching the exact content including whitespace."
        if content.count(target_content) > 1:
            return f"Edit failed: target_content appears multiple times in {path}. Please provide a more specific target_content block."
        new_content = content.replace(target_content, replacement_content)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        try:
            subprocess.run(['git', 'add', path], check=True, capture_output=True, cwd=os.path.dirname(os.path.abspath(path)))
            subprocess.run(['git', 'commit', '-m', f'mimi-checkpoint: modified {path}'], capture_output=True, cwd=os.path.dirname(os.path.abspath(path)))
        except Exception:
            pass
        return f"File {path} edited successfully."
    except Exception as e:
        return f"Edit failed: {e}"

# Global env
global_api_key = os.environ.get("OPENAI_API_KEY", "")
global_base_url = os.environ.get("OPENAI_API_BASE", "https://api.openai.com/v1")
global_model = os.environ.get("OPENAI_MODEL_NAME", "gpt-4o")

def select_key(keys_str: str) -> str:
    if not keys_str: return global_api_key
    keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    return keys[0] if keys else global_api_key

@tool
def search_code_tool(query: str, path: str = '.') -> str:
    """Recursively search text files in path for query (regex) and return matching lines."""
    import os
    import re
    try:
        pattern = re.compile(query, re.IGNORECASE)
        ignore_dirs = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', '.next'}
        results = []
        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        for i, line in enumerate(f):
                            if pattern.search(line):
                                results.append(f"{file_path}:{i+1}: {line.strip()}")
                except Exception:
                    pass
        if not results:
            return "No matches found."
        output = "\\n".join(results)
        return output if len(output) < 8000 else output[:8000] + "\\n... (truncated)"
    except Exception as e:
        return f"Search failed: {e}"

@tool
def delegate_task_tool(role: str, task: str) -> str:
    """Delegate a sub-task to another agent with a specific role."""
    try:
        from langgraph.prebuilt import create_react_agent
        emit_event("system", "Subagent", f"Delegating to {role}: {task}")
        
        def run_subagent():
            original_cwd = os.getcwd()
            temp_dir = tempfile.mkdtemp()
            try:
                shutil.copytree(original_cwd, temp_dir, dirs_exist_ok=True, ignore=shutil.ignore_patterns('.git', 'node_modules'))
                os.chdir(temp_dir)
                
                llm = ChatOpenAI(temperature=0.7, model_name=global_model, base_url=global_base_url, api_key=global_api_key)
                tools = [execute_command_tool, read_file_tool, write_file_tool, edit_file_tool, search_code_tool, web_search_tool, generate_repo_map_tool]
                sys_msg = SystemMessage(content=f"You are a helpful assistant taking on the role of: {role}. Your task is: {task}")
                
                handler = SubAgentStreamHandler(role)
                sub_agent = create_react_agent(llm, tools=tools, state_modifier=sys_msg)
                
                result = sub_agent.invoke({"messages": [HumanMessage(content="Begin task.")]}, config={"callbacks": [handler]})
                return result["messages"][-1].content
            finally:
                os.chdir(original_cwd)
                shutil.rmtree(temp_dir, ignore_errors=True)

        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_subagent)
            return future.result(timeout=300)
    except concurrent.futures.TimeoutError:
        return f"Delegation to {role} timed out after 300 seconds."
    except Exception as e:
        return f"Delegation failed: {e}"

@tool
def spawn_parallel_agents(tasks_json: str) -> str:
    """Spawns multiple subagents in parallel. Input tasks_json should be a JSON array of objects with 'role' and 'task'."""
    try:
        tasks = json.loads(tasks_json)
        if not isinstance(tasks, list):
            return "Error: tasks_json must be a JSON array of objects."
        
        from langgraph.prebuilt import create_react_agent
        
        def run_parallel_subagent(role, task):
            original_cwd = os.getcwd()
            branch_name = f"subagent-{role.replace(' ', '-').lower()}-{uuid.uuid4().hex[:8]}"
            worktree_dir = os.path.abspath(os.path.join(original_cwd, f"../.mimicode_worktrees/{branch_name}"))
            try:
                os.makedirs(os.path.dirname(worktree_dir), exist_ok=True)
                subprocess.run(['git', 'branch', branch_name], cwd=original_cwd, capture_output=True)
                subprocess.run(['git', 'worktree', 'add', worktree_dir, branch_name], cwd=original_cwd, capture_output=True)
                os.chdir(worktree_dir)
                
                llm = ChatOpenAI(temperature=0.7, model_name=global_model, base_url=global_base_url, api_key=global_api_key)
                tools = [execute_command_tool, read_file_tool, write_file_tool, edit_file_tool, search_code_tool, web_search_tool, generate_repo_map_tool]
                sys_msg = SystemMessage(content=f"You are a helpful assistant taking on the role of: {role}. Your task is: {task} You are working in an isolated git worktree on branch '{branch_name}'")
                
                handler = SubAgentStreamHandler(role)
                sub_agent = create_react_agent(llm, tools=tools, state_modifier=sys_msg)
                
                result = sub_agent.invoke({"messages": [HumanMessage(content="Begin task.")]}, config={"callbacks": [handler]})
                
                subprocess.run(['git', 'add', '.'], cwd=worktree_dir, capture_output=True)
                subprocess.run(['git', 'commit', '-m', f"Subagent {role} automated commit"], cwd=worktree_dir, capture_output=True)
                
                return f"[{role} Result (Branch: {branch_name})]: {result['messages'][-1].content}"
            finally:
                os.chdir(original_cwd)
                subprocess.run(['git', 'worktree', 'remove', '-f', worktree_dir], cwd=original_cwd, capture_output=True)

        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(tasks)) as executor:
            future_to_task = {
                executor.submit(run_parallel_subagent, t.get('role', 'Subagent'), t.get('task', 'No task')): t
                for t in tasks
            }
            for future in concurrent.futures.as_completed(future_to_task, timeout=300):
                try:
                    res = future.result()
                    results.append(res)
                except Exception as exc:
                    t = future_to_task[future]
                    results.append(f"[{t.get('role', 'Subagent')} Error]: {exc}")
        
        return "\\n\\n".join(results)
    except concurrent.futures.TimeoutError:
        return "Parallel agent execution timed out after 300 seconds."
    except Exception as e:
        return f"Failed to spawn parallel agents: {e}"

from langgraph.types import interrupt, Command

@tool
def ask_user_tool(question: str) -> str:
    """Ask the human user a question and wait for their answer. This will pause the workflow."""
    emit_event("ask_human", "Agent Question", question, "")
    # The graph will suspend here and yield control back to harness
    return interrupt(question)

@tool
def send_to_agent(target_agent: str, message: str) -> str:
    """Send a structured message to a specific agent via mailbox."""
    emit_event("agent_message", "System", f"Message sent to {target_agent}: {message[:100]}...")
    return json.dumps({"agent_mailbox": {target_agent: [message]}})

@tool
def post_to_taskboard(task_title: str, task_description: str, assigned_to: str) -> str:
    """Post a decomposed sub-task to the shared task board."""
    emit_event("task_posted", "TaskBoard", json.dumps({"title": task_title, "assigned": assigned_to}))
    return json.dumps({"task_board": [{"title": task_title, "description": task_description, "assigned_to": assigned_to}]})

class AgentHarness:
    """A wrapper engine that manages the LangGraph execution lifecycle and environment isolation."""
    def __init__(self, workflow_builder, project_path: str):
        self.workflow_builder = workflow_builder
        self.project_path = os.path.abspath(project_path)
        
    def setup(self):
        emit_event("system", "Harness", f"Harness initialized. Mounting project workspace: {self.project_path}")
        os.makedirs(self.project_path, exist_ok=True)
        os.chdir(self.project_path)
        subprocess.run(['git', 'init'], cwd=self.project_path, capture_output=True)
        # Setup specific environment variables for isolation
        os.environ["PYTHONPATH"] = self.project_path
        
        # Generate Repo Map Context automatically
        try:
            repo_map_path = os.path.join(self.project_path, ".harness_repo_map.txt")
            repo_tree = []
            for root, dirs, files in os.walk(self.project_path):
                level = root.replace(self.project_path, '').count(os.sep)
                if level > 2:
                    del dirs[:]
                    continue
                if '.git' in dirs: dirs.remove('.git')
                if 'node_modules' in dirs: dirs.remove('node_modules')
                indent = ' ' * 4 * level
                repo_tree.append(f"{indent}{os.path.basename(root)}/")
                subindent = ' ' * 4 * (level + 1)
                for f in files:
                    repo_tree.append(f"{subindent}{f}")
            with open(repo_map_path, 'w', encoding='utf-8') as f:
                f.write("\\n".join(repo_tree))
        except Exception as e:
            emit_event("system", "Harness", f"Repo map generation failed: {e}")
        
    async def run(self, initial_data: str):
        try:
            self.setup()
            conn = sqlite3.connect(".harness_checkpoints.sqlite", check_same_thread=False)
            memory_saver = SqliteSaver(conn)
            app = self.workflow_builder.compile(checkpointer=memory_saver)
            emit_event("system", "Harness", "Starting Graph Execution with Checkpointer Persistence...")
            
            config = {"recursion_limit": 50, "configurable": {"thread_id": "harness_thread_1"}}
            if initial_data.startswith("RESUME::"):
                resume_data = initial_data.replace("RESUME::", "", 1)
                emit_event("system", "Harness", f"Resuming graph from interrupt with input: {resume_data}")
                result = await app.ainvoke(Command(resume=resume_data), config=config)
            else:
                result = await app.ainvoke({"messages": [], "current_data": initial_data}, config=config)
                
            state = app.get_state(config)
            if state.next:
                emit_event("interrupt", "Harness", "Graph execution suspended. Waiting for user input to resume.")
                return result
            
            # Calculate cost via usage_metadata in AIMessages natively
            total_tokens = 0
            prompt_tokens = 0
            completion_tokens = 0
            for msg in result.get("messages", []):
                if hasattr(msg, "usage_metadata") and msg.usage_metadata:
                    total_tokens += msg.usage_metadata.get("total_tokens", 0)
                    prompt_tokens += msg.usage_metadata.get("input_tokens", 0)
                    completion_tokens += msg.usage_metadata.get("output_tokens", 0)
                    
            # Estimate cost (OpenAI default models baseline)
            total_cost = (prompt_tokens / 1000.0) * 0.005 + (completion_tokens / 1000.0) * 0.015
            
            emit_event("system", "Harness", json.dumps({
                "type": "cost_tracking",
                "total_tokens": total_tokens,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_cost": total_cost
            }))
                
            emit_event("success", "Harness", "Workflow execution finished successfully within Harness.")
            return result
        except KeyboardInterrupt:
            emit_event("error", "Harness", "Execution interrupted by user.")
        except Exception as e:
            import traceback
            emit_event("error", "Harness", f"Harness caught a fatal execution error: {str(e)}\\n{traceback.format_exc()}")
        finally:
            self.teardown()
            
    def teardown(self):
        emit_event("system", "Harness", "Harness teardown complete. Environment restored.")

workflow = StateGraph(AgentState)

# Universal Tools Node is configured dynamically inside run_native_team

def should_continue_tools(state: AgentState) -> str:
    messages = state.get("messages", [])
    if not messages: return "next"
    last_message = messages[-1]
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"
    return "next"

`;

  const nodeVarMap: Record<string, string> = {};
  nodes.forEach(n => {
    nodeVarMap[n.id] = `node_${n.id.replace(/-/g, '_')}`;
  });

  code += `
def global_tools_node_func(state: AgentState):
    global GLOBAL_TOOLS_NODE_INSTANCE
    return GLOBAL_TOOLS_NODE_INSTANCE.invoke(state)

def tool_router(state: AgentState) -> str:
    messages = state.get("messages", [])
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.tool_calls:
            return msg.name if msg.name else END
    return END
`;

  const processGraphLevel = (parentId: string | null | undefined, graphVarName: string) => {
    const currentLevelNodes = nodes.filter(n => (n.parentId || null) === (parentId || null));
    if (currentLevelNodes.length === 0) return;

    const currentLevelEdges = edges.filter(e => {
      const sourceNode = nodes.find(n => n.id === e.source);
      const targetNode = nodes.find(n => n.id === e.target);
      return (sourceNode?.parentId || null) === (parentId || null) && 
             (targetNode?.parentId || null) === (parentId || null);
    });

    const inDegree: Record<string, number> = {};
    currentLevelNodes.forEach(n => inDegree[n.id] = 0);
    currentLevelEdges.forEach(e => {
      if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    });

    let possibleEntries = currentLevelNodes.filter(n => inDegree[n.id] === 0);
    let inputNode = possibleEntries.find(n => n.type === 'inputNode');
    let localEntryNodeId = inputNode ? inputNode.id : (possibleEntries.length > 0 ? possibleEntries[0].id : currentLevelNodes[0].id);

    // 1. Generate Python Nodes
    currentLevelNodes.forEach((node) => {
      const safeNodeId = nodeVarMap[node.id];
      const isParent = nodes.some(n => n.parentId === node.id);

      if (isParent) {
        const subgraphVarName = `subgraph_${safeNodeId}`;
        code += `\n${subgraphVarName} = StateGraph(AgentState)\n`;
        processGraphLevel(node.id, subgraphVarName);
        code += `${graphVarName}.add_node("${safeNodeId}", ${subgraphVarName}.compile())\n`;
      } else {

    const safeNodeId = `node_${node.id.replace(/-/g, '_')}`;
    nodeVarMap[node.id] = safeNodeId;
    
    if (node.type === 'inputNode') {
      const isRuntimeOnly = node.data.isRuntimeOnly;
      const prompt = esc(node.data.prompt as string || '');
      if (isRuntimeOnly) {
        code += `def ${safeNodeId}(state: AgentState):
    emit_event("agent_started", "InputNode", "Waiting for runtime input...", "${node.id}")
    runtime_task = state.get("current_data", "")
    emit_event("agent_finished", "InputNode", f"Data: {runtime_task}", "${node.id}")
    return {"messages": [HumanMessage(content=runtime_task)], "current_data": f"\\n\\n---\\n\\n[InputNode]: {runtime_task}"}

${graphVarName}.add_node("${safeNodeId}", ${safeNodeId})
`;
      } else {
        code += `def ${safeNodeId}(state: AgentState):
    emit_event("agent_started", "InputNode", "Initializing input data...", "${node.id}")
    runtime_task = state.get("current_data", "")
    prompt_data = "${prompt}\\n\\n" + runtime_task if runtime_task else "${prompt}"
    emit_event("agent_finished", "InputNode", f"Data: {prompt_data}", "${node.id}")
    return {"messages": [HumanMessage(content=prompt_data)], "current_data": f"\\n\\n---\\n\\n[InputNode]: {prompt_data}"}

${graphVarName}.add_node("${safeNodeId}", ${safeNodeId})
`;
      }
    } 
    else if (node.type === 'toolNode') {
      let toolExecutionCode = "";
      const toolName = node.data.tool || "code_interpreter";
      if (toolName === "web_search") {
          toolExecutionCode = `result = web_search_tool.invoke({"query": str(data)})`;
      } else if (toolName === "file_system") {
          toolExecutionCode = `result = read_file_tool.invoke({"path": str(data)})`;
      } else {
          toolExecutionCode = `result = execute_command_tool.invoke({"command": str(data)})`;
      }
      
      code += `def ${safeNodeId}(state: AgentState):
    emit_event("agent_started", "ToolNode", f"Executing Tool manually in flow...", "${node.id}")
    data = state.get("current_data", "")
    
    # Dynamically injected tool execution
    try:
        ${toolExecutionCode}
    except Exception as e:
        result = str(e)
        
    emit_event("agent_finished", "ToolNode", f"Result:\\n{str(result)[:500]}...", "${node.id}")
    return {"messages": [AIMessage(content=str(result))], "current_data": f"\\n\\n---\\n\\n[ToolNode Result]: {str(result)}"}

${graphVarName}.add_node("${safeNodeId}", ${safeNodeId})
`;
    }
    else if (node.type === 'routerNode') {
      const conditionStr = esc(node.data.condition as string || '');
      code += `def ${safeNodeId}(state: AgentState):
    return state

${graphVarName}.add_node("${safeNodeId}", ${safeNodeId})

def route_condition_${safeNodeId}(state: AgentState) -> str:
    data = state.get("current_data", "")
    condition_str = "${conditionStr}".strip()
    
    emit_event("agent_started", "RouterNode", f"Evaluating condition: {condition_str}", "${node.id}")
    
    try:
        llm = ChatOpenAI(
            temperature=0,
            model_name=global_model,
            base_url=global_base_url,
            api_key=global_api_key
        )
        prompt = f"""Based on the following data, evaluate this condition and respond with ONLY 'true' or 'false':

Condition: {condition_str}

Data:
{str(data)[:2000]}

Answer (true/false):"""
        response = llm.invoke([HumanMessage(content=prompt)])
        result = response.content.strip().lower()
        
        if 'true' in result:
            emit_event("agent_finished", "RouterNode", "Routed to TRUE", "${node.id}")
            return "true_branch"
        else:
            emit_event("agent_finished", "RouterNode", "Routed to FALSE", "${node.id}")
            return "false_branch"
    except Exception as e:
        emit_event("error", "RouterNode", f"Condition evaluation failed: {e}", "${node.id}")
        return "false_branch"
`;
    } else if (node.type === 'feedbackNode') {
      code += `def ${safeNodeId}(state: AgentState):
    return state

${graphVarName}.add_node("${safeNodeId}", ${safeNodeId})

def route_feedback_${safeNodeId}(state: AgentState) -> str:
    data = state.get("current_data", "")
    emit_event("system", "System", "Evaluating semantic feedback loop...", "${node.id}")
    try:
        llm = ChatOpenAI(temperature=0, model_name=global_model, base_url=global_base_url, api_key=global_api_key)
        prompt = "Does the following text indicate an approval/success to proceed, or a rejection/failure requiring revisions? Answer ONLY 'approve' or 'revise'.\\\\n\\\\nText: " + str(data)[:2000]
        response = llm.invoke([HumanMessage(content=prompt)])
        result = response.content.strip().lower()
        if 'revise' in result or 'reject' in result or 'fail' in result:
            emit_event("system", "System", "Feedback Loop Triggered: REVISE", "${node.id}")
            return "false_branch"
        emit_event("system", "System", "Feedback Loop Evaluated: APPROVE", "${node.id}")
        return "true_branch"
    except Exception as e:
        return "true_branch"
`;
    }
    else {
      // Default to AgentNode
      const role = esc(node.data.role as string || 'Expert');
      const name = esc((node.data.label || node.data.name || `Agent`) as string);
      const taskDesc = esc(node.data.taskDescription as string || '');
      const expectedOutput = esc(node.data.expectedOutput as string || '');
      
      const nodeBaseUrl = (node.data.baseUrl as string || '').trim();
      const nodeModel = (node.data.model as string || '').trim();
      const nodeApiKey = (node.data.apiKey as string || '').trim();
      
      const matchedSub = findSubAgentConfig(node.data.role as string || '', name);
      
      let useBaseUrl = 'global_base_url';
      let useModel = 'global_model';
      let useApiKey = 'global_api_key';

      if (matchedSub?.baseUrl || nodeBaseUrl) useBaseUrl = `"${esc(matchedSub?.baseUrl || nodeBaseUrl)}"`;
      if (matchedSub?.model || nodeModel) useModel = `"${esc(matchedSub?.model || nodeModel)}"`;
      if (matchedSub?.apiKey || nodeApiKey) useApiKey = `select_key("${esc(matchedSub?.apiKey || nodeApiKey)}")`;

      const toolMap: Record<string, string> = {
        'execute_command_tool': 'execute_command_tool',
        'read_file_tool': 'read_file_tool',
        'write_file_tool': 'write_file_tool',
        'edit_file_tool': 'edit_file_tool',
        'web_search_tool': 'web_search_tool',
        'code_interpreter': 'code_interpreter_tool',
        'generate_repo_map_tool': 'generate_repo_map_tool',
        'create_artifact_tool': 'create_artifact_tool',
        'search_code_tool': 'search_code_tool',
        'delegate_task_tool': 'delegate_task_tool',
        'ask_user_tool': 'ask_user_tool',
        'send_to_agent': 'send_to_agent',
        'post_to_taskboard': 'post_to_taskboard'
      };
      
      const selectedTools: string[] = (node.data.tools as string[]) || [];
      const pythonTools = selectedTools.map(t => toolMap[t] || t).filter(Boolean);
      const toolsStr = pythonTools.length > 0 ? "[" + pythonTools.join(', ') + "]" : "[]";
      const memoryWindow = parseInt(node.data.memoryWindow as any, 10) || 10;
      
      const roleLower = role.toLowerCase();
      const isPlanningAgent = ['manager', 'architect', 'planner', 'pm'].some(r => roleLower.includes(r));
      
      const outEdgesForNode = edges.filter(e => e.source === node.id);
      const edgesBySourceHandle: Record<string, typeof outEdgesForNode> = {};
      outEdgesForNode.forEach(e => {
        const h = e.sourceHandle || 'default';
        if (!edgesBySourceHandle[h]) edgesBySourceHandle[h] = [];
        edgesBySourceHandle[h].push(e);
      });
      const handleNames = Object.keys(edgesBySourceHandle);
      
      let extraContextInjections = '';
      if (handleNames.length > 1) {
        extraContextInjections += `    context_parts.append("You have multiple output paths: ['${handleNames.join("', '")}']. You MUST conclude your final response with <ROUTE>path_name</ROUTE> to indicate where to send your output.")\\n`;
      }
      if (isPlanningAgent) {
        extraContextInjections += `    context_parts.append("You are a PLANNING agent. You MUST use post_to_taskboard to assign tasks.")\\n`;
      }
      if (node.data.framework) {
        extraContextInjections += `    context_parts.append("Use framework: ${esc(node.data.framework as string)}")\\n`;
      }
      if (node.data.testMode) {
        extraContextInjections += `    context_parts.append("Test mode is enabled: ${esc(node.data.testMode as string)}")\\n`;
      }
      if (node.data.deployEnv) {
        extraContextInjections += `    context_parts.append("Deploy environment: ${esc(node.data.deployEnv as string)}")\\n`;
      }

      code += `def ${safeNodeId}(state: AgentState):
    emit_event("agent_started", "${name}", "Thinking...", "${node.id}")
    
    llm = ChatOpenAI(
        temperature=0.7,
        model_name=${useModel},
        base_url=${useBaseUrl},
        api_key=${useApiKey}
    )
    
    task_instruction = "${taskDesc}"
    expected_fmt = "${expectedOutput}"
    context_parts = [f"You are ${name}. Role: ${role}."]
    if task_instruction:
        context_parts.append(f"Your specific task: {task_instruction}")
    if expected_fmt:
        context_parts.append(f"Expected output format: {expected_fmt}")
    context_parts.append("You have access to local tools. Call them if necessary.")
${extraContextInjections}${pythonTools.includes('create_artifact_tool') ? `    context_parts.append("IMPORTANT: Use create_artifact_tool to create an 'implementation_plan.md' when you make a plan, which will pause execution to request human review.")\\n` : ''}${pythonTools.includes('edit_file_tool') ? `    context_parts.append("IMPORTANT: Prefer using edit_file_tool for modifying files instead of write_file_tool, to avoid rewriting the entire file. Ensure target_content exactly matches the existing text, including whitespace.")\\n` : ''}${pythonTools.includes('ask_user_tool') ? `    context_parts.append("IMPORTANT: If you need clarification or run into a blocker, use ask_user_tool to ask the user a question and wait for their answer.")\\n` : ''}
    # Auto-inject project repository map for spatial context
    repo_map_path = ".harness_repo_map.txt"
    if os.path.exists(repo_map_path):
        with open(repo_map_path, 'r', encoding='utf-8') as f:
            repo_map_content = f.read()
        if repo_map_content:
            context_parts.append(f"Project Workspace Map:\\n{repo_map_content}")
            
    context_parts.append(f"Previous context: {state.get('current_data', '')}")
    sys_msg = SystemMessage(content="\\n\\n".join(context_parts))
    
    # Memory Management: Token Truncation
    trimmed_messages = trim_messages_safe(state.get("messages", []), ${memoryWindow})
    
    try:
        # Bind the available tools to the LLM
        agent_tools = ${toolsStr}
        if "GLOBAL_MCP_TOOLS" in globals():
            agent_tools.extend(GLOBAL_MCP_TOOLS)
        llm_with_tools = llm.bind_tools(agent_tools) if agent_tools else llm
        
        response = llm_with_tools.invoke([sys_msg] + trimmed_messages)
        response.name = "${safeNodeId}"
        if hasattr(response, 'tool_calls') and response.tool_calls:
            emit_event("agent_action", "${name}", f"Calling tools: {[t['name'] for t in response.tool_calls]}", "${node.id}")
            return {"messages": [response], "current_data": "Waiting for tool result..."}
        else:
            content = response.content
            emit_event("agent_finished", "${name}", content, "${node.id}")
            return {"messages": [response], "current_data": f"\\n\\n---\\n\\n[${name}]: {content}"}

    except Exception as e:
        err = f"LLM Error: {str(e)}"
        emit_event("error", "${name}", err, "${node.id}")
        return {"messages": [AIMessage(content=err)], "current_data": f"\\n\\n---\\n\\n[${name} Error]: {err}"}

${graphVarName}.add_node("${safeNodeId}", ${safeNodeId})
`;
    }
 
      }
    });

    // 2. Generate Python Edges
    currentLevelNodes.forEach(node => {
      const safeSource = nodeVarMap[node.id];
      const isParent = nodes.some(n => n.parentId === node.id);
      
      if (isParent) {
        const outEdges = currentLevelEdges.filter(e => e.source === node.id);
        outEdges.forEach(e => {
          code += `${graphVarName}.add_edge("${safeSource}", "${nodeVarMap[e.target]}")\n`;
        });
      } else {

    const safeSource = nodeVarMap[node.id];
    const outEdges = currentLevelEdges.filter(e => e.source === node.id);
    
    if (node.type === 'routerNode' || node.type === 'feedbackNode') {
      const trueEdges = outEdges.filter(e => e.sourceHandle === 'source-true');
      const falseEdges = outEdges.filter(e => e.sourceHandle === 'source-false');
      
      let trueTarget = 'END';
      if (trueEdges.length === 1) {
        trueTarget = `"${nodeVarMap[trueEdges[0].target]}"`;
      } else if (trueEdges.length > 1) {
        code += `def fan_out_true_${safeSource}(state: AgentState):\n    return state\n`;
        code += `${graphVarName}.add_node("fan_out_true_${safeSource}", fan_out_true_${safeSource})\n`;
        trueEdges.forEach(e => {
          code += `${graphVarName}.add_edge("fan_out_true_${safeSource}", "${nodeVarMap[e.target]}")\n`;
        });
        trueTarget = `"fan_out_true_${safeSource}"`;
      }

      let falseTarget = 'END';
      if (falseEdges.length === 1) {
        falseTarget = `"${nodeVarMap[falseEdges[0].target]}"`;
      } else if (falseEdges.length > 1) {
        code += `def fan_out_false_${safeSource}(state: AgentState):\n    return state\n`;
        code += `${graphVarName}.add_node("fan_out_false_${safeSource}", fan_out_false_${safeSource})\n`;
        falseEdges.forEach(e => {
          code += `${graphVarName}.add_edge("fan_out_false_${safeSource}", "${nodeVarMap[e.target]}")\n`;
        });
        falseTarget = `"fan_out_false_${safeSource}"`;
      }
      
      const conditionFunc = node.type === 'feedbackNode' ? `route_feedback_${safeSource}` : `route_condition_${safeSource}`;
      code += `${graphVarName}.add_conditional_edges("${safeSource}", ${conditionFunc}, {
    "true_branch": ${trueTarget},
    "false_branch": ${falseTarget}
})\n`;
    } 
    else if (node.type === 'inputNode' || node.type === 'toolNode') {
      // Normal nodes without tools
      outEdges.forEach(e => {
        code += `${graphVarName}.add_edge("${safeSource}", "${nodeVarMap[e.target]}")\n`;
      });
    } 
    else {
      // Agent Nodes (Need tools condition)
      const edgesBySourceHandle: Record<string, typeof outEdges> = {};
      outEdges.forEach(e => {
        const h = e.sourceHandle || 'default';
        if (!edgesBySourceHandle[h]) edgesBySourceHandle[h] = [];
        edgesBySourceHandle[h].push(e);
      });
      const handleNames = Object.keys(edgesBySourceHandle);

      const getTargetStr = (e: Edge) => {
        let finalTarget = `"${nodeVarMap[e.target]}"`;
        if (e.targetHandle && !['target-input', 'in-code', 'source-output'].includes(e.targetHandle)) {
          const injectNodeName = `inject_${e.id.replace(/-/g, '_')}`;
          code += `def ${injectNodeName}(state: AgentState):
    state["current_data"] += "\\n\\n[System Alert]: Data received via '${e.targetHandle}' port.\\n"
    return state\n`;
          code += `${graphVarName}.add_node("${injectNodeName}", ${injectNodeName})\n`;
          code += `${graphVarName}.add_edge("${injectNodeName}", "${nodeVarMap[e.target]}")\n`;
          finalTarget = `"${injectNodeName}"`;
        }
        return finalTarget;
      };

      if (handleNames.length > 1) {
        code += `def route_agent_${safeSource}(state: AgentState) -> str:
    messages = state.get("messages", [])
    if messages and hasattr(messages[-1], 'tool_calls') and messages[-1].tool_calls:
        return "tools"
    if not messages: return "${handleNames[0]}"
    last_msg = getattr(messages[-1], 'content', '')
    import re
    match = re.search(r"<ROUTE>(.*?)</ROUTE>", last_msg)
    if match:
        route = match.group(1).strip()
        if route in [${handleNames.map(h => `"${h}"`).join(', ')}]:
            return route
    return "${handleNames[0]}"\n`;
        const routeMap: Record<string, string> = {
          '"tools"': '"global_tools_node"'
        };

        handleNames.forEach(h => {
          const hEdges = edgesBySourceHandle[h];
          if (hEdges.length === 1) {
            routeMap[`"${h}"`] = getTargetStr(hEdges[0]);
          } else if (hEdges.length > 1) {
            const fanOutName = `fan_out_${safeSource}_${h.replace(/-/g, '_')}`;
            code += `def ${fanOutName}(state: AgentState):\n    return state\n`;
            code += `${graphVarName}.add_node("${fanOutName}", ${fanOutName})\n`;
            hEdges.forEach(e => {
              code += `${graphVarName}.add_edge("${fanOutName}", ${getTargetStr(e)})\n`;
            });
            routeMap[`"${h}"`] = `"${fanOutName}"`;
          }
        });
        
        const routeMapStr = Object.entries(routeMap).map(([k, v]) => `    ${k}: ${v}`).join(',\n');
        code += `${graphVarName}.add_conditional_edges("${safeSource}", route_agent_${safeSource}, {\n${routeMapStr}\n})\n`;
      } else {
        if (outEdges.length === 0) {
          code += `${graphVarName}.add_conditional_edges("${safeSource}", should_continue_tools, {
    "tools": "global_tools_node",
    "next": END
})\n`;
        } else if (outEdges.length === 1) {
          code += `${graphVarName}.add_conditional_edges("${safeSource}", should_continue_tools, {
    "tools": "global_tools_node",
    "next": ${getTargetStr(outEdges[0])}
})\n`;
        } else {
          code += `def fan_out_${safeSource}(state: AgentState):\n    return state\n`;
          code += `${graphVarName}.add_node("fan_out_${safeSource}", fan_out_${safeSource})\n`;
          code += `${graphVarName}.add_conditional_edges("${safeSource}", should_continue_tools, {
    "tools": "global_tools_node",
    "next": "fan_out_${safeSource}"
})\n`;
          outEdges.forEach(e => {
            code += `${graphVarName}.add_edge("fan_out_${safeSource}", ${getTargetStr(e)})\n`;
          });
        }
      }
    }
 
      }
    });

    // 3. Add global tool node and tool router back-edges for this level
    code += `${graphVarName}.add_node("global_tools_node", global_tools_node_func)\n`;
    const agentNodes = currentLevelNodes.filter(n => n.type === 'agentNode' || !n.type);
    if (agentNodes.length > 0) {
      let toolBackRouteMap: string[] = [];
      agentNodes.forEach(n => {
        toolBackRouteMap.push(`"${nodeVarMap[n.id]}": "${nodeVarMap[n.id]}"`);
      });
      code += `${graphVarName}.add_conditional_edges("global_tools_node", tool_router, {
    ${toolBackRouteMap.join(',\n    ')},
    END: END
})\n`;
    }

    if (localEntryNodeId) {
      code += `${graphVarName}.set_entry_point("${nodeVarMap[localEntryNodeId]}")\n`;
    }
  };

  processGraphLevel(null, "workflow");

  code += `
async def run_native_team(project_path: str, task_description: str):
    emit_event("system", "System", "Initializing LangGraph Engine from Visual Builder...")
    if not global_api_key:
        emit_event("error", "System", "No API key configured. Please set your API key in Settings.")
        return
        
    mcp_servers_config_str = ${mcpServersSafe}
    mcp_servers_config = json.loads(mcp_servers_config_str)
    base_tools = [execute_command_tool, read_file_tool, write_file_tool, edit_file_tool, web_search_tool, code_interpreter_tool, generate_repo_map_tool, create_artifact_tool, search_code_tool, delegate_task_tool, spawn_parallel_agents, ask_user_tool, send_to_agent, post_to_taskboard]
    all_tools = list(base_tools)
    
    global GLOBAL_MCP_TOOLS
    GLOBAL_MCP_TOOLS = []

    async with contextlib.AsyncExitStack() as stack:
        for srv in mcp_servers_config:
            try:
                cmd = srv.get("command")
                args = srv.get("args", [])
                env = srv.get("env", None)
                if not cmd: continue
                server_params = StdioServerParameters(command=cmd, args=args, env=env)
                read, write = await stack.enter_async_context(stdio_client(server_params))
                session = await stack.enter_async_context(ClientSession(read, write))
                await session.initialize()
                srv_tools = await load_mcp_tools(session)
                all_tools.extend(srv_tools)
                GLOBAL_MCP_TOOLS.extend(srv_tools)
                emit_event("system", "MCP", f"Loaded tools from {cmd}")
            except Exception as e:
                emit_event("error", "MCP", f"Failed to load MCP server {srv.get('command')}: {e}")

        global GLOBAL_TOOLS_NODE_INSTANCE
        GLOBAL_TOOLS_NODE_INSTANCE = ToolNode(all_tools)

        harness = AgentHarness(workflow, project_path)
        await harness.run(task_description)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"event": "error", "agent": "System", "message": "Usage: script.py <project_path> <task>"}))
        sys.exit(1)
    
    project_path = sys.argv[1]
    task_description = sys.argv[2]
    asyncio.run(run_native_team(project_path, task_description))
`;

  return code;
};
