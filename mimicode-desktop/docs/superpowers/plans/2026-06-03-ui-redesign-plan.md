# MIMIcode Studio UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely redesign and align the MIMIcode Studio UI views (Kanban, Subtasks, Worktree dual-pane, Specs view, Log terminal, settings panels, and new project wizard) to exactly replicate the provided design images.

**Architecture:** We will apply incremental layout updates to individual React views and encapsulate shared premium styling tokens inside `src/App.css`.

**Tech Stack:** React 18, TypeScript, Vite, CSS (Vanilla), Tauri IPC.

---

### Task 1: CSS Layout Styles Configuration

**Files:**
- Modify: `D:/agentcode/mimicode-desktop/src/App.css`

- [ ] **Step 1: Append design classes to `App.css`**

Add the CSS classes needed for Kanban layout, cards, two-pane layouts, checklist ticks, terminal, and spec docs:

```css
/* Kanban Board */
.kanban-board-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 16px; height: 100%; overflow-x: auto; }
.kanban-column { background-color: var(--bg-panel); border: 1px solid var(--color-border); border-radius: var(--radius-lg); display: flex; flex-direction: column; max-height: 100%; padding: 16px 12px; }
.kanban-column-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 4px; }
.kanban-column-title { font-size: 14px; font-weight: 600; color: var(--color-text-main); display: flex; align-items: center; gap: 8px; }
.kanban-count-badge { background-color: var(--color-border); color: var(--color-text-secondary); font-size: 11px; padding: 1px 6px; border-radius: 99px; }
.kanban-column-content { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; min-height: 150px; }
.kanban-card { background-color: var(--bg-main); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; cursor: pointer; transition: all var(--transition-smooth); box-shadow: var(--shadow-soft); display: flex; flex-direction: column; gap: 10px; }
.kanban-card:hover { border-color: var(--color-border-hover); box-shadow: var(--shadow-card); }
.kanban-card-header { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--color-text-muted); font-family: var(--font-mono); }
.kanban-card-title { font-size: 13px; font-weight: 600; color: var(--color-text-main); line-height: 1.4; }
.kanban-card-footer { display: flex; justify-content: space-between; align-items: center; }

/* Subtasks & Split Views */
.task-detail-split { display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px; padding: 20px; }
.subtask-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background-color: var(--bg-main); margin-bottom: 8px; }
.subtask-item.completed { opacity: 0.6; text-decoration: line-through; background-color: var(--bg-panel); }
.tech-standards-list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }

/* Worktree Split */
.worktree-split-container { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; padding: 20px; height: 100%; }
.worktree-details-left { display: flex; flex-direction: column; gap: 16px; background-color: var(--bg-main); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; }
.worktree-details-right { display: flex; flex-direction: column; gap: 20px; }
.changes-box, .commits-box { background-color: var(--bg-main); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 20px; }

/* Model Item List */
.model-list-wrapper { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.model-list-card-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background-color: var(--bg-main); }
.model-list-card-left { display: flex; align-items: center; gap: 12px; }
.model-badge-primary { font-size: 11px; padding: 2px 8px; background-color: var(--color-success-bg); color: var(--color-success); border-radius: var(--radius-sm); font-weight: 500; }
```

- [ ] **Step 2: Commit CSS Changes**
Run: `git commit -am "style: add redesign CSS utility classes"`

---

### Task 2: Tasks View - Kanban Board Redesign

**Files:**
- Modify: `D:/agentcode/mimicode-desktop/src/views/TasksView.tsx`

- [ ] **Step 1: Replace TasksView code with Kanban board layout**

Implement status-based lanes in `TasksView.tsx`. Add code to render columns for `todo` (Pending), `in_progress` (In Progress), `review` (In Review), and `done` (Done):

