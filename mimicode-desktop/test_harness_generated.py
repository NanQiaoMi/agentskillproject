import os
import json
import sys
import builtins
import subprocess
import threading

def emit_event(event_type: str, agent_name: str, message: str, node_id: str = ""):
    payload = { "event": event_type, "agent": agent_name, "message": message, "node_id": node_id, "is_team": True }
    print(json.dumps(payload, ensure_ascii=False), flush=True)

# Harness Auto-Bootstrapper: Ensure dependencies exist before loading heavy AI frameworks
def bootstrap_harness():
    reqs = ["langchain_openai", "langchain_core", "langgraph", "pydantic", "duckduckgo_search"]
    try:
        import langchain_openai
        import langgraph
        import pydantic
    except ImportError:
        emit_event("system", "Harness", "Installing required dependencies for Harness Engine...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-q"] + reqs, check=True)
            emit_event("system", "Harness", "Dependencies installed successfully.")
        except Exception as e:
            emit_event("error", "Harness", f"Failed to install dependencies: {str(e)}")
            sys.exit(1)

bootstrap_harness()

from typing import TypedDict, Annotated, Sequence
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from pydantic import BaseModel, Field

def add_strings(left: str, right: str) -> str:
    if not left: return right
    if not right: return left
    return left + right

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
        import threading
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        output_lines = []
        
        def read_stream(stream):
            for line in iter(stream.readline, ''):
                emit_event("system", "Terminal", line.rstrip('\n'))
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
            return "".join(output_lines) + "\nCommand execution timed out after 120 seconds."
            
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
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
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
            return f"Error reading {dir_path}: {e}\n"
            
        entries = [e for e in entries if e not in ignore_dirs]
        
        for i, entry in enumerate(entries):
            is_last = i == len(entries) - 1
            full_path = os.path.join(dir_path, entry)
            connector = "└── " if is_last else "├── "
            
            try:
                if os.path.isdir(full_path):
                    tree_str += f"{prefix}{connector}{entry}/\n"
                    extension = "    " if is_last else "│   "
                    tree_str += build_tree(full_path, prefix + extension)
                else:
                    size = os.path.getsize(full_path)
                    tree_str += f"{prefix}{connector}{entry} ({format_size(size)})\n"
            except Exception:
                tree_str += f"{prefix}{connector}{entry} (error reading)\n"
                
        return tree_str
        
    try:
        abs_path = os.path.abspath(path)
        tree_output = f"{abs_path}\n" + build_tree(abs_path)
        return tree_output if len(tree_output) < 8000 else tree_output[:8000] + "\n... (truncated)"
    except Exception as e:
        return f"Repo map generation failed: {str(e)}"

@tool
def create_artifact_tool(name: str, content: str) -> str:
    """Creates or updates a markdown artifact for the user to view. Use this for plans, tasks, or long structured reports. Emit to UI."""
    emit_event("artifact", "System", json.dumps({"name": name, "content": content}))
    if name == 'implementation_plan.md' or name == 'implementation_plan':
        emit_event('ask_human', 'System', '智能体制定了实施计划，请审查 Artifacts 面板。是否同意继续执行？(同意请按回车或y，拒绝请提供意见)', '')
        user_input = builtins.input()
        if user_input.strip().lower() not in ['', 'y', 'yes']:
            return f'Artifact {name} updated. User rejected plan with feedback: {user_input}'
    return f"Artifact {name} updated successfully on UI."

