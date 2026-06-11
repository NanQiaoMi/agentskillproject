import os
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
        return "\n".join(items) if items else "Directory is empty."
    except Exception as e:
        return f"Error listing directory: {str(e)}"

@tool("List Skills")
def list_available_skills(query: str = "") -> str:
    """Lists available agent skills. Each skill has specialized instructions.
    Use this to see what specialized capabilities you can use."""
    try:
        skills_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "skills")
        if not os.path.exists(skills_dir):
            return "No skills directory found."
        
        skills = []
        for d in os.listdir(skills_dir):
            if os.path.isdir(os.path.join(skills_dir, d)):
                skills.append(d)
                
        return "Available skills:\n" + "\n".join(f"- {s}" for s in skills)
    except Exception as e:
        return f"Error listing skills: {str(e)}"

@tool("Load Skill")
def load_skill(skill_name: str) -> str:
    """Loads the specific instructions and details for a given skill name.
    Always load a skill before trying to use it."""
    try:
        skills_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "skills")
        skill_path = os.path.join(skills_dir, skill_name, "SKILL.md")
        if not os.path.exists(skill_path):
            return f"Skill {skill_name} not found."
        
        with open(skill_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error loading skill: {str(e)}"

local_tools = [read_file, write_file, execute_command, list_directory, list_available_skills, load_skill]

def run_native_team(project_path: str, task_description: str):
    emit_event("system", "System", "Initializing Native AgentFlow Team from Visual Builder...")

    # Global API config from environment (injected by Tauri backend)
    global_api_key = os.environ.get("OPENAI_API_KEY", "")
    global_base_url = os.environ.get("OPENAI_API_BASE", "https://api.openai.com/v1")
    global_model = os.environ.get("OPENAI_MODEL_NAME", "gpt-4o")

    llm_0 = ChatOpenAI(
        temperature=0.7,
        model_name="deepseek-v4-flash",
        base_url="https://token.sensenova.cn/v1",
        api_key=select_key("sk-YTrTyea99VLT1ur2qAfHYLaoLZldCNOk,sk-sbSUsNQGxFYF58i2iojHKNtd8chEv8Nd,sk-zySxmLsVX9btbturk8f7cVPxhNedIThV,sk-agehZAReQqWPEF5xLb4zM3Eahq4mMcma,sk-j13RFixI1oPaxrmdqcxQXI55Io3NQnNh"),
        callbacks=[JSONRPCCallbackHandler("Editor", "editor")]
    )

    agent_0 = Agent(
        role='编辑 / 审稿人',
        goal='Fulfill your role (编辑 / 审稿人) to the best of your abilities.',
        backstory='You are Editor, an AI assistant collaborating in a team.',
        verbose=True,
        allow_delegation=False,
        llm=llm_0,
        tools=local_tools
    )
    emit_event("system", "System", "Agent initialized: Editor (编辑 / 审稿人)", "editor")

    task_0 = Task(
        description=f"""你是一名资深编辑。审阅内容创作者的文章：
1. 检查语法、拼写、措辞
2. 优化文章结构和逻辑流
3. 确保事实准确性
4. 提升可读性和吸引力
5. 标注修改建议或直接修改\n\nProject Path: {project_path}\nOverall Goal: {task_description}""",
        expected_output=f"""修改后的终稿 (Markdown)，附带修改记录和改进建议清单""",
        agent=agent_0,
        async_execution=False
    )

    llm_1 = ChatOpenAI(
        temperature=0.7,
        model_name="deepseek-v4-flash",
        base_url="https://token.sensenova.cn/v1",
        api_key=select_key("sk-YTrTyea99VLT1ur2qAfHYLaoLZldCNOk,sk-sbSUsNQGxFYF58i2iojHKNtd8chEv8Nd,sk-zySxmLsVX9btbturk8f7cVPxhNedIThV,sk-agehZAReQqWPEF5xLb4zM3Eahq4mMcma,sk-j13RFixI1oPaxrmdqcxQXI55Io3NQnNh"),
        callbacks=[JSONRPCCallbackHandler("SEO Specialist", "seo")]
    )

    agent_1 = Agent(
        role='SEO 优化专家',
        goal='Fulfill your role (SEO 优化专家) to the best of your abilities.',
        backstory='You are SEO Specialist, an AI assistant collaborating in a team.',
        verbose=True,
        allow_delegation=False,
        llm=llm_1,
        tools=local_tools
    )
    emit_event("system", "System", "Agent initialized: SEO Specialist (SEO 优化专家)", "seo")

    task_1 = Task(
        description=f"""你是一名 SEO 优化专家。优化编辑审定后的文章：
1. 提取和优化目标关键词
2. 优化标题和 Meta Description
3. 添加内链/外链建议
4. 优化文章结构以提升搜索排名
5. 生成最终发布版本\n\nProject Path: {project_path}\nOverall Goal: {task_description}""",
        expected_output=f"""SEO 优化后的最终文章，附带关键词列表、Meta 标签建议、内链策略""",
        agent=agent_1,
        async_execution=False,
        context=[task_0]
    )

    llm_2 = ChatOpenAI(
        temperature=0.7,
        model_name="deepseek-v4-flash",
        base_url="https://token.sensenova.cn/v1",
        api_key=select_key("sk-YTrTyea99VLT1ur2qAfHYLaoLZldCNOk,sk-sbSUsNQGxFYF58i2iojHKNtd8chEv8Nd,sk-zySxmLsVX9btbturk8f7cVPxhNedIThV,sk-agehZAReQqWPEF5xLb4zM3Eahq4mMcma,sk-j13RFixI1oPaxrmdqcxQXI55Io3NQnNh"),
        callbacks=[JSONRPCCallbackHandler("Researcher", "researcher")]
    )

    agent_2 = Agent(
        role='调研分析师',
        goal='Fulfill your role (调研分析师) to the best of your abilities.',
        backstory='You are Researcher, an AI assistant collaborating in a team.',
        verbose=True,
        allow_delegation=False,
        llm=llm_2,
        tools=local_tools
    )
    emit_event("system", "System", "Agent initialized: Researcher (调研分析师)", "researcher")

    task_2 = Task(
        description=f"""你是一名专业的市场调研分析师。
1. 针对给定主题进行深入研究
2. 收集关键数据点、行业趋势、竞品分析
3. 提供有说服力的论据和数据支撑
4. 整理参考来源列表\n\nProject Path: {project_path}\nOverall Goal: {task_description}""",
        expected_output=f"""调研报告 (Markdown)，包含主题概述、关键发现、数据表格、参考文献列表""",
        agent=agent_2,
        async_execution=False,
        context=[task_0]
    )

    llm_3 = ChatOpenAI(
        temperature=0.7,
        model_name="deepseek-v4-flash",
        base_url="https://token.sensenova.cn/v1",
        api_key=select_key("sk-YTrTyea99VLT1ur2qAfHYLaoLZldCNOk,sk-sbSUsNQGxFYF58i2iojHKNtd8chEv8Nd,sk-zySxmLsVX9btbturk8f7cVPxhNedIThV,sk-agehZAReQqWPEF5xLb4zM3Eahq4mMcma,sk-j13RFixI1oPaxrmdqcxQXI55Io3NQnNh"),
        callbacks=[JSONRPCCallbackHandler("Content Writer", "writer")]
    )

    agent_3 = Agent(
        role='内容创作者',
        goal='Fulfill your role (内容创作者) to the best of your abilities.',
        backstory='You are Content Writer, an AI assistant collaborating in a team.',
        verbose=True,
        allow_delegation=False,
        llm=llm_3,
        tools=local_tools
    )
    emit_event("system", "System", "Agent initialized: Content Writer (内容创作者)", "writer")

    task_3 = Task(
        description=f"""你是一名优秀的内容创作者。基于调研报告：
1. 撰写一篇高质量的长文（2000-3000 字）
2. 使用引人入胜的标题和副标题
3. 融入数据和案例
4. 保持专业但易读的语调\n\nProject Path: {project_path}\nOverall Goal: {task_description}""",
        expected_output=f"""完整的文章草稿 (Markdown)，包含标题、副标题、正文段落、引用数据""",
        agent=agent_3,
        async_execution=False,
        context=[task_2]
    )

    llm_4 = ChatOpenAI(
        temperature=0.7,
        model_name="deepseek-v4-flash",
        base_url="https://token.sensenova.cn/v1",
        api_key=select_key("sk-YTrTyea99VLT1ur2qAfHYLaoLZldCNOk,sk-sbSUsNQGxFYF58i2iojHKNtd8chEv8Nd,sk-zySxmLsVX9btbturk8f7cVPxhNedIThV,sk-agehZAReQqWPEF5xLb4zM3Eahq4mMcma,sk-j13RFixI1oPaxrmdqcxQXI55Io3NQnNh"),
        callbacks=[JSONRPCCallbackHandler("Editor", "editor")]
    )

    agent_4 = Agent(
        role='编辑 / 审稿人',
        goal='Fulfill your role (编辑 / 审稿人) to the best of your abilities.',
        backstory='You are Editor, an AI assistant collaborating in a team.',
        verbose=True,
        allow_delegation=False,
        llm=llm_4,
        tools=local_tools
    )
    emit_event("system", "System", "Agent initialized: Editor (编辑 / 审稿人)", "editor")

    task_4 = Task(
        description=f"""你是一名资深编辑。审阅内容创作者的文章：
1. 检查语法、拼写、措辞
2. 优化文章结构和逻辑流
3. 确保事实准确性
4. 提升可读性和吸引力
5. 标注修改建议或直接修改\n\nProject Path: {project_path}\nOverall Goal: {task_description}""",
        expected_output=f"""修改后的终稿 (Markdown)，附带修改记录和改进建议清单""",
        agent=agent_4,
        async_execution=False,
        context=[task_3]
    )

    llm_5 = ChatOpenAI(
        temperature=0.7,
        model_name="deepseek-v4-flash",
        base_url="https://token.sensenova.cn/v1",
        api_key=select_key("sk-YTrTyea99VLT1ur2qAfHYLaoLZldCNOk,sk-sbSUsNQGxFYF58i2iojHKNtd8chEv8Nd,sk-zySxmLsVX9btbturk8f7cVPxhNedIThV,sk-agehZAReQqWPEF5xLb4zM3Eahq4mMcma,sk-j13RFixI1oPaxrmdqcxQXI55Io3NQnNh"),
        callbacks=[JSONRPCCallbackHandler("SEO Specialist", "seo")]
    )

    agent_5 = Agent(
        role='SEO 优化专家',
        goal='Fulfill your role (SEO 优化专家) to the best of your abilities.',
        backstory='You are SEO Specialist, an AI assistant collaborating in a team.',
        verbose=True,
        allow_delegation=False,
        llm=llm_5,
        tools=local_tools
    )
    emit_event("system", "System", "Agent initialized: SEO Specialist (SEO 优化专家)", "seo")

    task_5 = Task(
        description=f"""你是一名 SEO 优化专家。优化编辑审定后的文章：
1. 提取和优化目标关键词
2. 优化标题和 Meta Description
3. 添加内链/外链建议
4. 优化文章结构以提升搜索排名
5. 生成最终发布版本\n\nProject Path: {project_path}\nOverall Goal: {task_description}""",
        expected_output=f"""SEO 优化后的最终文章，附带关键词列表、Meta 标签建议、内链策略""",
        agent=agent_5,
        async_execution=False,
        context=[task_0]
    )

    llm_6 = ChatOpenAI(
        temperature=0.7,
        model_name="deepseek-v4-flash",
        base_url="https://token.sensenova.cn/v1",
        api_key=select_key("sk-YTrTyea99VLT1ur2qAfHYLaoLZldCNOk,sk-sbSUsNQGxFYF58i2iojHKNtd8chEv8Nd,sk-zySxmLsVX9btbturk8f7cVPxhNedIThV,sk-agehZAReQqWPEF5xLb4zM3Eahq4mMcma,sk-j13RFixI1oPaxrmdqcxQXI55Io3NQnNh"),
        callbacks=[JSONRPCCallbackHandler("Researcher", "researcher")]
    )

    agent_6 = Agent(
        role='调研分析师',
        goal='Fulfill your role (调研分析师) to the best of your abilities.',
        backstory='You are Researcher, an AI assistant collaborating in a team.',
        verbose=True,
        allow_delegation=False,
        llm=llm_6,
        tools=local_tools
    )
    emit_event("system", "System", "Agent initialized: Researcher (调研分析师)", "researcher")

    task_6 = Task(
        description=f"""你是一名专业的市场调研分析师。
1. 针对给定主题进行深入研究
2. 收集关键数据点、行业趋势、竞品分析
3. 提供有说服力的论据和数据支撑
4. 整理参考来源列表\n\nProject Path: {project_path}\nOverall Goal: {task_description}""",
        expected_output=f"""调研报告 (Markdown)，包含主题概述、关键发现、数据表格、参考文献列表""",
        agent=agent_6,
        async_execution=False,
        context=[task_0]
    )

    llm_7 = ChatOpenAI(
        temperature=0.7,
        model_name="deepseek-v4-flash",
        base_url="https://token.sensenova.cn/v1",
        api_key=select_key("sk-YTrTyea99VLT1ur2qAfHYLaoLZldCNOk,sk-sbSUsNQGxFYF58i2iojHKNtd8chEv8Nd,sk-zySxmLsVX9btbturk8f7cVPxhNedIThV,sk-agehZAReQqWPEF5xLb4zM3Eahq4mMcma,sk-j13RFixI1oPaxrmdqcxQXI55Io3NQnNh"),
        callbacks=[JSONRPCCallbackHandler("Content Writer", "writer")]
    )

    agent_7 = Agent(
        role='内容创作者',
        goal='Fulfill your role (内容创作者) to the best of your abilities.',
        backstory='You are Content Writer, an AI assistant collaborating in a team.',
        verbose=True,
        allow_delegation=False,
        llm=llm_7,
        tools=local_tools
    )
    emit_event("system", "System", "Agent initialized: Content Writer (内容创作者)", "writer")

    task_7 = Task(
        description=f"""你是一名优秀的内容创作者。基于调研报告：
1. 撰写一篇高质量的长文（2000-3000 字）
2. 使用引人入胜的标题和副标题
3. 融入数据和案例
4. 保持专业但易读的语调\n\nProject Path: {project_path}\nOverall Goal: {task_description}""",
        expected_output=f"""完整的文章草稿 (Markdown)，包含标题、副标题、正文段落、引用数据""",
        agent=agent_7,
        async_execution=False,
        context=[task_2]
    )

    emit_event("system", "System", "All agents and LLM configurations successfully loaded from sub-agent interface.")
  
    # --- Form the Crew (Sequential) ---
    crew = Crew(
        agents=[agent_0, agent_1, agent_2, agent_3, agent_4, agent_5, agent_6, agent_7],
        tasks=[task_0, task_1, task_2, task_3, task_4, task_5, task_6, task_7],
        process=Process.sequential
    )
    emit_event("system", "System", f"Team started in Sequential Mode ({len(crew.agents)} agents, {len(crew.tasks)} tasks).")

    try:
        result = crew.kickoff()
        emit_event("success", "System", f"Team execution finished successfully.\n\n{result}")
    except Exception as e:
        emit_event("error", "System", f"Team execution failed: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"event": "error", "agent": "System", "message": "Usage: agentflow_native.py <project_path> <task>"}))
        sys.exit(1)
    
    project_path = sys.argv[1]
    task_description = sys.argv[2]
    run_native_team(project_path, task_description)
