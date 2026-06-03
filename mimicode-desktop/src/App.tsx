import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { Icons } from "./components/Icons";
import { Task, EnvStatus } from "./types";

// Import Views
import { ChatView } from "./views/ChatView";
import { TasksView } from "./views/TasksView";
import { TaskDetailView } from "./views/TaskDetailView";
import { AgentsView } from "./views/AgentsView";
import { WorktreesView } from "./views/WorktreesView";
import { DiagnosticsView } from "./views/DiagnosticsView";
import { SettingsView } from "./views/SettingsView";
import { SpecificationsView } from "./views/SpecificationsView";
import { PromptsView } from "./views/PromptsView";
import { NewProjectWizard } from "./components/NewProjectWizard";
import { AgentTerminalPanel } from "./components/AgentTerminalPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";

const appTranslations = {
  'English': {
    brandSubtitle: 'AI-Native Vibe Coding Studio',
    nav: {
      Chat: 'Chat',
      Tasks: 'Tasks',
      Agents: 'Agents',
      Worktrees: 'Worktrees',
      Specifications: 'Specifications',
      Prompts: 'Prompts',
      Diagnostics: 'Diagnostics',
      Settings: 'Settings'
    },
    activeTasks: 'ACTIVE TASKS',
    noTasks: 'No tasks found in project.',
    newProject: 'New Project Wizard'
  },
  '简体中文': {
    brandSubtitle: 'AI原生共振编程工作室',
    nav: {
      Chat: '对话',
      Tasks: '任务中心',
      Agents: '智能体',
      Worktrees: '工作区',
      Specifications: '需求规格',
      Prompts: '提示词',
      Diagnostics: '系统诊断',
      Settings: '系统设置'
    },
    activeTasks: '进行中的任务',
    noTasks: '当前项目中没有找到任何任务。',
    newProject: '新建项目向导'
  }
};