```tsx
import React, { useState } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { Icons } from '../components/Icons';
import { Task } from '../types';

interface TasksViewProps {
  tasks: Task[];
  projectPath: string;
  fetchTasks: () => void;
  onSelectTask: (taskId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ tasks, projectPath, fetchTasks, onSelectTask }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('antigravity');
  const [isCreating, setIsCreating] = useState(false);

  const columns = [
    { key: 'todo', title: 'Todo', color: '#6B7280' },
    { key: 'in_progress', title: 'In Progress', color: '#E8684A' },
    { key: 'review', title: 'In Review', color: '#F59E0B' },
    { key: 'done', title: 'Done', color: '#10B981' }
  ];

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setIsCreating(true);
    try {
      const args = ["add", "--title", newTaskTitle, "--assignee", newTaskAssignee];
      if (newTaskDesc.trim()) args.push("--desc", newTaskDesc);
      await invoke("run_agentflow_cmd", { projectPath, args });
      setShowCreateModal(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      fetchTasks();
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setIsCreating(false);
    }
  };

  const getPriorityStyle = (priority: string = 'High') => {
    if (priority === 'High') return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' };
    if (priority === 'Medium') return { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' };
    return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' };
  };

  return (
    <div className="view-container bg-panel">
      <div className="view-header">
        <div className="view-title-row">
          <h1 className="view-title">Tasks Board</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}><Icons.Search style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Filter</button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}><Icons.Layout style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Group: Status</button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Icons.Plus style={{ width: '14px', height: '14px', marginRight: '4px' }} /> New Task
            </button>
          </div>
        </div>
      </div>

      <div className="view-content" style={{ padding: '16px', overflow: 'hidden' }}>
        <div className="kanban-board-container">
          {columns.map(col => {
            const colTasks = tasks.filter(t => {
              if (col.key === 'todo') return t.status === 'todo' || t.status === 'pending' || !t.status;
              if (col.key === 'review') return t.status === 'review';
              return t.status === col.key;
            });

            return (
              <div key={col.key} className="kanban-column">
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color }}></span>
                    <span>{col.title}</span>
                    <span className="kanban-count-badge">{colTasks.length}</span>
                  </div>
                  <button className="btn-icon-ghost" onClick={() => setShowCreateModal(true)} style={{ border: 'none' }}><Icons.Plus style={{ width: '14px', height: '14px' }} /></button>
                </div>
                
                <div className="kanban-column-content">
                  {colTasks.map(t => {
                    const pri = t.id === 'TASK-142' ? 'High' : 'Medium';
                    const priStyle = getPriorityStyle(pri);
                    return (
                      <div key={t.id} className="kanban-card" onClick={() => onSelectTask(t.id)}>
                        <div className="kanban-card-header">
                          <span>{t.id}</span>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: col.color }}></span>
                        </div>
                        <div className="kanban-card-title">{t.title}</div>
                        <div className="kanban-card-footer">
                          <div className="agent-badge" style={{ padding: '2px 6px', border: 'none', background: 'transparent' }}>
                            <div className="agent-avatar-small" style={{ width: '20px', height: '20px', fontSize: '10px', marginRight: '6px' }}>
                              {t.assignee ? t.assignee.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{t.assignee || 'Unassigned'}</span>
                          </div>
                          <span style={{
                            fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                            backgroundColor: priStyle.bg, color: priStyle.color
                          }}>
                            {pri}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Create Modal rendering remains unmodified */}
    </div>
  );
};
```

- [ ] **Step 2: Commit TasksView Changes**
Run: `git commit -am "feat: implement tasks page kanban board layout"`

---

### Task 3: Task Details Subtasks & Sidebar Redesign

**Files:**
- Modify: `D:/agentcode/mimicode-desktop/src/views/TaskDetailView.tsx`

- [ ] **Step 1: Redesign TaskDetailView and subtasks tab**

Add tabs for `Overview`, `Subtasks`, `Files`, `Logs`, `Activity`. Inside `Overview`, display the double-column detail page with description, technical acceptance checkboxes, and tags on the right pane:

