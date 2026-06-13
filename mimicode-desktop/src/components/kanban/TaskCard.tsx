import React from 'react';
import { motion } from 'framer-motion';
import { Icons } from '../Icons';
import { Task } from '../../types';

export const getPriorityStyle = (priority: string = 'High') => {
  if (priority === 'High') return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' };
  if (priority === 'Medium') return { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' };
  return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' };
};

export const getAgentAvatarStyle = (name: string | undefined) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('hermes')) return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
  if (lower.includes('opencode')) return { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
  if (lower.includes('codex')) return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
  if (lower.includes('claude') || lower.includes('qa')) return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
  if (lower.includes('antigravity')) return { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
  return { color: 'var(--color-text-muted)', bg: 'var(--bg-hover)' };
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
    <motion.div 
      layout
      initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -10, filter: 'blur(4px)', scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1], layout: { type: 'spring', bounce: 0, duration: 0.4 } }}
      className="kanban-card" 
      style={{ '--i': index, '--card-accent': columnColor } as React.CSSProperties} 
      onClick={() => onSelectTask(task.id)}
    >
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
          {task.status === 'done' && <Icons.CheckCircle2 className="done-icon-anim" style={{ width: '14px', height: '14px', color: '#10B981' }} />}
          <span style={{ 
            width: task.status === 'done' ? '0px' : '6px', 
            height: task.status === 'done' ? '0px' : '6px', 
            borderRadius: '50%', 
            backgroundColor: columnColor, 
            transition: 'background-color 0.3s ease',
            opacity: task.status === 'done' ? 0 : 1,
            margin: task.status === 'done' ? '0' : '0 2px'
          }}></span>
        </div>
      </div>
      <div className="kanban-card-title">{task.title}</div>
      <div className="kanban-card-footer">
        <div className="agent-badge" style={{ padding: '2px 6px', border: 'none', background: 'transparent' }}>
          <div className="agent-avatar-small" style={{ 
            width: '20px', height: '20px', fontSize: '10px', marginRight: '6px',
            backgroundColor: getAgentAvatarStyle(task.assignee).bg,
            color: getAgentAvatarStyle(task.assignee).color
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
};
