import React from 'react';
import { Icons } from '../Icons';
import { useAppContext } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const {
    activeNav, setActiveNav,
    setViewState,
    tasks,
    selectedTaskId, setSelectedTaskId,
    setShowNewTaskModal,
    setShowWizard,
    language
  } = useAppContext();

  const appTranslations = {
      'English': {
      brandSubtitle: 'AI-Native Vibe Coding Studio',
      nav: {
        Dashboard: 'CEO Dashboard',
        Chat: 'Chat',
        Tasks: 'Tasks',
        Agents: 'Agents',
        Worktrees: 'Worktrees',
        Specifications: 'Specifications',
        Prompts: 'Prompts',
        Blueprints: 'Blueprints',
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
        Dashboard: 'CEO 总控台',
        Chat: '对话',
        Tasks: '任务中心',
        Agents: '智能体',
        Worktrees: '工作区',
        Specifications: '需求规格',
        Prompts: '提示词',
        Blueprints: '工作流蓝图',
        Diagnostics: '系统诊断',
        Settings: '系统设置'
      },
      activeTasks: '进行中的任务',
      noTasks: '当前项目中没有找到任何任务。',
      newProject: '新建项目向导'
    }
  };

  const t = appTranslations[language as keyof typeof appTranslations] || appTranslations['English'];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-logo-container" style={{ background: 'transparent', padding: '2px' }}>
          <img src="/logo.png" alt="MIMICODE" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div className="brand-text">
          <span className="brand-title">MIMIcode Studio</span>
          <span className="brand-subtitle">{t.brandSubtitle}</span>
        </div>
      </div>
      
      <div className="sidebar-scrollable">
        <div className="nav-section">
          <a href="#" className={`nav-item ${activeNav === 'Dashboard' ? 'active' : ''}`} onClick={() => { setActiveNav('Dashboard'); setViewState('list'); }}>
            <div className="nav-item-left"><Icons.Activity className="nav-icon" /><span>{t.nav.Dashboard || 'CEO Dashboard'}</span></div>
          </a>
          
          <div className="section-header" style={{ marginTop: '16px', marginBottom: '8px' }}>
            <span className="section-title">COMPANY LEADERS</span>
          </div>

          <a href="#" className={`nav-item ${activeNav === 'LeaderMarketing' ? 'active' : ''}`} onClick={() => { setActiveNav('LeaderMarketing'); setViewState('list'); }}>
            <div className="nav-item-left"><Icons.Users className="nav-icon" /><span>Marketing Leader</span></div>
          </a>
          <a href="#" className={`nav-item ${activeNav === 'LeaderEngineering' ? 'active' : ''}`} onClick={() => { setActiveNav('LeaderEngineering'); setViewState('list'); }}>
            <div className="nav-item-left"><Icons.Network className="nav-icon" /><span>Engineering Leader</span></div>
          </a>

          <div className="section-header" style={{ marginTop: '16px', marginBottom: '8px' }}>
            <span className="section-title">SYSTEM</span>
          </div>

          <a href="#" className={`nav-item ${activeNav === 'Settings' ? 'active' : ''}`} onClick={() => { setActiveNav('Settings'); setViewState('list'); }}>
            <div className="nav-item-left"><Icons.Settings className="nav-icon" /><span>{t.nav.Settings || 'Settings'}</span></div>
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

      <div className="sidebar-footer">
        <button className="btn w-full" style={{ padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => setShowWizard(true)}>
          <Icons.Plus style={{ width: '12px', height: '12px' }}/> {t.newProject}
        </button>
      </div>
    </aside>
  );
};
