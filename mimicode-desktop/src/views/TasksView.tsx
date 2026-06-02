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
    if (!newTaskTitle.trim()) {
      alert("请输入任务标题");
      return;
    }
    setIsCreating(true);
    try {
      const args = ["add", "--title", newTaskTitle, "--assignee", newTaskAssignee];
      if (newTaskDesc.trim()) {
        args.push("--desc", newTaskDesc);
      }
      
      await invoke("run_agentflow_cmd", {
        projectPath,
        args
      });
      
      setShowCreateModal(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      fetchTasks();
    } catch (err: any) {
      alert("创建任务失败: " + err.toString());
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

      {showCreateModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false) }}>
          <div className="modal-card" style={{ width: '500px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ fontSize: '16px', fontWeight: 600 }}>Create New Task</div>
              <button className="btn-icon-ghost" onClick={() => setShowCreateModal(false)}><Icons.Plus style={{ transform: 'rotate(45deg)' }}/></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              
              <div className="form-group mb-4">
                <label className="form-label" style={{ fontWeight: 500, marginBottom: '8px', display: 'block' }}>任务标题 <span style={{ color: 'var(--color-destructive)' }}>*</span></label>
                <input 
                  type="text" 
                  className="chat-input-area bg-panel" 
                  style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px' }}
                  placeholder="例如：实现登录功能"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label" style={{ fontWeight: 500, marginBottom: '8px', display: 'block' }}>分配给 <span style={{ color: 'var(--color-destructive)' }}>*</span></label>
                <select 
                  className="chat-input-area bg-panel" 
                  style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px' }}
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                >
                  <option value="antigravity">Antigravity (前端专家)</option>
                  <option value="codex">Codex (后端专家)</option>
                  <option value="user">User (我来处理)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 500, marginBottom: '8px', display: 'block' }}>详细描述 (可选)</label>
                <textarea 
                  className="chat-input-area bg-panel" 
                  rows={4} 
                  placeholder="请输入任务详细需求和规范..."
                  style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px' }}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                ></textarea>
              </div>

            </div>
            <div className="modal-footer" style={{ justifyContent: 'flex-end', padding: '16px 24px', gap: '12px', borderTop: '1px solid var(--color-border)' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)} disabled={isCreating}>取消</button>
              <button className="btn btn-primary" onClick={handleCreateTask} disabled={isCreating || !newTaskTitle.trim()}>
                {isCreating ? "创建中..." : "确认创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
