import React from 'react';
import { Icons } from '../Icons';
import { Task } from '../../types';

export const getPriorityStyle = (priority: string = 'High') => {
  if (priority === 'High') return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' };
  if (priority === 'Medium') return { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' };
  return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' };
};

export interface TaskCardProps {
  task: Task;
  index: number;
  columnColor: string;
  onSelectTask: (id: string) => void;
  onOpenEdit: (e: React.MouseEvent, task: Task) => void;
  onDeleteTask: (e: React.MouseEvent, id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  index,
  columnColor,
  onSelectTask,
  onOpenEdit,
  onDeleteTask
}) => {
  const pri = task.priority || 'Medium';
  const priStyle = getPriorityStyle(pri);

  return (
    <div className="kanban-card" style={{ '--i': index } as React.CSSProperties} onClick={() => onSelectTask(task.id)}>
      <div className="kanban-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="font-mono">{task.id}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn-icon-ghost"
            title="修改任务"
            onClick={(e) => onOpenEdit(e, task)}
            style={{ width: '20px', height: '20px', border: 'none', background: 'transparent', color: 'var(--color-text-muted)' }}
          >
            <Icons.Edit2 style={{ width: '11px', height: '11px' }} />
          </button>
          <button
            className="btn-icon-ghost"
            title="删除任务"
            onClick={(e) => onDeleteTask(e, task.id)}
            style={{ width: '20px', height: '20px', border: 'none', background: 'transparent', color: 'var(--color-text-muted)' }}
          >
            <Icons.Trash2 style={{ width: '11px', height: '11px' }} />
          </button>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: columnColor }}></span>
        </div>
      </div>
      <div className="kanban-card-title">{task.title}</div>
      <div className="kanban-card-footer">
        <div className="agent-badge" style={{ padding: '2px 6px', border: 'none', background: 'transparent' }}>
          <div className="agent-avatar-small" style={{ width: '20px', height: '20px', fontSize: '10px', marginRight: '6px' }}>
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
    </div>
  );
};