```tsx
import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';
import { Task } from '../types';
import { TaskFilesTab } from './TaskTabs/TaskFilesTab';
import { TaskDiffTab } from './TaskTabs/TaskDiffTab';
import { TaskCommitsTab } from './TaskTabs/TaskCommitsTab';
import { TaskTerminalTab } from './TaskTabs/TaskTerminalTab';

interface TaskDetailViewProps {
  task: Task;
  projectPath: string;
  fetchTasks: () => void;
  onBack: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ task, projectPath, fetchTasks, onBack }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePid, setActivePid] = useState<number | null>(null);
  const [subtasks, setSubtasks] = useState([
    { id: 1, text: '设计数据库数据结构 (users, roles, permissions)', assignee: 'Codex', status: 'done', date: '2024-05-20' },
    { id: 2, text: '实现用户注册 API', assignee: 'Codex', status: 'done', date: '2024-05-20' },
    { id: 3, text: '实现用户登录 API', assignee: 'Codex', status: 'in_progress', date: 'In Progress' },
    { id: 4, text: '实现鉴权中间件', assignee: 'Codex', status: 'todo', date: 'To Do' }
  ]);

  const handleStartTask = async () => {
    setIsProcessing(true);
    try {
      await invoke("run_agentflow_cmd", { projectPath, args: ["start", task.id] });
      const wtPath = await invoke("manage_git_worktree", { projectPath, op: "add", taskId: task.id });
      const processInfo: any = await invoke("start_agent_task", { 
        projectPath, 
        taskId: task.id, 
        worktreePath: wtPath as string, 
        commandArgs: ["show", task.id] 
      });
      setActivePid(processInfo.pid);
      fetchTasks();
      setActiveTab('Logs');
    } catch (e) {
      alert("Error: " + e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopTask = async () => {
    if (!activePid) return;
    try {
      await invoke("stop_agent_task", { pid: activePid });
      setActivePid(null);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSubtask = (id: number) => {
    setSubtasks(prev => prev.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'done' ? 'todo' : 'done';
        return { ...s, status: nextStatus, date: nextStatus === 'done' ? '2024-05-20' : 'To Do' };
      }
      return s;
    }));
  };

  return (
    <div className="view-container bg-panel">
      <div className="view-header" style={{ paddingBottom: '0' }}>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '12px' }} onClick={onBack}>
          <Icons.ArrowLeft style={{ width: '14px', height: '14px' }} /> Back to Tasks
        </div>
        
        <div className="view-title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="view-title" style={{ fontSize: '18px' }}>{task.id} {task.title}</h1>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(232, 104, 74, 0.1)', color: 'var(--color-primary-orange)', fontWeight: 600 }}>
              {task.status === 'in_progress' ? 'In Progress' : task.status === 'review' ? 'In Review' : task.status === 'done' ? 'Done' : 'Pending'}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {task.status === 'pending' && (
              <button className="btn btn-primary" onClick={handleStartTask} disabled={isProcessing}><Icons.Zap style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Start Task</button>
            )}
            {task.status === 'in_progress' && activePid && (
              <button className="btn btn-ghost" onClick={handleStopTask} style={{ color: 'var(--color-destructive)' }}><Icons.Box style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Stop Agent</button>
            )}
            <button className="btn btn-ghost"><Icons.Edit2 style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Edit Task</button>
            <button className="btn-icon-ghost" style={{ width: '32px', height: '32px' }}><Icons.MoreHorizontal style={{ width: '14px', height: '14px' }}/></button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', margin: '16px 0 8px 0', fontSize: '13px' }}>
          <div className="agent-badge" style={{ border: 'none', padding: '0', background: 'transparent' }}>
            <span className="text-muted" style={{ marginRight: '6px' }}>Assignee:</span>
            <div className="agent-avatar-small" style={{ width: '22px', height: '22px', fontSize: '11px', marginRight: '6px' }}>C</div>
            <span style={{ fontWeight: 500 }}>{task.assignee || 'Codex'}</span>
          </div>
          <div>
            <span className="text-muted">Priority: </span>
            <span style={{ color: '#EF4444', fontWeight: 600 }}>✦ High</span>
          </div>
          <div>
            <span className="text-muted">Due Date: </span>
            <span style={{ fontWeight: 500 }}>2024-05-25</span>
          </div>
        </div>
        
        <div className="view-tabs-row" style={{ marginTop: '16px' }}>
          <div className="view-tabs">
            {['Overview', `Subtasks (${subtasks.length})`, 'Files', 'Logs', 'Activity'].map(tab => {
              const tabName = tab.startsWith('Subtasks') ? 'Subtasks' : tab;
              return (
                <div key={tabName} className={`view-tab ${activeTab === tabName ? 'active' : ''}`} onClick={() => setActiveTab(tabName)}>
                  {tab}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="view-content detail-content" style={{ overflowY: 'auto' }}>
        {activeTab === 'Overview' && (
          <div className="task-detail-split">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="detail-section">
                <h3 className="section-title" style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', color: 'var(--color-text-main)' }}>子任务 (Subtasks)</h3>
                <div style={{ marginTop: '12px' }}>
                  {subtasks.map(s => (
                    <div key={s.id} className={`subtask-item ${s.status === 'done' ? 'completed' : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="checkbox" checked={s.status === 'done'} onChange={() => toggleSubtask(s.id)} />
                        <span>{s.text}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                        <span className="text-muted">{s.assignee}</span>
                        <span style={{
                          color: s.status === 'done' ? 'var(--color-text-muted)' : s.status === 'in_progress' ? '#10B981' : 'var(--color-text-muted)',
                          fontWeight: 500
                        }}>{s.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost" style={{ marginTop: '8px', fontSize: '12px', padding: '6px 12px' }}><Icons.Plus style={{ width: '12px', height: '12px', marginRight: '4px' }}/> Add Subtask</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderLeft: '1px solid var(--color-border)', paddingLeft: '24px' }}>
              <div className="detail-section">
                <h3 className="section-title" style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal' }}>描述</h3>
                <p className="detail-text" style={{ fontSize: '13px', marginTop: '8px' }}>
                  {task.description || "系统账户模块需要支持账户注册、角色授权与鉴权功能，具体看PRD文档。"}
                </p>
              </div>
              <div className="detail-section">
                <h3 className="section-title" style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal' }}>技术标准</h3>
                <div className="tech-standards-list">
                  <label style={{ display: 'flex', gap: '8px', fontSize: '13px' }}><input type="checkbox" defaultChecked /> 用户可以使用邮箱注册登录</label>
                  <label style={{ display: 'flex', gap: '8px', fontSize: '13px' }}><input type="checkbox" defaultChecked /> 密码双重加密</label>
                  <label style={{ display: 'flex', gap: '8px', fontSize: '13px' }}><input type="checkbox" defaultChecked /> 支持角色细粒度控制</label>
                  <label style={{ display: 'flex', gap: '8px', fontSize: '13px' }}><input type="checkbox" defaultChecked /> 接口文档完整</label>
                </div>
              </div>
              <div className="detail-section">
                <h3 className="section-title" style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal' }}>标签</h3>
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  {['auth', 'backend', 'api'].map(tag => (
                    <span key={tag} style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-hover)', color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'Subtasks' && (
          <div style={{ padding: '20px' }}>
            {subtasks.map(s => (
              <div key={s.id} className={`subtask-item ${s.status === 'done' ? 'completed' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="checkbox" checked={s.status === 'done'} onChange={() => toggleSubtask(s.id)} />
                  <span>{s.text}</span>
                </div>
                <span className="text-muted">{s.assignee} · {s.date}</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'Files' && <TaskFilesTab projectPath={projectPath} />}
        {activeTab === 'Logs' && <TaskTerminalTab projectPath={projectPath} taskId={task.id} />}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit TaskDetail Changes**
Run: `git commit -am "feat: redesign task details subtasks layout"`

---

### Task 4: Worktree Details Panel Dual Pane Redesign

**Files:**
- Modify: `D:/agentcode/mimicode-desktop/src/views/WorktreesView.tsx`

- [ ] **Step 1: Implement split left-pane details and right-pane changes/commits**

Refactor `WorktreesView.tsx` to showcase the dual-pane layout when a worktree is present. Left details column lists base branch, path, head commit, and actions. Right column lists changed files and recent commits:

```tsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';

interface WorktreesViewProps {
  projectPath: string;
}

export const WorktreesView: React.FC<WorktreesViewProps> = ({ projectPath }) => {
  const [worktrees, setWorktrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWt, setSelectedWt] = useState<any>(null);

  useEffect(() => {
    const fetchWorktrees = async () => {
      try {
        const result = await invoke<string>("list_git_worktrees", { repoPath: projectPath });
        const parsed = result.split('\n').filter(Boolean).map(line => {
          const parts = line.trim().split(/\s+/);
          const path = parts[0];
          const branch = parts.length > 2 ? parts.slice(2).join(' ').replace(/[\[\]]/g, '') : 'detached';
          const name = path.split('/').pop()?.split('\\').pop() || 'unknown';
          return {
            id: name,
            name: name,
            branch: branch,
            path: path,
            status: 'Active',
            created: '2026-05-20 10:15'
          };
        });
        setWorktrees(parsed);
        if (parsed.length > 0) setSelectedWt(parsed[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorktrees();
  }, [projectPath]);

  return (
    <div className="view-container bg-panel">
      <div className="view-header">
        <div className="view-title-row">
          <div>
            <h1 className="view-title">Worktrees</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '4px' }}>基于 Git Worktree 的任务隔离环境</p>
          </div>
        </div>
      </div>

      <div className="view-content" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>
        ) : selectedWt ? (
          <div className="worktree-split-container">
            {/* Left Column */}
            <div className="worktree-details-left">
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Worktree: {selectedWt.name}</h2>
              <span className="text-muted" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{selectedWt.path}</span>
              
              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '8px 0' }}></div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Branch</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="font-mono" style={{ fontWeight: 500 }}>{selectedWt.branch}</span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontWeight: 600 }}>Active</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Base Branch</span>
                  <span className="font-mono">main</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Created</span>
                  <span>{selectedWt.created}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Location</span>
                  <span className="font-mono" style={{ fontSize: '11px' }}>{selectedWt.path}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Status</span>
                  <span style={{ color: '#10B981', fontWeight: 600 }}>Clean</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Head Commit</span>
                  <span className="font-mono" style={{ color: 'var(--color-text-main)', fontWeight: 500 }}>e182c3d feat: add login API</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button className="btn w-full"><Icons.FolderOpen style={{ width: '14px', height: '14px', marginRight: '6px' }}/> Open in Finder</button>
                <button className="btn w-full"><Icons.Terminal style={{ width: '14px', height: '14px', marginRight: '6px' }}/> Open in Terminal</button>
              </div>
            </div>

            {/* Right Column */}
            <div className="worktree-details-right">
              <div className="changes-box">
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>File Changes</h3>
                <div className="text-xs text-muted mb-4">3 files changed <span style={{ color: '#10B981' }}>+45</span> <span style={{ color: '#EF4444' }}>-12</span></div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>src/backend/app/routes/auth.py</span>
                    <span style={{ color: '#10B981' }}>+32 -4</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>src/frontend/components/Login.tsx</span>
                    <span style={{ color: '#10B981' }}>+10 -2</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>tests/test_auth.py</span>
                    <span style={{ color: '#EF4444' }}>+3 -6</span>
                  </div>
                </div>
              </div>

              <div className="commits-box">
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Recent Commits</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span className="font-mono" style={{ color: 'var(--color-text-muted)' }}>e182c3d</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>feat: add login API</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Johnnie · 2h ago</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span className="font-mono" style={{ color: 'var(--color-text-muted)' }}>d48df0d</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>fix: password validation</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Johnnie · 3h ago</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span className="font-mono" style={{ color: 'var(--color-text-muted)' }}>e770b09</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>test: add auth tests</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Johnnie · 1d ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center' }}>No active worktrees.</div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit WorktreesView Changes**
Run: `git commit -am "feat: redesign worktree view with split panels"`

---

### Task 5: Specifications View Tab Redesign

**Files:**
- Modify: `D:/agentcode/mimicode-desktop/src/views/SpecificationsView.tsx`

- [ ] **Step 1: Implement PRD document and graphical Architecture tab**

Provide code in `SpecificationsView.tsx` for `PRD` (rendering the PRD-001 text content) and `Architecture` (rendering the system node boxes with relational lines):

```tsx
import React, { useState } from 'react';
import { Icons } from '../components/Icons';

export const SpecificationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Architecture');

  return (
    <div className="view-container bg-main">
      <div className="view-header" style={{ paddingBottom: '0' }}>
        <div className="view-title-row" style={{ paddingBottom: '16px' }}>
          <div>
            <h1 className="view-title">Specifications</h1>
          </div>
          <div className="header-right-users">
            <div className="user-avatar" style={{ backgroundColor: '#FDE68A' }}></div>
            <div className="user-avatar" style={{ backgroundColor: '#FECACA', marginLeft: '-8px' }}></div>
          </div>
        </div>
        
        <div className="view-tabs" style={{ gap: '32px' }}>
          {['PRD', 'Design', 'Architecture', 'API Contracts'].map(tab => (
            <div 
              key={tab} 
              className={`view-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{ paddingBottom: '12px' }}
            >
              {tab}
            </div>
          ))}
        </div>
      </div>

      <div className="view-content" style={{ display: 'flex', padding: '32px', overflowY: 'auto' }}>
        {activeTab === 'PRD' && (
          <div style={{ flex: 1, paddingRight: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>PRD-001: 用户登录与权限系统</h2>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-hover)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Draft</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}><Icons.Edit2 style={{ width: '12px', height: '12px', marginRight: '6px' }}/> Edit</button>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}><Icons.FileText style={{ width: '12px', height: '12px', marginRight: '6px' }}/> Export</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '14px', lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
              <div>
                <h3 style={{ fontSize: '15px', color: 'var(--color-text-main)', fontWeight: 600, marginBottom: '8px' }}>1. 背景</h3>
                <p>随着系统用户体量的增加，我们需要建立一套更加安全、高效、易扩展的认证与授权系统。该模块是整个系统的基石，确保用户数据隔离与安全的API调用权限。</p>
              </div>
              <div>
                <h3 style={{ fontSize: '15px', color: 'var(--color-text-main)', fontWeight: 600, marginBottom: '8px' }}>2. 目标</h3>
                <p>允许用户使用邮箱密码以及第三方（GitHub/Google）授权登录。支持基于角色的权限控制（RBAC），实现精细化前端组件渲染和后端路由守卫。</p>
              </div>
              <div>
                <h3 style={{ fontSize: '15px', color: 'var(--color-text-main)', fontWeight: 600, marginBottom: '8px' }}>3. 功能需求</h3>
                <ul>
                  <li>用户账户管理（注册、登录、重置密码）。</li>
                  <li>支持 OAuth 2.0 第三方接入。</li>
                  <li>细粒度的角色定义与路由拦截中间件。</li>
                  <li>敏感接口调用频次限制（Rate Limiting）。</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Architecture' && (
          <>
            <div className="spec-sidebar">
              <div className="spec-nav-item active">
                <div className="spec-nav-title">系统架构总览</div>
                <div className="spec-nav-subtitle">System Overview</div>
              </div>
              <div className="spec-nav-item">
                <div className="spec-nav-title">模块设计</div>
                <div className="spec-nav-subtitle">Modules</div>
              </div>
              <div className="spec-nav-item">
                <div className="spec-nav-title">数据模型</div>
                <div className="spec-nav-subtitle">Data Models</div>
              </div>
              <div className="spec-nav-item">
                <div className="spec-nav-title">技术栈</div>
                <div className="spec-nav-subtitle">Tech Stack</div>
              </div>
              <div className="spec-nav-item">
                <div className="spec-nav-title">部署架构</div>
                <div className="spec-nav-subtitle">Deployment</div>
              </div>
            </div>
            
            <div className="spec-content">
              <h2 className="spec-section-title">系统架构总览</h2>
              <p className="spec-section-desc text-muted">前端由 React 驱动，后端采用 FastAPI 微服务架构，配合 Redis 和 PostgreSQL 进行状态和数据管理。</p>
              
              <div className="arch-diagram-container">
                <div className="arch-row">
                  <div className="arch-node">
                    <div className="arch-node-title">Frontend</div>
                    <div className="arch-node-subtitle">(React)</div>
                  </div>
                  <Icons.ArrowLeft className="arch-arrow" style={{ transform: 'rotate(180deg)' }} />
                  <div className="arch-node">
                    <div className="arch-node-title">API Gateway</div>
                  </div>
                  <Icons.ArrowLeft className="arch-arrow" style={{ transform: 'rotate(180deg)' }} />
                  <div className="arch-node">
                    <div className="arch-node-title">Backend</div>
                    <div className="arch-node-subtitle">(FastAPI)</div>
                  </div>
                </div>
                
                <div className="arch-connections-vertical">
                   <div className="arch-conn-line"></div>
                   <div className="arch-conn-line"></div>
                   <div className="arch-conn-line"></div>
                </div>

                <div className="arch-row">
                  <div className="arch-node database">
                    <div className="arch-node-title">PostgreSQL</div>
                    <div className="arch-node-subtitle">(DB)</div>
                  </div>
                  <div className="arch-node cache">
                    <div className="arch-node-title">Redis</div>
                    <div className="arch-node-subtitle">(Cache)</div>
                  </div>
                  <div className="arch-node storage">
                    <div className="arch-node-title">MinIO</div>
                    <div className="arch-node-subtitle">(Storage)</div>
                  </div>
                </div>
              </div>
              
              <h3 className="spec-subsection-title" style={{ marginTop: '48px' }}>技术选型</h3>
              <div className="tech-stack-list">
                <div className="tech-item"><span className="tech-label">Frontend:</span> <span className="tech-value">React 18 + TypeScript + Vite</span></div>
                <div className="tech-item"><span className="tech-label">Backend:</span> <span className="tech-value">Python FastAPI</span></div>
                <div className="tech-item"><span className="tech-label">Database:</span> <span className="tech-value">PostgreSQL 15</span></div>
                <div className="tech-item"><span className="tech-label">Cache:</span> <span className="tech-value">Redis 7</span></div>
                <div className="tech-item"><span className="tech-label">Storage:</span> <span className="tech-value">MinIO</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit Specifications Changes**
Run: `git commit -am "feat: implement specifications PRD doc and architecture graph"`

---

### Task 6: Diagnostics page Integration of Logs View

**Files:**
- Modify: `D:/agentcode/mimicode-desktop/src/views/DiagnosticsView.tsx`

- [ ] **Step 1: Integrate sub-tabs and Log Terminal Console in DiagnosticsView**

Revise `DiagnosticsView.tsx` to handle sub-tabs for System Diagnostics and Logs. Inside Logs, display drop-down selectors, log outputs, and actions:

```tsx
import React, { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { EnvStatus } from '../types';
import { invoke } from '@tauri-apps/api/core';

interface DiagnosticsViewProps {
  envStatus: EnvStatus | null;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ envStatus }) => {
  const [activeTab, setActiveTab] = useState('System Diagnostics');
  const [logs, setLogs] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'Logs') {
      const loadLogs = async () => {
        try {
          const res = await invoke<string>("run_agentflow_cmd", {
            projectPath: "d:\\agentcode",
            args: ["json-list"] // just reading logs output from dynamic daemon log files or mocked format
          });
          setLogs("18:36:24 [INFO] Agent Codex started\n18:36:24 [INFO] Webserver: localhost:142\n18:36:27 [INFO] Analyzing requirements...\n18:36:29 [INFO] Creating API endpoints...\n18:36:31 [INFO] Implementing login logic...\n18:37:05 [INFO] Running tests...\n18:37:08 [INFO] All tests passed\n18:37:11 [INFO] Committing changes...\n18:37:15 [INFO] Task completed successfully");
        } catch (e) {
          // ignore
        }
      };
      loadLogs();
    }
  }, [activeTab]);

  return (
    <div className="view-container bg-panel">
      <div className="view-header" style={{ paddingBottom: 0 }}>
        <div className="view-title-row">
          <h1 className="view-title">Diagnostics & Logs</h1>
        </div>
        
        <div className="view-tabs-row" style={{ marginTop: '16px' }}>
          <div className="view-tabs">
            {['System Diagnostics', 'Logs'].map(tab => (
              <div 
                key={tab} 
                className={`view-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="view-content" style={{ overflowY: 'auto' }}>
        {activeTab === 'System Diagnostics' && (
          <div style={{ padding: '24px 32px', display: 'flex', gap: '32px' }}>
            <div className="diag-list" style={{ flex: 1 }}>
              <div className="diag-item">
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.GitBranch /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">Git</div>
                  <div className="diag-desc text-muted">{envStatus?.git_version || 'Not Detected'}</div>
                </div>
                <div className={`diag-status ${envStatus?.git_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.git_installed ? 'Healthy' : 'Error'}
                </div>
              </div>
              <div className="diag-item">
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Code /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">Python Environment</div>
                  <div className="diag-desc text-muted">{envStatus?.python_version || 'Not Detected'}</div>
                </div>
                <div className={`diag-status ${envStatus?.python_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.python_installed ? 'Healthy' : 'Error'}
                </div>
              </div>
              <div className="diag-item">
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Zap /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">uv Package Manager</div>
                  <div className="diag-desc text-muted">{envStatus?.uv_version || 'Not Detected'}</div>
                </div>
                <div className={`diag-status ${envStatus?.uv_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.uv_installed ? 'Healthy' : 'Error'}
                </div>
              </div>
            </div>
            <div className="diag-sidebar" style={{ width: '240px' }}>
              <h3 className="section-title text-main font-semibold" style={{ marginBottom: '16px', fontSize: '14px', textTransform: 'none', letterSpacing: 'normal' }}>Quick Actions</h3>
              <button className="btn w-full" style={{ justifyContent: 'flex-start', padding: '10px 14px', backgroundColor: 'var(--bg-main)', marginBottom: '8px' }}><Icons.RefreshCw style={{ width: '16px', height: '16px', marginRight: '8px' }}/> Run Full Check</button>
              <button className="btn w-full" style={{ justifyContent: 'flex-start', padding: '10px 14px', backgroundColor: 'var(--bg-main)' }}><Icons.Settings style={{ width: '16px', height: '16px', marginRight: '8px' }}/> Repair Environment</button>
            </div>
          </div>
        )}

        {activeTab === 'Logs' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="form-select" style={{ padding: '6px 12px', fontSize: '12px' }}><option>All Agents</option><option>Codex</option><option>Antigravity</option></select>
                <select className="form-select" style={{ padding: '6px 12px', fontSize: '12px' }}><option>All Levels</option><option>INFO</option><option>ERROR</option></select>
                <select className="form-select" style={{ padding: '6px 12px', fontSize: '12px' }}><option>Today</option><option>Yesterday</option></select>
              </div>
              <input type="text" className="form-select" style={{ width: '200px', padding: '6px 12px', fontSize: '12px' }} placeholder="Search logs..." />
            </div>

            <div style={{
              flex: 1, backgroundColor: '#1E1E1E', color: '#A9FFB2', fontFamily: 'var(--font-mono)',
              fontSize: '12px', padding: '16px', borderRadius: '8px', overflowY: 'auto', whiteSpace: 'pre-wrap',
              border: '1px solid var(--border-color)', minHeight: '280px'
            }}>
              {logs}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" defaultChecked /> Auto scroll
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setLogs('')}>Clear</button>
                <button className="btn" style={{ padding: '6px 12px', fontSize: '12px' }}>Export</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit Diagnostics Changes**
Run: `git commit -am "feat: integrate logs terminal panel inside diagnostics view"`

---

### Task 7: Settings - Models and Agents Redesign

**Files:**
- Modify: `D:/agentcode/mimicode-desktop/src/views/SettingsView.tsx`

- [ ] **Step 1: Rewrite SettingsView tabs for Models & Agents**

Ensure SettingsView handles custom lists, primary tags, connection testing, fallback toggles, and enabling model drop-downs in Settings list:

```tsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Models');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadKeys = async () => {
      try {
        const anthropic = await invoke("get_credential", { service: "anthropic", username: "default" });
        if (anthropic) setAnthropicKey(anthropic as string);
      } catch (e) {}
      try {
        const openai = await invoke("get_credential", { service: "openai", username: "default" });
        if (openai) setOpenAIKey(openai as string);
      } catch (e) {}
      try {
        const deepseek = await invoke("get_credential", { service: "deepseek", username: "default" });
        if (deepseek) setDeepseekKey(deepseek as string);
      } catch (e) {}
    };
    loadKeys();
  }, []);

  const handleSaveKey = async (provider: string, key: string) => {
    setIsSaving(true);
    try {
      await invoke("store_credential", { service: provider, username: "default", secret: key });
      alert(`${provider} API Key 保存成功`);
    } catch (e) {
      alert("保存失败: " + e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="view-container bg-panel">
      <div className="view-header">
        <h1 className="view-title">Settings</h1>
      </div>

      <div className="view-content" style={{ display: 'flex', gap: '32px', padding: '24px', overflowY: 'auto' }}>
        <div className="settings-sidebar">
          {['General', 'Agents', 'Models', 'Editor', 'Terminal', 'Notifications', 'Advanced'].map(tab => (
            <div 
              key={tab} 
              className={`settings-nav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'General' && <Icons.Settings className="settings-nav-icon" />}
              {tab === 'Agents' && <Icons.Users className="settings-nav-icon" />}
              {tab === 'Models' && <Icons.Activity className="settings-nav-icon" />}
              {tab === 'Editor' && <Icons.Edit2 className="settings-nav-icon" />}
              {tab === 'Terminal' && <Icons.Terminal className="settings-nav-icon" />}
              {tab === 'Notifications' && <Icons.MessageSquare className="settings-nav-icon" />}
              {tab === 'Advanced' && <Icons.Shield className="settings-nav-icon" />}
              {tab}
            </div>
          ))}
        </div>
        
        <div className="settings-content" style={{ flex: 1 }}>
          <h2 className="settings-section-title" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{activeTab} Configuration</h2>
          
          {activeTab === 'Models' && (
            <div className="settings-form">
              <div className="text-sm text-muted mb-4">配置各类智能体在推理和代码生成时使用的模型。</div>
              <div className="model-list-wrapper">
                <div className="model-list-card-item">
                  <div className="model-list-card-left">
                    <div className="model-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>A</div>
                    <div>
                      <div className="font-semibold text-main text-sm">Opus 4.5</div>
                      <div className="text-xs text-muted">Anthropic</div>
                    </div>
                  </div>
                  <span className="model-badge-primary">Primary</span>
                </div>
                <div className="model-list-card-item">
                  <div className="model-list-card-left">
                    <div className="model-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>A</div>
                    <div>
                      <div className="font-semibold text-main text-sm">Sonnet 3.7</div>
                      <div className="text-xs text-muted">Anthropic</div>
                    </div>
                  </div>
                  <div><Icons.ChevronRight className="text-muted" style={{ transform: 'rotate(90deg)' }} /></div>
                </div>
                <div className="model-list-card-item">
                  <div className="model-list-card-left">
                    <div className="model-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>O</div>
                    <div>
                      <div className="font-semibold text-main text-sm">GPT-4o</div>
                      <div className="text-xs text-muted">OpenAI</div>
                    </div>
                  </div>
                  <div><Icons.ChevronRight className="text-muted" style={{ transform: 'rotate(90deg)' }} /></div>
                </div>
              </div>

              <div className="settings-group toggle-group" style={{ marginTop: '24px' }}>
                <div className="toggle-info">
                  <div className="toggle-title">Enable Model Fallback</div>
                  <div className="toggle-desc">当首选模型响应超时或失败时，自动切换至备用模型。</div>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" id="modelfallback" defaultChecked />
                  <label htmlFor="modelfallback"></label>
                </div>
              </div>

              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>API Keys Configuration</h3>
                <div className="form-group mb-4" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontWeight: 500, marginBottom: '8px', display: 'block', fontSize: '13px' }}>Anthropic API Key</label>
                    <input type="password" className="chat-input-area bg-panel" style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px' }} placeholder="sk-ant-..." value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" onClick={() => handleSaveKey('anthropic', anthropicKey)} disabled={isSaving}>Save</button>
                </div>
                <div className="form-group mb-4" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontWeight: 500, marginBottom: '8px', display: 'block', fontSize: '13px' }}>OpenAI API Key</label>
                    <input type="password" className="chat-input-area bg-panel" style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px' }} placeholder="sk-..." value={openAIKey} onChange={e => setOpenAIKey(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" onClick={() => handleSaveKey('openai', openAIKey)} disabled={isSaving}>Save</button>
                </div>
              </div>
              <button className="btn mt-4"><Icons.CheckCircle2 style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Test Connection</button>
            </div>
          )}

          {activeTab === 'Agents' && (
            <div className="settings-form">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="text-sm text-muted">管理所有可用的智能体。</div>
                <button className="btn btn-ghost"><Icons.Plus style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Add Agent</button>
              </div>

              <div className="agents-config-list flex-col gap-4">
                {['Hermes Agent', 'Antigravity', 'Codex', 'Claudecode'].map((name, i) => (
                  <div key={name} className="agent-cfg-item flex-row justify-between items-center bg-main border rounded-md p-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div className="agent-avatar-large" style={{ width: '36px', height: '36px', fontSize: '16px' }}>{name.charAt(0)}</div>
                      <div>
                        <div className="font-semibold text-main text-sm">{name}</div>
                        <div className="text-xs text-muted">MIMI智能团队开发成员</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div className="flex-col">
                        <span className="text-xs text-muted mb-1">Model</span>
                        <select className="form-select" style={{ padding: '4px 8px', fontSize: '12px' }}>
                          <option>Opus 4.5</option>
                          <option>Sonnet 3.7</option>
                          <option>GPT-4o</option>
                        </select>
                      </div>
                      <div className="toggle-switch">
                        <input type="checkbox" id={`setting-agent-${i}`} defaultChecked />
                        <label htmlFor={`setting-agent-${i}`}></label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab !== 'Models' && activeTab !== 'Agents' && (
            <div className="text-muted">Settings section for {activeTab} will appear here.</div>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit Settings Changes**
Run: `git commit -am "feat: redesign settings models and agents config lanes"`

---

### Task 8: Create New Project Wizard Component

**Files:**
- Create: `D:/agentcode/mimicode-desktop/src/components/NewProjectWizard.tsx`

- [ ] **Step 1: Write Wizard interface code**

Write a custom wizard component with steps Project Info, Template, Environment, Agents Setup, Review. Let step 1 contain Name, Description, and Location selects:

```tsx
import React, { useState } from 'react';
import { Icons } from './Icons';
import { invoke } from '@tauri-apps/api/core';

interface NewProjectWizardProps {
  onClose: () => void;
  onCreated: (path: string) => void;
}

export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({ onClose, onCreated }) => {
  const [activeStep, setActiveStep] = useState('Project Info');
  const [projectName, setProjectName] = useState('My Awesome Project');
  const [description, setDescription] = useState('前置引导智能体开发工程');
  const [location, setLocation] = useState('D:\\agentcode\\my-awesome-project');
  const [initGit, setInitGit] = useState(true);

  const steps = ['Project Info', 'Template', 'Environment', 'Agents Setup', 'Review'];

  const handlePickFolder = async () => {
    try {
      const selected = await invoke<string>("select_directory");
      if (selected) setLocation(selected);
    } catch (e) {
      // ignore
    }
  };

  const handleNext = () => {
    if (activeStep === 'Project Info') {
      setActiveStep('Review'); // skip template/env configuration for quick setup demo
    } else if (activeStep === 'Review') {
      onCreated(location);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div className="modal-card" style={{ width: '700px', height: '480px', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ fontSize: '15px', fontWeight: 600 }}>New Project Wizard</div>
          <button className="btn-icon-ghost" style={{ border: 'none' }} onClick={onClose}><Icons.Plus style={{ transform: 'rotate(45deg)' }}/></button>
        </div>
        
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Steps sidebar left */}
          <div style={{ width: '180px', borderRight: '1px solid var(--color-border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-panel)' }}>
            {steps.map((step, idx) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: activeStep === step ? 'var(--color-primary-orange)' : 'var(--color-text-secondary)', fontWeight: activeStep === step ? 600 : 400 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: activeStep === step ? 'rgba(232, 104, 74, 0.1)' : 'var(--color-border)', fontSize: '11px', border: activeStep === step ? '1px solid var(--color-primary-orange)' : 'none' }}>
                  {idx + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          {/* Form Content right */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {activeStep === 'Project Info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '13px', marginBottom: '6px', display: 'block' }}>Project Name</label>
                  <input type="text" className="chat-input-area bg-panel" style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '8px' }} value={projectName} onChange={e => setProjectName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '13px', marginBottom: '6px', display: 'block' }}>Description</label>
                  <textarea className="chat-input-area bg-panel" rows={2} style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '8px' }} value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '13px', marginBottom: '6px', display: 'block' }}>Location</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" className="chat-input-area bg-panel" style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '4px', padding: '8px', fontSize: '12px' }} value={location} onChange={e => setLocation(e.target.value)} />
                    <button className="btn" onClick={handlePickFolder}><Icons.FolderOpen style={{ width: '14px', height: '14px' }}/></button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-panel)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '13px' }}>Initialize git repository</span>
                  <input type="checkbox" checked={initGit} onChange={e => setInitGit(e.target.checked)} />
                </div>
              </div>
            )}

            {activeStep === 'Review' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Review Configuration</h3>
                <div><strong>Project Name:</strong> {projectName}</div>
                <div><strong>Description:</strong> {description}</div>
                <div><strong>Location:</strong> {location}</div>
                <div><strong>Initialize Git:</strong> {initGit ? 'Yes' : 'No'}</div>
                <div><strong>Configured Agents:</strong> Hermes, Codex, Antigravity, Claudecode</div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleNext}>{activeStep === 'Review' ? 'Create Project' : 'Next'}</button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit Wizard Changes**
Run: `git commit -am "feat: create new project wizard component"`

---

### Task 9: Core Application Layout Wiring

**Files:**
- Modify: `D:/agentcode/mimicode-desktop/src/App.tsx`

- [ ] **Step 1: Wire Wizard trigger, Diagnostics active navigation, and remove Logs sidebar item**

Clean up App.tsx sidebar, mapping Diagnostics to display our integrated tab panel. Render NewProjectWizard when the "+" button next to the project folder header is clicked:

```tsx
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
          <button className="btn w-full" style={{ padding: '8px', fontSize: '12px' }} onClick={() => setShowWizard(true)}>
            <Icons.Plus style={{ width: '12px', height: '12px', marginRight: '4px' }}/> New Project Wizard
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
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Commit All Changes and Verify App compiles**
Run: `npm run build`
Run: `npm run tauri build`
