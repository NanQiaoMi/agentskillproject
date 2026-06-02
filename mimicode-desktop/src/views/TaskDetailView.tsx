import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';
import { Task } from '../types';
import { TaskFilesTab } from './TaskTabs/TaskFilesTab';
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
    } catch (e: any) {
      alert("Error starting task: " + e.toString());
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

  const handleSubmitTask = async () => {
    setIsProcessing(true);
    try {
      await invoke("run_agentflow_cmd", { projectPath, args: ["submit", task.id] });
      fetchTasks();
    } catch (e: any) {
      alert("Error submitting task: " + e.toString());
    } finally {
      setIsProcessing(false);
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
            {task.status === 'in_progress' && (
              <button className="btn btn-primary" onClick={handleSubmitTask} disabled={isProcessing}><Icons.Check style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Submit for Review</button>
            )}
            <button className="btn btn-ghost"><Icons.Edit2 style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Edit Task</button>
            <button className="btn-icon-ghost" style={{ width: '32px', height: '32px' }}><Icons.MoreHorizontal style={{ width: '14px', height: '14px' }}/></button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', margin: '16px 0 8px 0', fontSize: '13px' }}>
          <div className="agent-badge" style={{ border: 'none', padding: '0', background: 'transparent' }}>
            <span className="text-muted" style={{ marginRight: '6px' }}>Assignee:</span>
            <div className="agent-avatar-small" style={{ width: '22px', height: '22px', fontSize: '11px', marginRight: '6px' }}>
              {task.assignee ? task.assignee.charAt(0).toUpperCase() : 'C'}
            </div>
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
                  <label style={{ display: 'flex', gap: '8px', fontSize: '13px' }}><input type="checkbox" defaultChecked readOnly /> 用户可以使用邮箱注册登录</label>
                  <label style={{ display: 'flex', gap: '8px', fontSize: '13px' }}><input type="checkbox" defaultChecked readOnly /> 密码双重加密</label>
                  <label style={{ display: 'flex', gap: '8px', fontSize: '13px' }}><input type="checkbox" defaultChecked readOnly /> 支持角色细粒度控制</label>
                  <label style={{ display: 'flex', gap: '8px', fontSize: '13px' }}><input type="checkbox" defaultChecked readOnly /> 接口文档完整</label>
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
        {activeTab === 'Activity' && (
          <div style={{ padding: '20px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            No recent activity on this task.
          </div>
        )}
      </div>
    </div>
  );
};
