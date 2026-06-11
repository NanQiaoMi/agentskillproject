import { useState, useEffect } from "react";
import "./App.css";
import { Icons } from "./components/Icons";
import { EnvStatus } from "./types";

// Import Views
import { ChatView } from "./views/ChatView";
import { TasksView } from "./views/TasksView";
import { TaskDetailView } from "./views/TaskDetailView";
import { AgentsView } from "./views/AgentsView";
import { WorktreesView } from "./views/WorktreesView";
import { DiagnosticsView } from "./views/DiagnosticsView";
import { SettingsView } from "./views/SettingsView";
import { IDEView } from "./views/IDEView";
import { SpecificationsView } from "./views/SpecificationsView";
import { PromptsView } from "./views/PromptsView";
import { NewProjectWizard } from "./components/NewProjectWizard";
import { AgentTerminalPanel } from "./components/AgentTerminalPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalSearchModal } from "./components/GlobalSearchModal";
import { NotificationsPanel, dispatchAppNotification } from "./components/NotificationsPanel";
import { NewTaskModal } from "./components/NewTaskModal";
import { useAgentCmd } from "./hooks/useAgentCmd";

import { Sidebar } from "./components/layout/Sidebar";

import { useAppContext } from "./context/AppContext";

let hasDispatchedWelcome = false;

function App() {
  const {
    projectPath, setProjectPath,
    envStatus, setEnvStatus,
    tasks,
    selectedTaskId, setSelectedTaskId,
    activeNav, setActiveNav,
    viewState, setViewState,
    chatInputText, setChatInputText,
    showSearchModal, setShowSearchModal,
    showWizard, setShowWizard,
    fetchTasks, handleSelectDirectory,
    toasts, addToast, removeToast,
    setLanguage
  } = useAppContext();

  const [showInterceptionModal, setShowInterceptionModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  

  useEffect(() => {
    const handleLangChange = (e: any) => {
      setLanguage(e.detail);
    };
    const handleUnread = (e: Event) => {
      const ce = e as CustomEvent;
      setUnreadNotifications(ce.detail);
    };
    window.addEventListener('mimi-language-changed', handleLangChange);
    window.addEventListener('app-notification-unread', handleUnread);
    
    // Initialize mermaid full-screen viewer
    import('./utils/mermaidViewer').then(m => m.initMermaidViewer());
    
    // Dispatch a welcome system notification once per session
    if (!hasDispatchedWelcome) {
      hasDispatchedWelcome = true;
      const timerId = setTimeout(() => {
        dispatchAppNotification({
          type: 'system',
          title: '系统启动成功',
          desc: '欢迎来到 MIMIcode Studio！系统环境检查完毕，智能体已准备就绪。'
        });
      }, 1500);
      
      return () => {
        window.removeEventListener('mimi-language-changed', handleLangChange);
        window.removeEventListener('app-notification-unread', handleUnread);
        clearTimeout(timerId);
      };
    }

    return () => {
      window.removeEventListener('mimi-language-changed', handleLangChange);
      window.removeEventListener('app-notification-unread', handleUnread);
    };
  }, []);

  useEffect(() => {
    (window as any).setShowInterceptionModal = setShowInterceptionModal;
    (window as any).showToast = addToast;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);


  useEffect(() => {
    loadEnvironment();
    fetchTasks();
    
    // Background polling every 5 seconds to monitor tasks
    const interval = setInterval(() => {
      fetchTasks(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [projectPath]);

  const { checkEnv } = useAgentCmd();

  async function loadEnvironment() {
    try {
      const res: EnvStatus = await checkEnv();
      setEnvStatus(res);
    } catch (err) {
      console.error(err);
    }
  }

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const renderMainContent = () => {
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden', minHeight: 0, minWidth: 0 }}>
        {/* Persisted Views */}
        <div style={{ display: activeNav === 'Chat' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
          <ChatView 
            projectPath={projectPath}
            selectedTask={selectedTask || null}
            tasks={tasks}
            setSelectedTaskId={setSelectedTaskId}
            chatInputText={chatInputText}
            setChatInputText={setChatInputText}
            handleSelectDirectory={handleSelectDirectory}
            fetchTasks={fetchTasks}
            onNavigate={(nav: string) => setActiveNav(nav)}
          />
        </div>

        <div style={{ display: activeNav === 'Tasks' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
          {viewState === 'detail' && selectedTask ? (
            <TaskDetailView 
              task={selectedTask} 
              projectPath={projectPath}
              fetchTasks={fetchTasks}
              onBack={() => setViewState('list')} 
            />
          ) : (
            <TasksView 
              tasks={tasks} 
              fetchTasks={fetchTasks}
              onSelectTask={(id) => {
                setSelectedTaskId(id);
                setViewState('detail');
              }} 
            />
          )}
        </div>

        <div style={{ display: activeNav === 'Agents' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
          <AgentsView projectPath={projectPath} onNavigate={(nav) => setActiveNav(nav)} />
        </div>

        {/* Transient Views */}
        {activeNav === 'Worktrees' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
            <WorktreesView projectPath={projectPath} />
          </div>
        )}
        
        {activeNav === 'Specifications' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
            <SpecificationsView projectPath={projectPath} />
          </div>
        )}

        {activeNav === 'Prompts' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
            <PromptsView projectPath={projectPath} />
          </div>
        )}

        {activeNav === 'Diagnostics' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
            <DiagnosticsView envStatus={envStatus} projectPath={projectPath} />
          </div>
        )}

        {activeNav === 'Settings' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
            <SettingsView projectPath={projectPath} />
          </div>
        )}

        {activeNav === 'IDE' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
            <IDEView projectPath={projectPath} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-content" style={{ position: 'relative' }}>
        {/* Top-Right Action Toolbar */}
        {activeNav !== 'IDE' && (
          <div style={{ position: 'absolute', top: '16px', right: '24px', display: 'flex', gap: '12px', zIndex: 100 }}>
            <button 
              className="btn-icon-ghost hover-scale" 
              title="Global Search (Ctrl+K)"
              onClick={() => setShowSearchModal(true)}
              style={{ 
                backgroundColor: 'var(--bg-panel)', 
                border: '1px solid var(--color-border)',
                width: '32px', height: '32px',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <Icons.Search style={{ width: '18px', height: '18px', color: 'var(--color-text-main)' }} />
            </button>
            <button 
              className="btn-icon-ghost hover-scale" 
              title="Notifications"
              onClick={() => setShowNotifications(true)}
              style={{ 
                backgroundColor: 'var(--bg-panel)', 
                border: '1px solid var(--color-border)', 
                position: 'relative',
                width: '32px', height: '32px',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <Icons.Bell style={{ width: '18px', height: '18px', color: 'var(--color-text-main)' }} />
              {unreadNotifications > 0 && (
                <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary-orange)', border: '2px solid var(--bg-panel)' }}></div>
              )}
            </button>
          </div>
        )}

        {renderMainContent()}
      </main>

      <GlobalSearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} projectPath={projectPath || ''} />
      <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

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

      <NewTaskModal />

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
                <Icons.CheckCircle2 width={16} height={16} strokeWidth={2.5} />
              )}
              {toast.type === 'error' && (
                <Icons.XCircle width={16} height={16} strokeWidth={2.5} />
              )}
              {toast.type === 'info' && (
                <Icons.Info width={16} height={16} strokeWidth={2.5} />
              )}
            </span>
            <div className="toast-message">{toast.message}</div>
            <button className="toast-close-btn" onClick={() => {
              removeToast(toast.id);
            }}>
              <Icons.X width={12} height={12} strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
