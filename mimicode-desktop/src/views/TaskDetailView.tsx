import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

interface ParsedSubtask {
  id: number;
  text: string;
  done: boolean;
}

/** Parse `- [ ]` and `- [x]` items from a description string */
function parseSubtasks(description: string): ParsedSubtask[] {
  const lines = description.split('\n');
  const results: ParsedSubtask[] = [];
  let idx = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    const unchecked = trimmed.match(/^- \[ \]\s+(.+)$/);
    const checked = trimmed.match(/^- \[x\]\s+(.+)$/i);
    if (unchecked) {
      results.push({ id: idx++, text: unchecked[1], done: false });
    } else if (checked) {
      results.push({ id: idx++, text: checked[1], done: true });
    }
  }
  return results;
}

/** Rebuild the description string after toggling a subtask */
function rebuildDescription(description: string, subtaskIndex: number, newDone: boolean): string {
  const lines = description.split('\n');
  let idx = 0;
  return lines.map(line => {
    const trimmed = line.trim();
    const isUnchecked = /^- \[ \]\s+.+$/.test(trimmed);
    const isChecked = /^- \[x\]\s+.+$/i.test(trimmed);
    if (isUnchecked || isChecked) {
      if (idx === subtaskIndex) {
        idx++;
        const text = trimmed.replace(/^- \[[ xX]\]\s+/, '');
        return newDone ? `- [x] ${text}` : `- [ ] ${text}`;
      }
      idx++;
    }
    return line;
  }).join('\n');
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ task, projectPath, fetchTasks, onBack }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePid, setActivePid] = useState<number | null>(null);

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Add subtask state
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isSavingSubtask, setIsSavingSubtask] = useState(false);

  // Activity log state
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Parse subtasks from the task description
  const subtasks = useMemo(() => parseSubtasks(task.description || ''), [task.description]);

  // Dynamic metadata
  const priority = task.priority || 'Medium';
  const dueDate = task.due_date || '—';
  const tags: string[] = task.tags || [];

  const getPriorityStyle = (p: string) => {
    if (p === 'High') return { color: '#EF4444', symbol: '✦' };
    if (p === 'Low') return { color: '#3B82F6', symbol: '○' };
    return { color: '#F59E0B', symbol: '◆' };
  };
  const priStyle = getPriorityStyle(priority);

  // Reset edit fields when task changes
  useEffect(() => {
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setIsEditing(false);
  }, [task.id, task.title, task.description]);

  // Load activity when tab is active
  useEffect(() => {
    if (activeTab !== 'Activity') return;
    setActivityLoading(true);
    const loadActivity = async () => {
      try {
        const content = await invoke<string>('read_task_log', { projectPath, taskId: task.id });
        const lines = content.split('\n').filter(Boolean);
        // Show the most recent 50 lines
        setActivityLog(lines.slice(-50));
      } catch {
        setActivityLog([]);
      } finally {
        setActivityLoading(false);
      }
    };
    loadActivity();
  }, [activeTab, projectPath, task.id]);

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

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      await invoke('run_agentflow_cmd', {
        projectPath,
        args: ['edit', task.id, '--title', editTitle, '--desc', editDesc]
      });
      setIsEditing(false);
      fetchTasks();
    } catch (e: any) {
      alert('Failed to save: ' + e.toString());
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setIsEditing(false);
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskText.trim()) return;
    setIsSavingSubtask(true);
    try {
      const currentDesc = task.description || '';
      const newDesc = currentDesc.trim()
        ? currentDesc + '\n- [ ] ' + newSubtaskText.trim()
        : '- [ ] ' + newSubtaskText.trim();
      await invoke('run_agentflow_cmd', {
        projectPath,
        args: ['edit', task.id, '--desc', newDesc]
      });
      setNewSubtaskText('');
      setShowAddSubtask(false);
      fetchTasks();
    } catch (e: any) {
      alert('Failed to add subtask: ' + e.toString());
    } finally {
      setIsSavingSubtask(false);
    }
  };

  const handleToggleSubtask = useCallback(async (subtaskIndex: number, currentDone: boolean) => {
    try {
      const newDesc = rebuildDescription(task.description || '', subtaskIndex, !currentDone);
      await invoke('run_agentflow_cmd', {
        projectPath,
        args: ['edit', task.id, '--desc', newDesc]
      });
      fetchTasks();
    } catch (e: any) {
      alert('Failed to toggle subtask: ' + e.toString());
    }
  }, [task.description, task.id, projectPath, fetchTasks]);

  return (
    <div className="view-container bg-panel">
      <div className="view-header" style={{ paddingBottom: '0' }}>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '12px' }} onClick={onBack}>
          <Icons.ArrowLeft style={{ width: '14px', height: '14px' }} /> Back to Tasks
        </div>
        
        <div className="view-title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            {isEditing ? (
              <input
                type="text"
                className="chat-input-area bg-panel"
                style={{ flex: 1, fontSize: '18px', fontWeight: 700, border: '1px solid var(--color-border)', borderRadius: '4px', padding: '4px 8px' }}
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
              />
            ) : (
              <h1 className="view-title" style={{ fontSize: '18px' }}>{task.id} {task.title}</h1>
            )}
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
            {isEditing ? (
              <>
                <button className="btn btn-primary" onClick={handleSaveEdit} disabled={isSavingEdit}>
                  <Icons.Check style={{ width: '14px', height: '14px', marginRight: '4px' }}/> {isSavingEdit ? 'Saving...' : 'Save'}
                </button>
                <button className="btn btn-ghost" onClick={handleCancelEdit} disabled={isSavingEdit}>Cancel</button>
              </>
            ) : (
              <button className="btn btn-ghost" onClick={() => setIsEditing(true)}><Icons.Edit2 style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Edit Task</button>
            )}
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
            <span style={{ color: priStyle.color, fontWeight: 600 }}>{priStyle.symbol} {priority}</span>
          </div>
          <div>
            <span className="text-muted">Due Date: </span>
            <span style={{ fontWeight: 500 }}>{dueDate}</span>
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
                  {subtasks.length === 0 ? (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '12px 0' }}>
                      No subtasks found. Add subtasks by including <code style={{ backgroundColor: 'var(--bg-hover)', padding: '1px 4px', borderRadius: '3px' }}>- [ ] item</code> lines in the task description, or click "Add Subtask" below.
                    </div>
                  ) : (
                    subtasks.map(s => (
                      <div key={s.id} className={`subtask-item ${s.done ? 'completed' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input type="checkbox" checked={s.done} onChange={() => handleToggleSubtask(s.id, s.done)} />
                          <span>{s.text}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                          <span style={{
                            color: s.done ? 'var(--color-text-muted)' : '#10B981',
                            fontWeight: 500
                          }}>{s.done ? 'Done' : 'To Do'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {showAddSubtask ? (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="chat-input-area bg-panel"
                      style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '4px', padding: '6px 10px', fontSize: '12px' }}
                      placeholder="Enter subtask description..."
                      value={newSubtaskText}
                      onChange={e => setNewSubtaskText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask(); if (e.key === 'Escape') { setShowAddSubtask(false); setNewSubtaskText(''); } }}
                      autoFocus
                      disabled={isSavingSubtask}
                    />
                    <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={handleAddSubtask} disabled={isSavingSubtask || !newSubtaskText.trim()}>
                      {isSavingSubtask ? '...' : 'Add'}
                    </button>
                    <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => { setShowAddSubtask(false); setNewSubtaskText(''); }} disabled={isSavingSubtask}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-ghost" style={{ marginTop: '8px', fontSize: '12px', padding: '6px 12px' }} onClick={() => setShowAddSubtask(true)}>
                    <Icons.Plus style={{ width: '12px', height: '12px', marginRight: '4px' }}/> Add Subtask
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', borderLeft: '1px solid var(--color-border)', paddingLeft: '24px' }}>
              <div className="detail-section">
                <h3 className="section-title" style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal' }}>描述</h3>
                {isEditing ? (
                  <textarea
                    className="chat-input-area bg-panel"
                    rows={6}
                    style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '8px', fontSize: '13px', marginTop: '8px' }}
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                  />
                ) : (
                  <p className="detail-text" style={{ fontSize: '13px', marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                    {task.description || '(No description provided)'}
                  </p>
                )}
              </div>
              <div className="detail-section">
                <h3 className="section-title" style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal' }}>标签</h3>
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {tags.length > 0 ? tags.map(tag => (
                    <span key={tag} style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-hover)', color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500 }}>
                      {tag}
                    </span>
                  )) : (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>No tags</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'Subtasks' && (
          <div style={{ padding: '20px' }}>
            {subtasks.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                No subtasks found. Add <code>- [ ] item</code> lines to the task description to create subtasks.
              </div>
            ) : (
              subtasks.map(s => (
                <div key={s.id} className={`subtask-item ${s.done ? 'completed' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="checkbox" checked={s.done} onChange={() => handleToggleSubtask(s.id, s.done)} />
                    <span>{s.text}</span>
                  </div>
                  <span className="text-muted">{s.done ? 'Done' : 'To Do'}</span>
                </div>
              ))
            )}
          </div>
        )}
        {activeTab === 'Files' && <TaskFilesTab projectPath={projectPath} />}
        {activeTab === 'Logs' && <TaskTerminalTab projectPath={projectPath} taskId={task.id} />}
        {activeTab === 'Activity' && (
          <div style={{ padding: '20px', fontSize: '13px' }}>
            {activityLoading ? (
              <div style={{ color: 'var(--color-text-muted)' }}>Loading activity log...</div>
            ) : activityLog.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activityLog.map((line, i) => (
                  <div key={i} className="font-mono" style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)', padding: '2px 0' }}>
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--color-text-muted)' }}>
                No recent activity on this task.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