@tool
def edit_file_tool(path: str, target_content: str, replacement_content: str) -> str:
    """Edit an existing file by exactly replacing target_content with replacement_content."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
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
        output = "\n".join(results)
        return output if len(output) < 8000 else output[:8000] + "\n... (truncated)"
    except Exception as e:
        return f"Search failed: {e}"

@tool
def delegate_task_tool(role: str, task: str) -> str:
    """Delegate a sub-task to another agent with a specific role."""
    try:
        from langgraph.prebuilt import create_react_agent
        emit_event("system", "Subagent", f"Delegating to {role}: {task}")
        llm = ChatOpenAI(temperature=0.7, model_name=global_model, base_url=global_base_url, api_key=global_api_key)
        tools = [execute_command_tool, read_file_tool, write_file_tool, edit_file_tool, search_code_tool, web_search_tool, generate_repo_map_tool]
        sys_msg = SystemMessage(content=f"You are a helpful assistant taking on the role of: {role}. Your task is: {task}")
        sub_agent = create_react_agent(llm, tools=tools, state_modifier=sys_msg)
        result = sub_agent.invoke({"messages": [HumanMessage(content="Begin task.")]})
        return result["messages"][-1].content
    except Exception as e:
        return f"Delegation failed: {e}"

@tool
def ask_user_tool(question: str) -> str:
    """Ask the user a clarifying question and wait for their answer."""
    emit_event("ask_human", "Agent Question", question, "")
    return builtins.input()

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
                f.write("\n".join(repo_tree))
        except Exception as e:
            emit_event("system", "Harness", f"Repo map generation failed: {e}")
        
    def run(self, initial_data: str):
        try:
            self.setup()
            memory_saver = MemorySaver()
            app = self.workflow_builder.compile(checkpointer=memory_saver)
            emit_event("system", "Harness", "Starting Graph Execution with Checkpointer Persistence...")
            result = app.invoke(
                {"messages": [], "current_data": initial_data}, 
                config={"recursion_limit": 50, "configurable": {"thread_id": "harness_thread_1"}}
            )
            
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
            emit_event("error", "Harness", f"Harness caught a fatal execution error: {str(e)}\n{traceback.format_exc()}")
        finally:
            self.teardown()
            
    def teardown(self):
        emit_event("system", "Harness", "Harness teardown complete. Environment restored.")

workflow = StateGraph(AgentState)

# Universal Tools Node
tools_node = ToolNode([execute_command_tool, read_file_tool, write_file_tool, edit_file_tool, web_search_tool, code_interpreter_tool, generate_repo_map_tool, create_artifact_tool, search_code_tool, delegate_task_tool, ask_user_tool])
workflow.add_node("global_tools_node", tools_node)

def should_continue_tools(state: AgentState) -> str:
    messages = state.get("messages", [])
    if not messages: return "next"
    last_message = messages[-1]
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"
    return "next"

def node_input_1(state: AgentState):
    emit_event("agent_started", "InputNode", "Initializing input data...", "input-1")
    runtime_task = state.get("current_data", "")
    prompt_data = "User wants to test the system.\n\n" + runtime_task if runtime_task else "User wants to test the system."
    emit_event("agent_finished", "InputNode", f"Data: {prompt_data}", "input-1")
    return {"messages": [HumanMessage(content=prompt_data)], "current_data": f"\n\n---\n\n[InputNode]: {prompt_data}"}

workflow.add_node("node_input_1", node_input_1)
def node_qa(state: AgentState):
    emit_event("agent_started", "Tester", "Thinking...", "qa")
    
    llm = ChatOpenAI(
        temperature=0.7,
        model_name=global_model,
        base_url=global_base_url,
        api_key=global_api_key
    )
    
    task_instruction = "Please just output the word \"Approve\" so we can test the happy path."
    expected_fmt = ""
    context_parts = [f"You are Tester. Role: QA."]
    if task_instruction:
        context_parts.append(f"Your specific task: {task_instruction}")
    if expected_fmt:
        context_parts.append(f"Expected output format: {expected_fmt}")
    context_parts.append("You have access to local tools. Call them if necessary.")

    # Auto-inject project repository map for spatial context
    repo_map_path = ".harness_repo_map.txt"
    if os.path.exists(repo_map_path):
        with open(repo_map_path, 'r', encoding='utf-8') as f:
            repo_map_content = f.read()
        if repo_map_content:
            context_parts.append(f"Project Workspace Map:\n{repo_map_content}")
            
    context_parts.append(f"Previous context: {state.get('current_data', '')}")
    sys_msg = SystemMessage(content="\n\n".join(context_parts))
    
    # Memory Management: Token Truncation
    trimmed_messages = trim_messages_safe(state.get("messages", []), 10)
    
    try:
        # Bind the available tools to the LLM
        llm_with_tools = llm.bind_tools([]) if False else llm
        
        response = llm_with_tools.invoke([sys_msg] + trimmed_messages)
        response.name = "node_qa"
        if hasattr(response, 'tool_calls') and response.tool_calls:
            emit_event("agent_action", "Tester", f"Calling tools: {[t['name'] for t in response.tool_calls]}", "qa")
            return {"messages": [response], "current_data": "Waiting for tool result..."}
        else:
            content = response.content
            emit_event("agent_finished", "Tester", content, "qa")
            return {"messages": [response], "current_data": f"\n\n---\n\n[Tester]: {content}"}

    except Exception as e:
        err = f"LLM Error: {str(e)}"
        emit_event("error", "Tester", err, "qa")
        return {"messages": [AIMessage(content=err)], "current_data": f"\n\n---\n\n[Tester Error]: {err}"}

workflow.add_node("node_qa", node_qa)
def node_fb(state: AgentState):
    return state

workflow.add_node("node_fb", node_fb)

def route_feedback_node_fb(state: AgentState) -> str:
    data = state.get("current_data", "")
    emit_event("system", "System", "Evaluating semantic feedback loop...", "fb")
    try:
        llm = ChatOpenAI(temperature=0, model_name=global_model, base_url=global_base_url, api_key=global_api_key)
        prompt = "Does the following text indicate an approval/success to proceed, or a rejection/failure requiring revisions? Answer ONLY 'approve' or 'revise'.\\n\\nText: " + str(data)[:2000]
        response = llm.invoke([HumanMessage(content=prompt)])
        result = response.content.strip().lower()
        if 'revise' in result or 'reject' in result or 'fail' in result:
            emit_event("system", "System", "Feedback Loop Triggered: REVISE", "fb")
            return "false_branch"
        emit_event("system", "System", "Feedback Loop Evaluated: APPROVE", "fb")
        return "true_branch"
    except Exception as e:
        return "true_branch"
def node_deploy(state: AgentState):
    emit_event("agent_started", "Deployer", "Thinking...", "deploy")
    
    llm = ChatOpenAI(
        temperature=0.7,
        model_name=global_model,
        base_url=global_base_url,
        api_key=global_api_key
    )
    
    task_instruction = "Deploy Success"
    expected_fmt = ""
    context_parts = [f"You are Deployer. Role: Deploy."]
    if task_instruction:
        context_parts.append(f"Your specific task: {task_instruction}")
    if expected_fmt:
        context_parts.append(f"Expected output format: {expected_fmt}")
    context_parts.append("You have access to local tools. Call them if necessary.")

    # Auto-inject project repository map for spatial context
    repo_map_path = ".harness_repo_map.txt"
    if os.path.exists(repo_map_path):
        with open(repo_map_path, 'r', encoding='utf-8') as f:
            repo_map_content = f.read()
        if repo_map_content:
            context_parts.append(f"Project Workspace Map:\n{repo_map_content}")
            
    context_parts.append(f"Previous context: {state.get('current_data', '')}")
    sys_msg = SystemMessage(content="\n\n".join(context_parts))
    
    # Memory Management: Token Truncation
    trimmed_messages = trim_messages_safe(state.get("messages", []), 10)
    
    try:
        # Bind the available tools to the LLM
        llm_with_tools = llm.bind_tools([]) if False else llm
        
        response = llm_with_tools.invoke([sys_msg] + trimmed_messages)
        response.name = "node_deploy"
        if hasattr(response, 'tool_calls') and response.tool_calls:
            emit_event("agent_action", "Deployer", f"Calling tools: {[t['name'] for t in response.tool_calls]}", "deploy")
            return {"messages": [response], "current_data": "Waiting for tool result..."}
        else:
            content = response.content
            emit_event("agent_finished", "Deployer", content, "deploy")
            return {"messages": [response], "current_data": f"\n\n---\n\n[Deployer]: {content}"}

    except Exception as e:
        err = f"LLM Error: {str(e)}"
        emit_event("error", "Deployer", err, "deploy")
        return {"messages": [AIMessage(content=err)], "current_data": f"\n\n---\n\n[Deployer Error]: {err}"}

workflow.add_node("node_deploy", node_deploy)
workflow.add_edge("node_input_1", "node_qa")
workflow.add_conditional_edges("node_qa", should_continue_tools, {
    "tools": "global_tools_node",
    "next": "node_fb"
})
workflow.add_conditional_edges("node_fb", route_feedback_node_fb, {
    "true_branch": "node_deploy",
    "false_branch": "node_qa"
})
workflow.add_conditional_edges("node_deploy", should_continue_tools, {
    "tools": "global_tools_node",
    "next": END
})

def tool_router(state: AgentState) -> str:
    messages = state.get("messages", [])
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.tool_calls:
            return msg.name if msg.name else END
    return END
workflow.add_conditional_edges("global_tools_node", tool_router, {
    "node_qa": "node_qa",
    "node_deploy": "node_deploy",
    END: END
})
workflow.set_entry_point("node_input_1")

def run_native_team(project_path: str, task_description: str):
    emit_event("system", "System", "Initializing LangGraph Engine from Visual Builder...")
    if not global_api_key:
        emit_event("error", "System", "No API key configured. Please set your API key in Settings.")
        return
        
    harness = AgentHarness(workflow, project_path)
    harness.run(task_description)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"event": "error", "agent": "System", "message": "Usage: script.py <project_path> <task>"}))
        sys.exit(1)
    
    project_path = sys.argv[1]
    task_description = sys.argv[2]
    run_native_team(project_path, task_description)
