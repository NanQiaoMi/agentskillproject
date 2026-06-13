import os
import sys
import json
import builtins
import subprocess
from typing import TypedDict, Annotated, Sequence
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

def emit_event(event_type: str, agent_name: str, message: str, node_id: str = ""):
    payload = { "event": event_type, "agent": agent_name, "message": message, "node_id": node_id, "is_team": True }
    print(json.dumps(payload, ensure_ascii=False), flush=True)

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    current_data: str

# Define Tools
@tool
def execute_command_tool(command: str) -> str:
    """Execute a terminal command and return the output."""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=120)
        output = result.stdout if result.stdout else result.stderr
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
        return f"File {path} written successfully."
    except Exception as e:
        return f"Write failed: {e}"

@tool
def web_search_tool(query: str) -> str:
    """Search the web (placeholder)."""
    return f"Mock search results for: {query}"

# Global env
global_api_key = os.environ.get("OPENAI_API_KEY", "")
global_base_url = os.environ.get("OPENAI_API_BASE", "https://api.openai.com/v1")
global_model = os.environ.get("OPENAI_MODEL_NAME", "gpt-4o")

def select_key(keys_str: str) -> str:
    if not keys_str: return global_api_key
    keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    return keys[0] if keys else global_api_key

workflow = StateGraph(AgentState)

# Universal Tools Node
tools_list = [execute_command_tool, read_file_tool, write_file_tool, web_search_tool]
tools_node = ToolNode(tools_list)
workflow.add_node("global_tools_node", tools_node)

def should_continue_tools(state: AgentState) -> str:
    messages = state.get("messages", [])
    if not messages: return "next"
    last_message = messages[-1]
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"
    return "next"

# Default single-agent fallback
def default_agent(state: AgentState):
    emit_event("agent_started", "DefaultAgent", "Thinking...", "")
    
    llm = ChatOpenAI(
        temperature=0.7,
        model_name=global_model,
        base_url=global_base_url,
        api_key=global_api_key
    )
    
    llm_with_tools = llm.bind_tools(tools_list)
    sys_msg = SystemMessage(content=f"You are a helpful AI assistant. Complete the user's request using the available tools.\n\nPrevious context: {state.get('current_data', '')}")
    
    try:
        response = llm_with_tools.invoke([sys_msg] + list(state["messages"]))
        response.name = "default_agent"
        if hasattr(response, 'tool_calls') and response.tool_calls:
            emit_event("agent_action", "DefaultAgent", f"Calling tools: {[t['name'] for t in response.tool_calls]}", "")
            return {"messages": [response], "current_data": "Waiting for tool result..."}
        else:
            content = response.content
            emit_event("agent_finished", "DefaultAgent", content, "")
            return {"messages": [response], "current_data": content}
    except Exception as e:
        err = f"LLM Error: {str(e)}"
        emit_event("error", "DefaultAgent", err, "")
        return {"messages": [AIMessage(content=err)], "current_data": err}

workflow.add_node("default_agent", default_agent)

def tool_router(state: AgentState) -> str:
    messages = state.get("messages", [])
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and hasattr(msg, 'tool_calls') and msg.tool_calls:
            return msg.name if msg.name else "default_agent"
    return "default_agent"

workflow.add_conditional_edges("default_agent", should_continue_tools, {
    "tools": "global_tools_node",
    "next": END
})
workflow.add_conditional_edges("global_tools_node", tool_router, {
    "default_agent": "default_agent",
    END: END
})
workflow.set_entry_point("default_agent")

def run_native_team(project_path: str, task_description: str):
    emit_event("system", "System", "Initializing LangGraph Engine (Default Fallback)...")
    if not global_api_key:
        emit_event("error", "System", "No API key configured. Please set your API key in Settings.")
        return
        
    app = workflow.compile()
    
    try:
        emit_event("system", "System", f"Starting Workflow Execution. Project: {project_path}")
        result = app.invoke({"messages": [], "current_data": task_description})
        emit_event("success", "System", "Workflow execution finished successfully.")
    except Exception as e:
        emit_event("error", "System", f"Workflow execution failed: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"event": "error", "agent": "System", "message": "Usage: script.py <project_path> <task>"}))
        sys.exit(1)
    
    project_path = sys.argv[1]
    task_description = sys.argv[2]
    run_native_team(project_path, task_description)
