import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from './Icons';
import { useAppContext } from '../context/AppContext';

export const NewTaskModal: React.FC = () => {
  const { showNewTaskModal, setShowNewTaskModal, projectPath, fetchTasks } = useAppContext();

  if (!showNewTaskModal) return null;

  return (
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
  );
};