function App() {
  const DEFAULT_PROJECT_PATH = "d:\\agentcode";
  const [projectPath, setProjectPath] = useState(DEFAULT_PROJECT_PATH);
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState("Chat");
  const [viewState, setViewState] = useState<'list' | 'detail'>('list');
  const [chatInputText, setChatInputText] = useState("");
  interface ToastItem {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
  }

  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showInterceptionModal, setShowInterceptionModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('mimi-language') || '简体中文'; } catch { return '简体中文'; }
  });
  const t = appTranslations[language as keyof typeof appTranslations] || appTranslations['English'];

  useEffect(() => {
    const handleLangChange = (e: any) => {
      setLanguage(e.detail);
    };
    window.addEventListener('mimi-language-changed', handleLangChange);
    return () => window.removeEventListener('mimi-language-changed', handleLangChange);
  }, []);

  useEffect(() => {
    (window as any).setShowInterceptionModal = setShowInterceptionModal;
    (window as any).showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };
  }, []);


  useEffect(() => {
    loadEnvironment();
    fetchTasks();
  }, [projectPath]);

  async function handleSelectDirectory() {
    try {
      const selected: string = await invoke("select_directory");
      if (selected) {
        await invoke("initialize_project", { projectPath: selected });
        setProjectPath(selected);
      }
    } catch (err) {
      if (err !== "Operation cancelled by user") {
        (window as any).showToast("选择目录失败: " + err, "error");
      }
    }
  }

  async function loadEnvironment() {
    try {
      const res: EnvStatus = await invoke("check_environment", { projectPath });
      setEnvStatus(res);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchTasks() {
    try {
      const res: string = await invoke("run_agentflow_cmd", {
        projectPath,
        args: ["json-list"]
      });
      const jsonStart = res.indexOf("[");
      if (jsonStart !== -1) {
        const jsonStr = res.substring(jsonStart);
        const parsed: Task[] = JSON.parse(jsonStr);
        setTasks(parsed);
        if (parsed.length > 0 && !selectedTaskId) {
          setSelectedTaskId(parsed[0].id);
        }
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error(err);
      (window as any).showToast("MIMIcode 无法加载任务列表！" + String(err), "error");
      setTasks([]);
    }
  }

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const renderMainContent = () => {
    if (activeNav === 'Chat') {
      return (
        <ChatView 
          projectPath={projectPath}
          selectedTask={selectedTask}
          tasks={tasks}
          setSelectedTaskId={setSelectedTaskId}
          chatInputText={chatInputText}
          setChatInputText={setChatInputText}
          handleSelectDirectory={handleSelectDirectory}
          fetchTasks={fetchTasks}
          onNavigate={(nav) => setActiveNav(nav)}
        />
      );
    } else if (activeNav === 'Tasks') {
      if (viewState === 'detail' && selectedTask) {
        return (
          <TaskDetailView 
            task={selectedTask} 
            projectPath={projectPath}
            fetchTasks={fetchTasks}
            onBack={() => setViewState('list')} 
          />
        );
      }
      return (
        <TasksView 
          tasks={tasks} 
          projectPath={projectPath}
          fetchTasks={fetchTasks}
          onSelectTask={(id) => {
            setSelectedTaskId(id);
            setViewState('detail');
          }} 
        />
      );
    } else if (activeNav === 'Agents') {
      return <AgentsView projectPath={projectPath} onNavigate={(nav) => setActiveNav(nav)} />;
    } else if (activeNav === 'Worktrees') {
      return <WorktreesView projectPath={projectPath} />;
    } else if (activeNav === 'Specifications') {
      return <SpecificationsView projectPath={projectPath} />;
    } else if (activeNav === 'Prompts') {
      return <PromptsView projectPath={projectPath} />;
    } else if (activeNav === 'Diagnostics') {
      return <DiagnosticsView envStatus={envStatus} projectPath={projectPath} />;
    } else if (activeNav === 'Settings') {
      return <SettingsView projectPath={projectPath} />;
    }
    return <div className="view-container">Not Implemented</div>;
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-logo-container">M</div>
          <div className="brand-text">
            <span className="brand-title">MIMIcode Studio</span>
            <span className="brand-subtitle">{t.brandSubtitle}</span>
          </div>
        </div>
        
        <div className="sidebar-scrollable">
          <div className="nav-section">
            <a href="#" className={`nav-item ${activeNav === 'Chat' ? 'active' : ''}`} onClick={() => { setActiveNav('Chat'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.MessageSquare className="nav-icon" /><span>{t.nav.Chat}</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Tasks' ? 'active' : ''}`} onClick={() => { setActiveNav('Tasks'); setViewState('list'); fetchTasks(); }}>
              <div className="nav-item-left"><Icons.CheckSquare className="nav-icon" /><span>{t.nav.Tasks}</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Agents' ? 'active' : ''}`} onClick={() => { setActiveNav('Agents'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.Users className="nav-icon" /><span>{t.nav.Agents}</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Worktrees' ? 'active' : ''}`} onClick={() => { setActiveNav('Worktrees'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.GitBranch className="nav-icon" /><span>{t.nav.Worktrees}</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Specifications' ? 'active' : ''}`} onClick={() => { setActiveNav('Specifications'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.BookOpen className="nav-icon" /><span>{t.nav.Specifications}</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Prompts' ? 'active' : ''}`} onClick={() => { setActiveNav('Prompts'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.FileText className="nav-icon" /><span>{t.nav.Prompts}</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Diagnostics' ? 'active' : ''}`} onClick={() => { setActiveNav('Diagnostics'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.Activity className="nav-icon" /><span>{t.nav.Diagnostics}</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Settings' ? 'active' : ''}`} onClick={() => { setActiveNav('Settings'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.Settings className="nav-icon" /><span>{t.nav.Settings}</span></div>
            </a>
          </div>

          <div className="nav-section" style={{ marginTop: '12px' }}>
            <div className="section-header">
              <span className="section-title">{t.activeTasks}</span>
              <button className="btn-icon-ghost" title="New Task" onClick={() => setShowNewTaskModal(true)}>
                <Icons.Plus />
              </button>
            </div>
            
            {tasks.length === 0 ? (
               <div style={{ padding: '12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                 {t.noTasks}
               </div>
            ) : tasks.map((task) => (
              <div 
                key={task.id}
                className={`task-card-sidebar ${selectedTaskId === task.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTaskId(task.id);
                  if (activeNav === 'Tasks') setViewState('detail');
                }}
              >
                <div className="task-header-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.FileText style={{ color: 'var(--color-primary-orange)', width: '12px', height: '12px' }} />
                    <span className="task-id">{task.id}</span>
                  </div>
                  <div className={`task-status-dot ${task.status === 'in_progress' ? 'in-progress' : task.status === 'review' ? 'in-review' : 'pending'}`} />
                </div>
                <div className="task-card-title">{task.title}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Global trigger wizard in sidebar footer */}
        <div className="sidebar-footer">
          <button className="btn w-full" style={{ padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => setShowWizard(true)}>
            <Icons.Plus style={{ width: '12px', height: '12px' }}/> {t.newProject}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div key={`${activeNav}-${viewState}`} style={{ display: 'contents' }}>
          {renderMainContent()}
        </div>
      </main>

      <ErrorBoundary>
        <AgentTerminalPanel projectPath={projectPath} />
      </ErrorBoundary>

      {showWizard && (
        <NewProjectWizard 
          onClose={() => setShowWizard(false)} 
          onCreated={(path) => {
            setProjectPath(path);
            (window as any).showToast(`项目成功创建于: ${path}`, "success");
          }} 
        />
      )}

      {/* Existing modals remain unchanged */}
      {showNewTaskModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowNewTaskModal(false) }}>
          <div className="modal-card" style={{ width: '500px' }}>
            <div className="modal-header">
              <div className="modal-title">Create New Task<br/><span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>创建新任务卡片</span></div>
              <button className="btn-icon-ghost" onClick={() => setShowNewTaskModal(false)}><Icons.Plus style={{ transform: 'rotate(45deg)' }}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input 
                  type="text" 
                  className="intercept-input" 
                  placeholder="输入任务标题..." 
                  id="newTaskTitleInput"
                />
              </div>
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">Description</label>
                <textarea 
                  className="intercept-input" 
                  rows={4} 
                  placeholder="描述任务的详细信息..."
                  id="newTaskDescInput"
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Assign to Agent</label>
                  <select className="form-select" id="newTaskAssigneeInput">
                    <option value="antigravity">Antigravity (前端专家)</option>
                    <option value="codex">Codex (后端专家)</option>
                    <option value="hermes">Hermes (规划专家)</option>
                    <option value="opencode">OpenCode (重构专家)</option>
                    <option value="claudecode">Claude Code (审计专家)</option>
                    <option value="user">User (我来处理)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Priority</label>
                  <select className="form-select" id="newTaskPriorityInput">
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowNewTaskModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                const title = (document.getElementById('newTaskTitleInput') as HTMLInputElement).value;
                const desc = (document.getElementById('newTaskDescInput') as HTMLTextAreaElement).value;
                const assignee = (document.getElementById('newTaskAssigneeInput') as HTMLSelectElement).value;
                if (!title.trim()) {
                  alert("请输入任务标题");
                  return;
                }
                try {
                  const args = ["add", "--title", title, "--assignee", assignee];
                  if (desc.trim()) args.push("--desc", desc);
                  await invoke("run_agentflow_cmd", { projectPath, args });
                  setShowNewTaskModal(false);
                  fetchTasks();
                } catch (err: any) {
                  alert("创建任务失败: " + err.toString());
                }
              }}>Create Task</button>
            </div>
          </div>
        </div>
      )}

      {showInterceptionModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowInterceptionModal(false) }}>
          <div className="modal-card interception-modal" style={{ width: '480px' }}>
            <div className="modal-header">
              <div className="modal-title font-bold" style={{ fontSize: '16px' }}>需要你的协助</div>
              <button className="btn-icon-ghost" onClick={() => setShowInterceptionModal(false)}><Icons.Plus style={{ transform: 'rotate(45deg)' }}/></button>
            </div>
            <div className="modal-body" style={{ padding: '24px 32px' }}>
              <div className="text-sm text-muted mb-4">
                <span className="font-semibold text-main" style={{ color: 'var(--color-text-main)' }}>Hermes Agent</span> 需要你提供信息以继续
              </div>
              
              <div className="form-group mb-6">
                <label className="form-label font-semibold text-main mb-2" style={{ color: 'var(--color-text-main)' }}>请输入登录功能的第三方登录提供商：</label>
                <div className="checkbox-group flex-col gap-2">
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" className="custom-checkbox" defaultChecked />
                    <span className="text-sm">GitHub</span>
                  </label>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" className="custom-checkbox" />
                    <span className="text-sm">Google</span>
                  </label>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" className="custom-checkbox" />
                    <span className="text-sm">Apple</span>
                  </label>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label text-muted">其他说明 (可选)</label>
                <textarea 
                  className="intercept-input bg-panel" 
                  rows={3} 
                  placeholder="请输入其他需求或说明..."
                  style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                ></textarea>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', padding: '16px', gap: '16px' }}>
              <button className="btn px-8" onClick={() => setShowInterceptionModal(false)}>跳过</button>
              <button className="btn btn-primary px-8" onClick={() => setShowInterceptionModal(false)}>确认并继续</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-card toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              )}
              {toast.type === 'error' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              )}
              {toast.type === 'info' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              )}
            </span>
            <div className="toast-message">{toast.message}</div>
            <button className="toast-close-btn" onClick={() => {
              setToasts(prev => prev.filter(t => t.id !== toast.id));
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
