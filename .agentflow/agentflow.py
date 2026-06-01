# -*- coding: utf-8 -*-
import os
import sys
import json
import glob
import subprocess
import argparse
import re
import sqlite3
from datetime import datetime

# 获取工作区目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TASKS_DIR = os.path.join(BASE_DIR, 'tasks')
LOGS_DIR = os.path.join(BASE_DIR, 'logs')
CONFIG_FILE = os.path.join(BASE_DIR, 'config.json')
DB_FILE = os.path.join(BASE_DIR, 'tasks.db')

# 确保文件夹存在
os.makedirs(TASKS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

# 状态中文映射
STATUS_MAP = {
    "todo": "待处理 (Todo)",
    "in_progress": "进行中 (In Progress)",
    "review": "审查中 (Review)",
    "fixing": "修复中 (Fixing)",
    "done": "已完成 (Done)"
}

# ==========================================
# Git 辅助函数 (本地 Git 分支自动化支持)
# ==========================================
def run_git_cmd(args_list, cwd=None):
    try:
        # 检测 git 是否可用并在此工作区运行
        repo_dir = cwd or os.path.dirname(BASE_DIR)
        result = subprocess.run(["git"] + args_list, capture_output=True, text=True, errors='replace', cwd=repo_dir)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def is_git_repo():
    ok, _, _ = run_git_cmd(["rev-parse", "--is-inside-work-tree"])
    return ok

def get_current_branch():
    ok, stdout, _ = run_git_cmd(["rev-parse", "--abbrev-ref", "HEAD"])
    return stdout.strip() if ok else "main"

# ==========================================
# SQLite 缓存数据库辅助函数
# ==========================================
def get_db_conn():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    # Create table if not exists
    conn.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        assignee TEXT,
        status TEXT,
        creator TEXT,
        dependencies TEXT,
        affected_files TEXT,
        comments TEXT,
        history TEXT
    )
    """)
    conn.commit()
    return conn

def update_task_in_db(task):
    try:
        conn = get_db_conn()
        conn.execute("""
        INSERT OR REPLACE INTO tasks (id, title, description, assignee, status, creator, dependencies, affected_files, comments, history)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            task["id"],
            task["title"],
            task["description"],
            task["assignee"],
            task["status"],
            task.get("creator", "user"),
            json.dumps(task.get("dependencies", []), ensure_ascii=False),
            json.dumps(task.get("affected_files", []), ensure_ascii=False),
            json.dumps(task.get("comments", []), ensure_ascii=False),
            json.dumps(task.get("history", []), ensure_ascii=False)
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[-] 更新 SQLite 缓存失败: {e}")

