import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '../components/Icons';
import { Task } from '../types';
import { dispatchAppNotification } from '../components/NotificationsPanel';
import { useAgentCmd } from '../hooks/useAgentCmd';
import { KanbanBoard } from '../components/kanban/KanbanBoard';

interface TasksViewProps {
  tasks: Task[];
  fetchTasks: () => void;
  onSelectTask: (taskId: string) => void;
}

const translations = {
  English: {
    tasksBoard: 'Tasks Board',
    filter: 'Filter',
    groupStatus: 'Group: Status',
    groupAssignee: 'Group: Assignee',
    newTask: 'New Task',
    todo: 'Todo',
    inProgress: 'In Progress',
    inReview: 'In Review',
    done: 'Done'
  },
  '简体中文': {
    tasksBoard: '任务看板',
    filter: '筛选',
    groupStatus: '分组: 状态',
    groupAssignee: '分组: 负责人',
    newTask: '新建任务',
    todo: '待处理',
    inProgress: '进行中',
    inReview: '审查中',
    done: '已完成'
  }
};

export const TasksView: React.FC<TasksViewProps> = ({ tasks, fetchTasks, onSelectTask }) => {
  const { runCmd } = useAgentCmd();

  // Task Creation states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreateModalClosing, setIsCreateModalClosing] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('antigravity');
  const [isCreating, setIsCreating] = useState(false);

  const handleCloseCreateModal = () => {
    setIsCreateModalClosing(true);
    setTimeout(() => { setShowCreateModal(false); setIsCreateModalClosing(false); }, 200);
  };

  // Task Editing states
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditModalClosing, setIsEditModalClosing] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskConfirmId, setDeleteTaskConfirmId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskAssignee, setEditTaskAssignee] = useState('antigravity');
  const [editTaskStatus, setEditTaskStatus] = useState('todo');
  const [isSaving, setIsSaving] = useState(false);

  const handleCloseEditModal = () => {
    setIsEditModalClosing(true);
    setTimeout(() => { setShowEditModal(false); setEditingTask(null); setIsEditModalClosing(false); }, 200);
  };

  // Filter & Search states
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');

  // Group state: 'status' | 'assignee'
  const [groupBy, setGroupBy] = useState<'status' | 'assignee'>('status');

  // Language setup
  const lsGet = (key: string, def: string) => {
    const val = localStorage.getItem(key);
    return val ? val : def;
  };
  const [language, setLanguage] = useState(() => lsGet('mimi-language', '简体中文'));
  const t = useMemo(() => translations[language as keyof typeof translations] || translations['English'], [language]);

  useEffect(() => {
    const handleLang = (e: any) => setLanguage(e.detail);
    window.addEventListener('mimi-language-changed', handleLang);
    return () => window.removeEventListener('mimi-language-changed', handleLang);
  }, []);

  // Automatically sync tasks on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  const columns = [
    { key: 'todo', title: t.todo, color: '#6B7280' },
    { key: 'in_progress', title: t.inProgress, color: '#E8684A' },
    { key: 'review', title: t.inReview, color: '#F59E0B' },
    { key: 'done', title: t.done, color: '#10B981' }
  ];

  const assigneeColumns = [
    { key: 'antigravity', title: 'Antigravity (前端)', color: '#3B82F6' },
    { key: 'codex', title: 'Codex (后端)', color: '#10B981' },
    { key: 'hermes', title: 'Hermes (规划)', color: '#EF4444' },
    { key: 'opencode', title: 'OpenCode (重构)', color: '#8B5CF6' },
    { key: 'claudecode', title: 'Claude Code (审计)', color: '#F59E0B' },
    { key: 'user', title: 'User (用户/未分配)', color: '#6B7280' }
  ];

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      alert("请输入任务标题");
      return;
    }
    setIsCreating(true);
    try {
      const args = ["create-task", `--title="${newTaskTitle}"`, `--assignee=${newTaskAssignee}`];
      if (newTaskDesc.trim()) args.push(`--desc="${newTaskDesc}"`);
      await runCmd(args);
      
      handleCloseCreateModal();
      setNewTaskTitle('');
      setNewTaskDesc('');
      fetchTasks();
      dispatchAppNotification({
        type: 'task',
        title: '任务已创建',
        desc: `新任务 "${newTaskTitle}" 已成功分配给 ${newTaskAssignee}。`
      });
    } catch (err: any) {
      alert("创建任务失败: " + err.toString());
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEdit = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Avoid opening task detail page
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskAssignee(task.assignee || 'antigravity');
    setEditTaskStatus(task.status || 'todo');
    setShowEditModal(true);
  };

  const handleSaveTask = async () => {
    if (!editingTask) return;
    if (!editTaskTitle.trim()) {
      alert("请输入任务标题");
      return;
    }
    setIsSaving(true);
    try {
      const args = [
        "edit", 
        editingTask.id, 
        "--title", editTaskTitle, 
        "--assignee", editTaskAssignee, 
        "--status", editTaskStatus
      ];
      if (editTaskDesc.trim()) {
        args.push("--desc", editTaskDesc);
      } else {
        args.push("--desc", "");
      }
      
      await runCmd(args);
      
      handleCloseEditModal();
      setEditingTask(null);
      fetchTasks();
      dispatchAppNotification({
        type: 'task',
        title: '任务已更新',
        desc: `任务 "${editTaskTitle}" 的状态已更新为 ${editTaskStatus}。`
      });
    } catch (err: any) {
      alert("修改任务失败: " + err.toString());
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation(); // Avoid opening task detail page
    setDeleteTaskConfirmId(taskId);
  };

  const confirmDeleteTask = async () => {
    if (!deleteTaskConfirmId) return;
    try {
      await runCmd(["delete", deleteTaskConfirmId]);
      fetchTasks();
      dispatchAppNotification({
        type: 'system',
        title: '任务已删除',
        desc: `任务 ${deleteTaskConfirmId} 已被永久删除。`
      });
    } catch (err: any) {
      alert("删除任务失败: " + err.toString());
    } finally {
      setDeleteTaskConfirmId(null);
    }
  };


  // Perform Client-Side Filtering
  const filteredTasks = tasks.filter(t => {
    const matchesAssignee = filterAssignee === 'all' || 
      (filterAssignee === 'user' ? (t.assignee === 'user' || !t.assignee) : t.assignee === filterAssignee);
    const matchesSearch = searchQuery.trim() === '' || 
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesAssignee && matchesSearch;
  });

  const activeColumns = groupBy === 'status' ? columns : assigneeColumns;

  return (
      <div className="view-container bg-panel">
        <div className="view-header">
          <div className="view-title-row">
            <h1 className="view-title">{t.tasksBoard}</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-ghost" 
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '12px',
                  backgroundColor: showFilterBar ? 'var(--bg-hover)' : 'transparent',
                  borderColor: showFilterBar ? 'var(--color-primary-orange)' : 'var(--color-border)',
                }}
                onClick={() => setShowFilterBar(!showFilterBar)}
              >
                <Icons.Search style={{ width: '14px', height: '14px', marginRight: '4px' }}/> {t.filter}
              </button>
              <button 
                className="btn btn-ghost" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setGroupBy(groupBy === 'status' ? 'assignee' : 'status')}
              >
                <Icons.Layout style={{ width: '14px', height: '14px', marginRight: '4px' }}/> {groupBy === 'status' ? t.groupStatus : t.groupAssignee}
              </button>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <Icons.Plus style={{ width: '14px', height: '14px', marginRight: '4px' }} /> {t.newTask}
              </button>
          </div>
        </div>
      </div>

      {/* Filter Options Bar */}
      {showFilterBar && (
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--bg-main)',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Icons.Search style={{ width: '14px', height: '14px', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="chat-input-field"
              placeholder="搜索任务 ID、标题或描述..."
              style={{
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                width: '100%',
                outline: 'none'
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>负责人:</span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                outline: 'none',
                color: 'var(--color-text-main)'
              }}
            >
              <option value="all">全部</option>
              <option value="antigravity">Antigravity (前端)</option>
              <option value="codex">Codex (后端)</option>
              <option value="hermes">Hermes (规划)</option>
              <option value="opencode">OpenCode (重构)</option>
              <option value="claudecode">Claude Code (审计)</option>
              <option value="user">User (用户/未分配)</option>
            </select>
          </div>
          {(searchQuery || filterAssignee !== 'all') && (
            <button
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--color-primary-orange)' }}
              onClick={() => {
                setSearchQuery('');
                setFilterAssignee('all');
              }}
            >
              重置筛选
            </button>
          )}
        </div>
      )}

      <KanbanBoard
        filteredTasks={filteredTasks}
        activeColumns={activeColumns}
        groupBy={groupBy}
        onSelectTask={onSelectTask}
        onOpenEdit={handleOpenEdit}
        onDeleteTask={handleDeleteTask}
        onCreateTaskClick={() => setShowCreateModal(true)}
      />

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className={`modal-overlay ${isCreateModalClosing ? 'closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleCloseCreateModal() }}>
          <div className="modal-card" style={{ width: '500px' }}>
            <div className="modal-header">
              <div className="modal-title">Create New Task</div>
              <button className="btn-icon-ghost" onClick={handleCloseCreateModal}><Icons.Plus style={{ transform: 'rotate(45deg)' }}/></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              
              <div className="form-group mb-4">
                <label className="form-label">任务标题 <span style={{ color: 'var(--color-destructive)' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="例如：实现登录功能"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">分配给 <span style={{ color: 'var(--color-destructive)' }}>*</span></label>
                <select 
                  className="form-control" 
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                >
                  <option value="antigravity">Antigravity (前端专家)</option>
                  <option value="codex">Codex (后端专家)</option>
                  <option value="hermes">Hermes (规划专家)</option>
                  <option value="opencode">OpenCode (重构专家)</option>
                  <option value="claudecode">Claude Code (审计专家)</option>
                  <option value="user">User (我来处理)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">详细描述 (可选)</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  placeholder="请输入任务详细需求和规范..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                ></textarea>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={handleCloseCreateModal} disabled={isCreating}>取消</button>
              <button className="btn btn-primary" onClick={handleCreateTask} disabled={isCreating || !newTaskTitle.trim()}>
                {isCreating ? "创建中..." : "确认创建"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Editing Modal */}
      {showEditModal && editingTask && (
        <div className={`modal-overlay ${isEditModalClosing ? 'closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleCloseEditModal() }}>
          <div className="modal-card" style={{ width: '500px' }}>
            <div className="modal-header">
              <div className="modal-title">修改任务 {editingTask.id}</div>
              <button className="btn-icon-ghost" onClick={handleCloseEditModal}><Icons.Plus style={{ transform: 'rotate(45deg)' }}/></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              
              <div className="form-group mb-4">
                <label className="form-label">任务标题 <span style={{ color: 'var(--color-destructive)' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="例如：实现登录功能"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }} className="mb-4">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">分配给 <span style={{ color: 'var(--color-destructive)' }}>*</span></label>
                  <select 
                    className="form-control" 
                    value={editTaskAssignee}
                    onChange={(e) => setEditTaskAssignee(e.target.value)}
                  >
                    <option value="antigravity">Antigravity (前端)</option>
                    <option value="codex">Codex (后端)</option>
                    <option value="hermes">Hermes (规划)</option>
                    <option value="opencode">OpenCode (重构)</option>
                    <option value="claudecode">Claude Code (审计)</option>
                    <option value="user">User (用户/未分配)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">状态 <span style={{ color: 'var(--color-destructive)' }}>*</span></label>
                  <select 
                    className="form-control" 
                    value={editTaskStatus}
                    onChange={(e) => setEditTaskStatus(e.target.value)}
                  >
                    <option value="todo">待处理 (Todo)</option>
                    <option value="in_progress">进行中 (In Progress)</option>
                    <option value="review">审查中 (Review)</option>
                    <option value="fixing">修复中 (Fixing)</option>
                    <option value="done">已完成 (Done)</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">详细描述 (可选)</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  placeholder="请输入任务详细需求和规范..."
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                ></textarea>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={handleCloseEditModal} disabled={isSaving}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveTask} disabled={isSaving || !editTaskTitle.trim()}>
                {isSaving ? "保存中..." : "保存修改"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteTaskConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteTaskConfirmId(null)}>
          <div className="modal-card" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h2 style={{ fontSize: '18px', display: 'none' }}>删除任务</h2>
              <button className="btn-icon-ghost" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={() => setDeleteTaskConfirmId(null)}>
                <Icons.X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '24px', paddingBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, border: '4px solid rgba(239, 68, 68, 0.05)' }}>
                  <Icons.AlertTriangle style={{ width: '22px', height: '22px', color: '#EF4444' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', margin: '0 0 8px 0', letterSpacing: '0.01em' }}>删除任务 {deleteTaskConfirmId} 吗？</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                    此操作将永久移除该任务的所有相关文件及流转记录。<br/>
                    <strong style={{ color: '#EF4444', fontWeight: 500 }}>此操作无法撤销。</strong>
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0, display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingRight: '24px', paddingBottom: '24px' }}>
              <button className="btn btn-ghost" style={{ fontWeight: 500 }} onClick={() => setDeleteTaskConfirmId(null)}>取消保留</button>
              <button 
                className="btn btn-primary" 
                style={{ backgroundColor: '#EF4444', borderColor: '#EF4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)', fontWeight: 600 }}
                onClick={confirmDeleteTask}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
