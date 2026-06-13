import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../Icons';
import { useAppContext } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const {
    activeNav, setActiveNav,
    setViewState,
    tasks,
    selectedTaskId, setSelectedTaskId,
    fetchTasks,
    setShowNewTaskModal,
    setShowWizard,
    language
  } = useAppContext();

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
        Settings: 'Settings',
        IDE: 'Workbench'
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
        Settings: '系统设置',
        IDE: '代码工作台'
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
          <a href="#" className={`nav-item ${activeNav === 'Chat' ? 'active' : ''}`} onClick={() => { setActiveNav('Chat'); setViewState('list'); setSelectedTaskId(null); }}>
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
          <a href="#" className={`nav-item ${activeNav === 'IDE' ? 'active' : ''}`} onClick={() => { setActiveNav('IDE'); setViewState('list'); }}>
            <div className="nav-item-left"><Icons.Code className="nav-icon" /><span>{t.nav.IDE}</span></div>
          </a>
        </div>

        <div className="nav-section" style={{ marginTop: '12px' }}>
          <div className="section-header">
            <span className="section-title">{t.activeTasks}</span>
            <button className="btn-icon-ghost" title="New Task" onClick={() => setShowNewTaskModal(true)}>
              <Icons.Plus />
            </button>
          </div>
          
          <AnimatePresence mode="popLayout">
          {tasks.length === 0 ? (
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ padding: '12px', fontSize: '12px', color: 'var(--color-text-muted)' }}
             >
               {t.noTasks}
             </motion.div>
          ) : tasks.map((task) => {
            const getStatusColor = (status: string) => {
              if (status === 'in_progress') return { hex: '#EF4444', glow: 'rgba(239, 68, 68, 0.15)' }; // Red
              if (status === 'review') return { hex: '#F59E0B', glow: 'rgba(245, 158, 11, 0.15)' }; // Orange
              if (status === 'done') return { hex: '#10B981', glow: 'rgba(16, 185, 129, 0.15)' }; // Green
              return { hex: '#3B82F6', glow: 'rgba(59, 130, 246, 0.15)' }; // Default/Pending Blue
            };

            const getAgentColor = (name: string | undefined) => {
              const lower = (name || '').toLowerCase();
              if (lower.includes('hermes')) return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' }; // Red
              if (lower.includes('opencode')) return { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' }; // Purple
              if (lower.includes('codex')) return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' }; // Green
              if (lower.includes('claude') || lower.includes('qa')) return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' }; // Orange
              if (lower.includes('antigravity')) return { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' }; // Blue
              return { color: 'var(--color-text-muted)', bg: 'var(--bg-hover)' }; // Default
            };
            
            const getPriorityStyle = (priority: string = 'High') => {
              if (priority === 'High') return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' };
              if (priority === 'Medium') return { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' };
              return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' };
            };

            const pri = task.priority || 'Medium';
            const priStyle = getPriorityStyle(pri);
            const statusTheme = getStatusColor(task.status);
            const agentTheme = getAgentColor(task.assignee);

            return (
              <motion.div 
                key={task.id}
                layout
                initial={{ opacity: 0, y: -5, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(2px)', transition: { duration: 0.2, ease: "easeIn" } }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1], layout: { type: 'spring', bounce: 0, duration: 0.4 } }}
                className={`task-card-sidebar ${selectedTaskId === task.id ? 'active' : ''}`}
                style={{ '--card-accent': agentTheme.color, '--card-glow': agentTheme.bg } as React.CSSProperties}
                onClick={() => {
                  setSelectedTaskId(task.id);
                  if (activeNav === 'Tasks') setViewState('detail');
                }}
              >
                <div className="kanban-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono" style={{ opacity: task.status === 'done' ? 0.6 : 1, transition: 'opacity 0.4s ease' }}>{task.id}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {task.status === 'done' && <Icons.CheckCircle2 className="done-icon-anim" style={{ width: '14px', height: '14px', color: '#10B981' }} />}
                    <span className="status-dot" style={{ 
                      width: task.status === 'done' ? '0px' : '6px', 
                      height: task.status === 'done' ? '0px' : '6px', 
                      borderRadius: '50%', 
                      backgroundColor: statusTheme.hex,
                      opacity: task.status === 'done' ? 0 : 1,
                      margin: task.status === 'done' ? '0' : '0 2px'
                    }} title="Task Status"></span>
                  </div>
                </div>
                <div className="kanban-card-title" style={{ 
                  textDecoration: task.status === 'done' ? 'line-through' : 'none', 
                  opacity: task.status === 'done' ? 0.5 : 1, 
                  transition: 'all 0.4s ease' 
                }}>{task.title}</div>
                <div className="kanban-card-footer">
                  <div className="agent-badge" style={{ padding: '2px 6px', border: 'none', background: 'transparent' }}>
                    <div className="agent-avatar-small" style={{ 
                      width: '20px', height: '20px', fontSize: '10px', marginRight: '6px',
                      backgroundColor: getAgentColor(task.assignee).bg,
                      color: getAgentColor(task.assignee).color
                    }}>
                      {task.assignee ? task.assignee.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{task.assignee || 'Unassigned'}</span>
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                    backgroundColor: priStyle.bg, color: priStyle.color
                  }}>
                    {pri}
                  </span>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
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
