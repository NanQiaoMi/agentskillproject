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
import { NewProjectWizard } from "./components/NewProjectWizard";

function App() {
  const DEFAULT_PROJECT_PATH = "d:\\agentcode";
  const [projectPath, setProjectPath] = useState(DEFAULT_PROJECT_PATH);
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState("Chat");
  const [viewState, setViewState] = useState<'list' | 'detail'>('list');
  const [chatInputText, setChatInputText] = useState("");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showInterceptionModal, setShowInterceptionModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    (window as any).setShowInterceptionModal = setShowInterceptionModal;
  }, []);

  useEffect(() => {
    loadEnvironment();
    fetchTasks();
  }, [projectPath]);

  async function handleSelectDirectory() {
    try {
      const selected: string = await invoke("select_directory");
      setProjectPath(selected);
    } catch (err) {
      if (err !== "Operation cancelled by user") {
        alert("Error: " + err);
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
          chatInputText={chatInputText}
          setChatInputText={setChatInputText}
          handleSelectDirectory={handleSelectDirectory}
          fetchTasks={fetchTasks}
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
      return <AgentsView projectPath={projectPath} />;
    } else if (activeNav === 'Worktrees') {
      return <WorktreesView projectPath={projectPath} />;
    } else if (activeNav === 'Specifications') {
      return <SpecificationsView />;
    } else if (activeNav === 'Diagnostics') {
      return <DiagnosticsView envStatus={envStatus} />;
    } else if (activeNav === 'Settings') {
      return <SettingsView />;
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
            <span className="brand-subtitle">AI-Native Vibe Coding Studio</span>
          </div>
        </div>
        
        <div className="sidebar-scrollable">
          <div className="nav-section">
            <a href="#" className={`nav-item ${activeNav === 'Chat' ? 'active' : ''}`} onClick={() => { setActiveNav('Chat'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.MessageSquare className="nav-icon" /><span>Chat</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Tasks' ? 'active' : ''}`} onClick={() => { setActiveNav('Tasks'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.CheckSquare className="nav-icon" /><span>Tasks</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Agents' ? 'active' : ''}`} onClick={() => { setActiveNav('Agents'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.Users className="nav-icon" /><span>Agents</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Worktrees' ? 'active' : ''}`} onClick={() => { setActiveNav('Worktrees'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.GitBranch className="nav-icon" /><span>Worktrees</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Specifications' ? 'active' : ''}`} onClick={() => { setActiveNav('Specifications'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.BookOpen className="nav-icon" /><span>Specifications</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Diagnostics' ? 'active' : ''}`} onClick={() => { setActiveNav('Diagnostics'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.Activity className="nav-icon" /><span>Diagnostics</span></div>
            </a>
            <a href="#" className={`nav-item ${activeNav === 'Settings' ? 'active' : ''}`} onClick={() => { setActiveNav('Settings'); setViewState('list'); }}>
              <div className="nav-item-left"><Icons.Settings className="nav-icon" /><span>Settings</span></div>
            </a>
          </div>

          <div className="nav-section" style={{ marginTop: '12px' }}>
            <div className="section-header">
              <span className="section-title">ACTIVE TASKS</span>
              <button className="btn-icon-ghost" title="New Task" onClick={() => setShowNewTaskModal(true)}>
                <Icons.Plus />
              </button>
            </div>
            
            {tasks.length === 0 ? (
               <div style={{ padding: '12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                 No tasks found in project.
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
            <Icons.Plus style={{ width: '12px', height: '12px' }}/> New Project Wizard
          </button>
        </div>
      </aside>

      <main className="main-content">
        {renderMainContent()}
      </main>

      {showWizard && (
        <NewProjectWizard 
          onClose={() => setShowWizard(false)} 
          onCreated={(path) => {
            setProjectPath(path);
            alert(`Project created at ${path}`);
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
                <input type="text" className="intercept-input" placeholder="输入任务标题..." />
              </div>
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">Description</label>
                <textarea className="intercept-input" rows={4} placeholder="描述任务的详细信息..."></textarea>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Assign to Agent</label>
                  <select className="form-select">
                    <option>选择智能体...</option>
                    <option>Codex (Backend)</option>
                    <option>Antigravity (Frontend)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Priority</label>
                  <select className="form-select">
                    <option>Medium</option>
                    <option>High</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowNewTaskModal(false)}>Cancel</button>
              <button className="btn btn-primary">Create Task</button>
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
    </div>
  );
}

export default App;
