import os
import sys
import json
import logging
from typing import Any, Dict, List
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from langchain.callbacks.base import BaseCallbackHandler
from langchain.tools import tool

# ---------------------------------------------------------
# Stdout Hijacker: Mute all non-JSON output from CrewAI
# ---------------------------------------------------------
class JSONStdoutFilter:
    def __init__(self, original_stdout):
        self.original_stdout = original_stdout

    def write(self, message):
        if not message.strip():
            return
        try:
            # Only let our own emitted JSON events pass through
            parsed = json.loads(message)
            if "event" in parsed and "agent" in parsed:
                self.original_stdout.write(message + '\n')
                self.original_stdout.flush()
        except Exception:
            # Mute everything else (CrewAI raw prints, LangChain warnings)
            pass

    def flush(self):
        self.original_stdout.flush()

# Apply the filter globally
sys.stdout = JSONStdoutFilter(sys.stdout)

def emit_event(event_type: str, agent: str, message: str = "", node_id: str = "", **kwargs):
    payload = {
        "event": event_type,
        "agent": agent,
        "message": message,
        "is_team": True,
        "node_id": node_id
    }
    payload.update(kwargs)
    # We must bypass the filter to emit our own events
    sys.stdout.original_stdout.write(json.dumps(payload) + '\n')
    sys.stdout.original_stdout.flush()

class JSONRPCCallbackHandler(BaseCallbackHandler):
    def __init__(self, agent_name: str, node_id: str = ""):
        self.agent_name = agent_name
        self.node_id = node_id

    def on_llm_start(self, *args, **kwargs):
        emit_event("agent_started", self.agent_name, "Started thinking...", self.node_id)

    def on_tool_start(self, serialized, input_str, *args, **kwargs):
        tool_name = serialized.get("name", "Unknown Tool")
        emit_event("agent_action", self.agent_name, f"Using tool: {tool_name} with input: {input_str}", self.node_id)

    def on_llm_end(self, response, *args, **kwargs):
        try:
            text = response.generations[0][0].text
            emit_event("agent_finished", self.agent_name, text, self.node_id)
        except Exception as e:
            emit_event("agent_finished", self.agent_name, "Finished thinking.", self.node_id)

def run_native_team(project_path: str, task_description: str):
    emit_event("system", "System", "Initializing Native AgentFlow Team...")
    
    # Check for OPENAI_API_KEY
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        emit_event("error", "System", "OPENAI_API_KEY environment variable is not set. Please set it in Settings.")
        return

    # ---------------------------------------------------------
    # Tools definition for Subagents
    # ---------------------------------------------------------
    @tool("read_file")
    def read_file(path: str) -> str:
        """Reads the content of a file."""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            return f"Error reading file: {str(e)}"

    @tool("write_file")
    def write_file(path: str, content: str) -> str:
        """Writes content to a file."""
        try:
            # Create directories if they don't exist
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return f"Successfully wrote to {path}"
        except Exception as e:
            return f"Error writing file: {str(e)}"

    @tool("list_dir")
    def list_dir(path: str) -> str:
        """Lists files and directories in the given path."""
        try:
            items = os.listdir(path)
            return f"Contents of {path}:\n" + "\n".join(items)
        except Exception as e:
            return f"Error listing directory: {str(e)}"

    # Create isolated LLM instances for each agent to perfectly intercept their thoughts
    model_name = os.environ.get("OPENAI_MODEL_NAME", "gpt-4o")
    
    llm_hermes = ChatOpenAI(temperature=0.7, model_name=model_name, callbacks=[JSONRPCCallbackHandler("Hermes", "node_hermes")])
    llm_antigravity = ChatOpenAI(temperature=0.7, model_name=model_name, callbacks=[JSONRPCCallbackHandler("Antigravity", "node_antigravity")])
    llm_codex = ChatOpenAI(temperature=0.7, model_name=model_name, callbacks=[JSONRPCCallbackHandler("Codex", "node_codex")])

    # Define Agents
    hermes = Agent(
        role='Manager and Technical Lead',
        goal='Analyze the user request, break it down, and coordinate the team to fulfill it.',
        backstory='You are Hermes, an expert Software Architect and Project Manager. You understand codebases deeply and can delegate tasks perfectly.',
        verbose=False,
        allow_delegation=True,
        llm=llm_hermes
    )

    antigravity = Agent(
        role='Frontend Engineer',
        goal='Implement UI/UX changes, write React components, and style them. You must use tools to actually write files.',
        backstory='You are Antigravity, an expert Frontend developer who writes clean, accessible, and beautiful UI code.',
        verbose=False,
        allow_delegation=False,
        tools=[read_file, write_file, list_dir],
        llm=llm_antigravity
    )

    codex = Agent(
        role='Backend Engineer',
        goal='Implement API routes, database migrations, and core business logic. You must use tools to actually write files.',
        backstory='You are Codex, an expert Backend engineer who writes secure, performant, and robust server-side code.',
        verbose=False,
        allow_delegation=False,
        tools=[read_file, write_file, list_dir],
        llm=llm_codex
    )

    # Define the core Task
    main_task = Task(
        description=f"Project Path: {project_path}\nTask: {task_description}",
        expected_output="A complete implementation of the requested feature with all files modified as necessary.",
        agent=hermes
    )

    # Form the Crew
    # When using hierarchical process, the manager handles delegation.
    # We assign Hermes as the manager_agent, and remove him from the agents list to prevent conflicts.
    crew = Crew(
        agents=[antigravity, codex],
        tasks=[main_task],
        process=Process.hierarchical,
        manager_agent=hermes,
        verbose=False
    )

    emit_event("system", "System", "Team execution started.")
    try:
        result = crew.kickoff()
        emit_event("success", "System", f"Team execution finished. Result: {result}")
    except Exception as e:
        emit_event("error", "System", f"Team execution failed: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"event": "error", "agent": "System", "message": "Usage: agentflow_native.py <project_path> <task>"}))
        sys.exit(1)
    
    project_path = sys.argv[1]
    task_description = sys.argv[2]
    run_native_team(project_path, task_description)