def sync_db():
    print("[*] 正在重建本地 SQLite 任务缓存 database...")
    try:
        conn = get_db_conn()
        conn.execute("DELETE FROM tasks")
        conn.commit()
        
        # Re-read all md files
        task_files = glob.glob(os.path.join(TASKS_DIR, "**/TASK-*.md"), recursive=True)
        count = 0
        for f in task_files:
            basename = os.path.basename(f)
            task_id = os.path.splitext(basename)[0]
            task = load_task(task_id)
            if task:
                conn.execute("""
                INSERT OR REPLACE INTO tasks (id, title, description, assignee, status, creator, dependencies, affected_files, comments, history)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    task["id"],
                    task["title"],
                    task["description"],
                    task["assignee"],
                    task["status"],
                    task.get("creator", "user"),
                    json.dumps(task.get("dependencies", []), ensure_ascii=False),
                    json.dumps(task.get("affected_files", []), ensure_ascii=False),
                    json.dumps(task.get("comments", []), ensure_ascii=False),
                    json.dumps(task.get("history", []), ensure_ascii=False)
                ))
                count += 1
        conn.commit()
        conn.close()
        print(f"[+] SQLite 缓存重构成功，共同步 {count} 个任务。")
        return True
    except Exception as e:
        print(f"[-] SQLite 缓存重构失败: {e}")
        return False

# ==========================================
# 核心业务逻辑
# ==========================================
def load_config():
    if not os.path.exists(CONFIG_FILE):
        return {}
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[-] 加载配置文件失败: {e}")
        return {}

def get_task_path(task_id):
    # 优先检测根目录下的默认路径
    root_path = os.path.join(TASKS_DIR, f"{task_id.upper()}.md")
    if os.path.exists(root_path):
        return root_path
        
    # 如果根目录没有，递归扫描子目录（支持任务分组管理）
    found_files = glob.glob(os.path.join(TASKS_DIR, f"**/{task_id.upper()}.md"), recursive=True)
    if found_files:
        return found_files[0]
        
    # 都未找到，返回默认根目录路径（用于新创建任务）
    return root_path

def load_task(task_id):
    path = get_task_path(task_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 提取 <!-- agentflow 与 --> 之间的 JSON
        start_idx = content.find("<!-- agentflow")
        if start_idx == -1:
            print(f"[-] 错误: 任务文件 {task_id} 格式不正确，未找到 metadata 块。")
            return None
        end_idx = content.find("-->", start_idx)
        if end_idx == -1:
            print(f"[-] 错误: 任务文件 {task_id} 格式不正确，metadata 块未闭合。")
            return None
            
        json_str = content[start_idx + len("<!-- agentflow"):end_idx].strip()
        task = json.loads(json_str)
        
        # 尝试从 markdown 内容中解析最新的“描述”，以保留用户的直接编辑
        desc_start = content.find("## 任务描述")
        if desc_start != -1:
            headers = ["## 涉及文件", "## 审查意见", "## 状态变更历史", "<!--"]
            next_idx = len(content)
            for h in headers:
                idx = content.find(h, desc_start + len("## 任务描述"))
                if idx != -1 and idx < next_idx:
                    next_idx = idx
            desc_text = content[desc_start + len("## 任务描述"):next_idx].strip()
            task["description"] = desc_text
            
        return task
    except Exception as e:
        print(f"[-] 加载任务 {task_id} 失败: {e}")
        return None

def save_task(task):
    path = get_task_path(task['id'])
    try:
        # 构建要写回的结构化元数据
        metadata = {
            "id": task["id"],
            "title": task["title"],
            "assignee": task["assignee"],
            "status": task["status"],
            "creator": task.get("creator", "user"),
            "dependencies": task.get("dependencies", []),
            "affected_files": task.get("affected_files", []),
            "comments": task.get("comments", []),
            "history": task.get("history", [])
        }
        
        metadata_str = json.dumps(metadata, indent=2, ensure_ascii=False)
        
        # 渲染为 Markdown 文本
        md_content = f"""<!-- agentflow
{metadata_str}
-->

# {task['id']}: {task['title']}

## 任务描述
{task['description']}

## 涉及文件
"""
        if task.get('affected_files'):
            for f in task['affected_files']:
                md_content += f"- `{f}`\n"
        else:
            md_content += "无\n"
            
        md_content += "\n## 审查意见与修复记录\n"
        if task.get('comments'):
            for c in task['comments']:
                comment_clean = c['comment'].replace('\n', '\n    ')
                md_content += f"- **{c['author']}** ({c['time'][:16]}):\n    {comment_clean}\n"
        else:
            md_content += "无\n"
            
        md_content += "\n## 状态变更历史\n"
        for h in task['history']:
            md_content += f"- `{h['time'][:16]}` | **{h['operator']}** | 将状态从 `[{h['from']}]` 变更为 `[{h['to']}]` | 备注: {h.get('message', '无')}\n"
            
        with open(path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        update_task_in_db(task)
    except Exception as e:
        print(f"[-] 保存任务 {task['id']} 失败: {e}")

def get_all_tasks():
    # 尝试从 SQLite 中读取
    tasks = []
    try:
        if not os.path.exists(DB_FILE):
            # DB 不存在，自动执行一次同步
            sync_db()
            
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tasks")
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            # 数据库虽然存在但是空的，可能需要同步
            # 看看有没有 md 文件，如果有，再次同步
            task_files = glob.glob(os.path.join(TASKS_DIR, "**/TASK-*.md"), recursive=True)
            if task_files:
                sync_db()
                conn = get_db_conn()
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM tasks")
                rows = cursor.fetchall()
                conn.close()
        
        for row in rows:
            tasks.append({
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "assignee": row["assignee"],
                "status": row["status"],
                "creator": row["creator"],
                "dependencies": json.loads(row["dependencies"]),
                "affected_files": json.loads(row["affected_files"]),
                "comments": json.loads(row["comments"]),
                "history": json.loads(row["history"])
            })
    except Exception as e:
        # 如果 SQLite 出了任何差错，退化为 glob 扫描
        print(f"[*] 提示: SQLite 查询异常，自动退化为磁盘递归扫描。异常: {e}")
        task_files = glob.glob(os.path.join(TASKS_DIR, "**/TASK-*.md"), recursive=True)
        tasks = []
        for f in task_files:
            basename = os.path.basename(f)
            task_id = os.path.splitext(basename)[0]
            task = load_task(task_id)
            if task:
                tasks.append(task)
                
    # 按照ID数字排序
    def get_id_num(t):
        try:
            return int(t['id'].split('-')[1])
        except:
            return 0
    tasks.sort(key=get_id_num)
    return tasks

def get_next_id():
    tasks = get_all_tasks()
    if not tasks:
        return "TASK-001"
    ids = []
    for t in tasks:
        try:
            num = int(t['id'].split('-')[1])
            ids.append(num)
        except:
            pass
    if not ids:
        return "TASK-001"
    return f"TASK-{max(ids) + 1:03d}"

def cmd_add(args):
    task_id = get_next_id()
    deps = [d.strip().upper() for d in args.deps.split(',') if d.strip()] if args.deps else []
    
    new_task = {
        "id": task_id,
        "title": args.title,
        "description": args.desc,
        "assignee": args.assignee,
        "status": "todo",
        "creator": "user",
        "dependencies": deps,
        "affected_files": [],
        "comments": [],
        "history": [
            {
                "time": datetime.now().isoformat(),
                "from": "none",
                "to": "todo",
                "operator": "user",
                "message": "创建任务"
            }
        ]
    }
    
    save_task(new_task)
    print(f"[+] 任务创建成功! 文件已保存至: .agentflow/tasks/{task_id}.md")
    print(f"    ID: {task_id}")
    print(f"    标题: {args.title}")
    print(f"    负责人: {args.assignee}")
    if deps:
        print(f"    前置依赖: {', '.join(deps)}")

def cmd_list(args):
    tasks = get_all_tasks()
    if not tasks:
        print("[*] 当前无任何任务。")
        return
        
    print("\n" + "="*85)
    print(f"{'任务 ID':<10} | {'负责人':<12} | {'状态':<12} | {'依赖':<12} | {'任务标题'}")
    print("-"*85)
    
    filtered_tasks = tasks
    if args.status:
        filtered_tasks = [t for t in filtered_tasks if t['status'] == args.status]
    if args.assignee:
        filtered_tasks = [t for t in filtered_tasks if t['assignee'].lower() == args.assignee.lower()]
        
    for t in filtered_tasks:
        status_cn = STATUS_MAP.get(t['status'], t['status'])
        deps_str = ",".join(t.get('dependencies', [])) if t.get('dependencies') else "无"
        if len(deps_str) > 12:
            deps_str = deps_str[:9] + "..."
        print(f"{t['id']:<10} | {t['assignee']:<12} | {status_cn:<12} | {deps_str:<12} | {t['title']}")
    print("="*85 + "\n")

def cmd_show(args):
    task = load_task(args.id)
    if not task:
        print(f"[-] 未找到 ID 为 {args.id} 的任务。")
        return
        
    print("\n" + "="*80)
    print(f" 任务详情: {task['id']} [{STATUS_MAP.get(task['status'], task['status'])}]")
    print("="*80)
    print(f" 标题: {task['title']}")
    print(f" 负责人: {task['assignee']} (创建者: {task.get('creator', 'user')})")
    print(f" 前置依赖: {', '.join(task.get('dependencies', [])) if task.get('dependencies') else '无'}")
    print(f" 描述: {task['description']}")
    
    if task.get('affected_files'):
        print("\n 涉及文件:")
        for f in task['affected_files']:
            print(f"   - {f}")
            
    if task.get('comments'):
        print("\n 审查意见 / 报告 / 修复记录:")
        for idx, c in enumerate(task['comments'], 1):
            print(f"   [{idx}] {c['time']} | {c['author']}: {c['comment']}")
            
    print("\n 状态变更历史:")
    for h in task['history']:
        print(f"   - {h['time'][:16]} | {h['operator']} | 将状态从 [{STATUS_MAP.get(h['from'], h['from'])}] 变更为 [{STATUS_MAP.get(h['to'], h['to'])}] | 备注: {h.get('message', '无')}")
    print("="*80 + "\n")

def cmd_start(args):
    task = load_task(args.id)
    if not task:
        print(f"[-] 未找到 ID 为 {args.id} 的任务。")
        return
        
    deps = task.get('dependencies', [])
    for dep_id in deps:
        dep_task = load_task(dep_id)
        if not dep_task:
            print(f"[-] 错误: 前置依赖任务 {dep_id} 不存在！无法启动当前任务。")
            return
        if dep_task['status'] != 'done':
            print(f"[-] 错误: 前置依赖任务 {dep_id} 状态为 [{STATUS_MAP.get(dep_task['status'], dep_task['status'])}]，必须为 [已完成] 才能启动当前任务。")
            return
            
    # Git 分支自动化支持
    if is_git_repo():
        branch_name = f"feature/{task['id'].lower()}"
        print(f"[*] 检测到本地 Git 仓库，正在切入特征分支: {branch_name}...")
        ok, _, err = run_git_cmd(["checkout", "-b", branch_name])
        if not ok:
            # 如果分支已存在，尝试直接切入
            ok, _, err = run_git_cmd(["checkout", branch_name])
            if ok:
                print(f"[+] 已切换至已有分支: {branch_name}")
            else:
                print(f"[-] 警告: 无法切入分支 {branch_name} ({err.strip()})，将继续在当前分支开发。")
        else:
            print(f"[+] 已成功创建并切换至特征分支: {branch_name}")
            
    old_status = task['status']
    task['status'] = 'in_progress'
    task['history'].append({
        "time": datetime.now().isoformat(),
        "from": old_status,
        "to": "in_progress",
        "operator": args.operator or task['assignee'],
        "message": "开始执行任务"
    })
    
    save_task(task)
    print(f"[+] 任务 {task['id']} 已成功启动，状态变更为: 进行中 (In Progress)")

def cmd_submit(args):
    task = load_task(args.id)
    if not task:
        print(f"[-] 未找到 ID 为 {args.id} 的任务。")
        return
        
    files = [f.strip() for f in args.files.split(',') if f.strip()] if args.files else []
    
    # Git 自动提交支持
    if is_git_repo():
        branch_name = f"feature/{task['id'].lower()}"
        current = get_current_branch()
        if current == branch_name:
            print(f"[*] 正在自动将特征分支 {branch_name} 代码提审并进行本地 Commit...")
            run_git_cmd(["add", "."])
            # 仅在有改动时才提交，防止无意义报错
            ok, _, _ = run_git_cmd(["commit", "-m", f"feat: implement {task['id']} code"])
            if ok:
                print("[+] 本地特征分支代码 commit 成功。")
            else:
                print("[*] 提示: 无代码变动或已完成 commit。")
                
    old_status = task['status']
    task['status'] = 'review'
    task['assignee'] = 'claudecode'
    task['affected_files'] = list(set(task.get('affected_files', []) + files))
    task['history'].append({
        "time": datetime.now().isoformat(),
        "from": old_status,
        "to": "review",
        "operator": args.operator or "developer",
        "message": f"提交审查。影响文件: {', '.join(files)}"
    })
    
    save_task(task)
    print(f"[+] 任务 {task['id']} 已提交审查！已重新指派负责人为: claudecode")

def run_automated_tests(task):
    dev_agent = "backend"
    for h in reversed(task['history']):
        if h['operator'] in ['antigravity', 'frontend']:
            dev_agent = "frontend"
            break
        elif h['operator'] in ['codex', 'backend']:
            dev_agent = "backend"
            break
            
    config = load_config()
    agent_config = config.get(dev_agent, {})
    
    # 门禁三阶段定义
    stages = [
        ("lint_command", "代码风格检查 (Linting)"),
        ("type_check_command", "静态类型检查 (Type Check)"),
        ("test_command", "自动化单元测试 (Unit Tests)")
    ]
    
    log_file_name = f"test_{task['id']}.log"
    log_path = os.path.join(LOGS_DIR, log_file_name)
    cwd_dir = os.path.dirname(BASE_DIR)
    
    all_passed = True
    messages = []
    
    with open(log_path, 'w', encoding='utf-8') as lf:
        lf.write(f"=== AgentFlow 本地质量检测门禁 (TASK: {task['id']}) ===\n")
        lf.write(f"运行时间: {datetime.now().isoformat()}\n")
        lf.write(f"检测角色: {dev_agent}\n")
        lf.write("=====================================================\n\n")
        
    for config_key, stage_name in stages:
        cmd = agent_config.get(config_key)
        if not cmd:
            continue
            
        print(f"[*] 正在执行 [{stage_name}]: '{cmd}' ...")
        with open(log_path, 'a', encoding='utf-8') as lf:
            lf.write(f"\n--- 阶段: {stage_name} ---\n")
            lf.write(f"执行命令: {cmd}\n")
            
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, errors='replace', cwd=cwd_dir)
            with open(log_path, 'a', encoding='utf-8') as lf:
                lf.write(f"退出码 (Exit Code): {result.returncode}\n")
                lf.write("--- 标准输出 (STDOUT) ---\n")
                lf.write(result.stdout or "")
                lf.write("\n--- 标准错误 (STDERR) ---\n")
                lf.write(result.stderr or "")
                lf.write("\n" + "="*50 + "\n")
                
            if result.returncode == 0:
                print(f"[+] [{stage_name}] 成功。")
                messages.append(f"{stage_name}: 通过")
            else:
                print(f"[-] [{stage_name}] 失败，退出码: {result.returncode}。")
                messages.append(f"{stage_name}: 失败 (退出码 {result.returncode})")
                all_passed = False
                
        except Exception as e:
            error_msg = f"执行命令时发生异常: {e}"
            print(f"[-] [{stage_name}] 异常: {error_msg}")
            with open(log_path, 'a', encoding='utf-8') as lf:
                lf.write(f"异常信息: {error_msg}\n")
            messages.append(f"{stage_name}: 异常发生")
            all_passed = False
            
    if not any(agent_config.get(k) for k, _ in stages):
        print(f"[*] 提示: 未在 config.json 中为 {dev_agent} 配置任何质量命令，跳过检测门禁。")
        return True, "未配置任何测试命令"
        
    print(f"[+] 质量门禁完成。检测详情日志已保存至: .agentflow/logs/{log_file_name}")
    summary_msg = " | ".join(messages)
    return all_passed, summary_msg

def cmd_review(args):
    task = load_task(args.id)
    if not task:
        print(f"[-] 未找到 ID 为 {args.id} 的任务。")
        return
        
    if not args.approve and not args.reject and not args.env_fail and not args.run_tests:
        print("[-] 请指定审查结论: --approve (通过), --reject (被打回), --env-fail (测试环境故障) 或 --run-tests (运行测试)")
        return
        
    old_status = task['status']
    
    if args.run_tests:
        tests_ok, test_msg = run_automated_tests(task)
        if not tests_ok and not args.approve and not args.reject and not args.env_fail:
            print(f"[*] 提示: 仅测试运行完毕。若要提交审查结论，请附带 --approve 或 --reject 参数。")
        elif not tests_ok and not args.approve:
            print(f"[*] 由于自动测试未通过，建议拒绝审查或标记为环境故障。")
            
    if not args.approve and not args.reject and not args.env_fail:
        # 仅运行测试，不更新任务状态
        return
            
    if args.env_fail:
        new_status = "review"
        task['assignee'] = "user"
        msg = f"[环境故障] 自动化测试由于本地运行环境配置异常而中断。打回给用户排查。原因: {args.comment}"
        print(f"[!] 任务 {task['id']} 标记为测试环境异常，已指派给: user")
    elif args.approve:
        new_status = "done"
        task['assignee'] = "user"
        msg = "代码审查通过。"
        print(f"[+] 任务 {task['id']} 审查已通过！状态变更为: 已完成 (Done)")
    else: # reject
        new_status = "fixing"
        prev_dev = "user"
        for h in reversed(task['history']):
            if h['operator'] not in ['claudecode', 'user']:
                prev_dev = h['operator']
                break
        task['assignee'] = prev_dev
        msg = f"代码审查未通过，打回给 {prev_dev} 修复。原因: {args.comment}"
        print(f"[-] 任务 {task['id']} 审查未通过！已打回给: {task['assignee']} 修复")

    task['status'] = new_status
    
    comment_author = args.operator or "claudecode"
    if args.comment:
        task['comments'].append({
            "time": datetime.now().isoformat(),
            "author": comment_author,
            "comment": args.comment
        })
        
    task['history'].append({
        "time": datetime.now().isoformat(),
        "from": old_status,
        "to": new_status,
        "operator": comment_author,
        "message": msg
    })
    
    # 1. 必须首先保存任务状态到磁盘文件！
    save_task(task)
    
    # 2. 如果是本地 Git 仓库，在执行任何 checkout 动作前，先将任务文件修改 commit 到特征分支
    if is_git_repo():
        feature_branch = f"feature/{task['id'].lower()}"
        current = get_current_branch()
        if current == feature_branch:
            print(f"[*] 正在自动提交特征分支 {feature_branch} 的最后审查状态修改...")
            run_git_cmd(["add", "."])
            run_git_cmd(["commit", "-m", f"chore: review {task['id']} state to {new_status}"])

        # 若审查通过，在特征分支完全干净的前提下，安全切回基线分支并合并
        if args.approve:
            baseline = "main"
            for b in ["main", "master", "dev", "development"]:
                ok, _, _ = run_git_cmd(["show-ref", f"refs/heads/{b}"])
                if ok:
                    baseline = b
                    break
                    
            print(f"[*] 正在自动合并本地分支 {feature_branch} 到 {baseline}...")
            ok_switch, _, err = run_git_cmd(["checkout", baseline])
            if ok_switch:
                ok_merge, out_merge, err_merge = run_git_cmd(["merge", feature_branch, "--no-ff", "-m", f"Merge branch '{feature_branch}' into {baseline}"])
                if ok_merge:
                    print(f"[+] 成功将 {feature_branch} 合并至 {baseline}。")
                    run_git_cmd(["branch", "-d", feature_branch])
                    print(f"[+] 已清理本地特征分支: {feature_branch}")
                else:
                    print(f"[-] 警告: 自动合并失败，可能存在 Git 冲突。请手动在终端处理。\n错误详情:\n{err_merge or out_merge}")
            else:
                print(f"[-] 警告: 无法切回主开发分支 {baseline}，自动合并中止。({err.strip()})")
        elif args.reject:
            # 若被打回且当前不在特征分支上，切回特征分支以方便开发人员修复
            if current != feature_branch:
                print(f"[*] 正在将本地工作区回切至特征分支 {feature_branch} 开展修复...")
                run_git_cmd(["checkout", feature_branch])

def cmd_sync(args):
    sync_db()

def cmd_brainstorm(args):
    print("\n" + "="*80)
    print("               AgentFlow Brainstorm 脑暴与 Grill-Me 深度访谈启动")
    print("="*80)
    print("在进入开发之前，请复制以下提示词发送给您的 AI 助手 (antigravity/codex) 启动脑暴：")
    print("\n---------------------------------- 复制下方提示词 ----------------------------------")
    print("【Vibe Coding 脑暴阶段启动：Grill-Me 深度访谈】\n")
    print("你好！我准备为我的项目开发一个新功能。请扮演系统架构师，根据《大脑风暴与深度访谈 (Grill-Me) 实操规程》，使用 AskUserQuestion 工具对我在后台进行至少 6 轮的深度访谈以澄清需求。\n")
    print("在这个过程中，你必须应用你的 **Superpowers** 核心赋能技能，通过 20 多个可组合的 Skill 覆盖开发全流程来进行深度的 Brainstorming 与系统规划。\n")
    print("我的初始创意为：[在此处填写您的创意，例如：实现‘找回/重置密码’功能]\n")
    print("请聚焦技术栈选型、交互逻辑细节、边界异常场景、潜在技术难点与盲区，避免询问浅显表面问题。深挖那些我可能忽略的难点 and 盲区，分轮次提问，每轮只提出 1-2 个最关键的问题。\n")
    print("请持续迭代提问，直至所有关键细节确认完毕，最终输出一份完整、可落地的详细项目开发文档（包括 docs/PRD.md, docs/DESIGN.md, docs/ARCHITECTURE.md 草案），并根据我的反馈反复优化，直到我完全满意。内容需要经过多次迭代。\n")
    print("现在，请向我提第一轮问题。")
    print("---------------------------------- 复制上方提示词 ----------------------------------\n")

def main():
    # 解决 Windows 终端下 UTF-8 字符输出乱码或报错的问题
    if sys.platform.startswith('win'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except AttributeError:
            pass

    parser = argparse.ArgumentParser(description="AgentFlow 本地多智能体协作工作流管理工具")
    subparsers = parser.add_subparsers(dest="command", help="子命令")
    
    # sync
    p_sync = subparsers.add_parser("sync", help="同步并重建本地 SQLite 任务缓存数据库")
    
    # brainstorm
    p_brainstorm = subparsers.add_parser("brainstorm", help="获取头脑风暴与 Grill-Me 深度访谈启动提示词")
    
    # add
    p_add = subparsers.add_parser("add", help="创建新任务")
    p_add.add_argument("--title", required=True, help="任务标题")
    p_add.add_argument("--desc", default="", help="任务详细描述")
    p_add.add_argument("--assignee", required=True, choices=["antigravity", "codex", "user"], help="任务负责人")
    p_add.add_argument("--deps", default="", help="前置依赖的任务ID列表，用逗号分隔，如 TASK-001,TASK-002")
    
    # list
    p_list = subparsers.add_parser("list", help="列出任务")
    p_list.add_argument("--status", choices=list(STATUS_MAP.keys()), help="过滤任务状态")
    p_list.add_argument("--assignee", help="过滤负责人")
    
    # show
    p_show = subparsers.add_parser("show", help="显示特定任务详情")
    p_show.add_argument("id", help="任务 ID (如 TASK-001)")
    
    # start
    p_start = subparsers.add_parser("start", help="将任务设为进行中")
    p_start.add_argument("id", help="任务 ID")
    p_start.add_argument("--operator", help="操作人名字 (默认使用任务指派人)")
    
    # submit
    p_submit = subparsers.add_parser("submit", help="提交任务进入审查阶段")
    p_submit.add_argument("id", help="任务 ID")
    p_submit.add_argument("--files", help="用逗号分隔的修改文件路径列表")
    p_submit.add_argument("--operator", help="操作人名字")
    
    # review
    p_review = subparsers.add_parser("review", help="审查任务")
    p_review.add_argument("id", help="任务 ID")
    p_review.add_argument("--approve", action="store_true", help="批准通过")
    p_review.add_argument("--reject", action="store_true", help="拒绝并打回")
    p_review.add_argument("--env-fail", action="store_true", help="标记为环境配置引起的测试失败，并上报给用户")
    p_review.add_argument("--run-tests", action="store_true", help="执行自动化测试命令")
    p_review.add_argument("--comment", default="", help="审查意见/打回原因/修复详细清单")
    p_review.add_argument("--operator", help="操作人名字")
    
    args = parser.parse_args()
    
    if args.command == "add":
        cmd_add(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "show":
        cmd_show(args)
    elif args.command == "start":
        cmd_start(args)
    elif args.command == "submit":
        cmd_submit(args)
    elif args.command == "review":
        cmd_review(args)
    elif args.command == "sync":
        cmd_sync(args)
    elif args.command == "brainstorm":
        cmd_brainstorm(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
