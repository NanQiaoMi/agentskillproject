import React from 'react';
import { Icons } from '../Icons';
import { Task } from '../../types';
import { TaskCard } from './TaskCard';

export interface KanbanColumnProps {
  col: { key: string; title: string; color: string };
  colTasks: Task[];
  onSelectTask: (id: string) => void;
  onOpenEdit: (e: React.MouseEvent, task: Task) => void;
  onDeleteTask: (e: React.MouseEvent, id: string) => void;
  onCreateTaskClick: () => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  col,
  colTasks,
  onSelectTask,
  onOpenEdit,
  onDeleteTask,
  onCreateTaskClick
}) => {
  return (
    <div className="kanban-column" style={{ '--col-accent': col.color } as React.CSSProperties}>
      <div className="kanban-column-header">
        <div className="kanban-column-title">
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color }}></span>
          <span>{col.title}</span>
          <span className="kanban-count-badge">{colTasks.length}</span>
        </div>
        <button 
          className="btn-icon-ghost" 
          onClick={onCreateTaskClick} 
          style={{ border: 'none' }}
        >
          <Icons.Plus style={{ width: '14px', height: '14px' }} />
        </button>
      </div>
      
      <div className="kanban-column-content">
        {colTasks.map((t, index) => (
          <TaskCard
            key={t.id}
            task={t}
            index={index}
            columnColor={col.color}
            onSelectTask={onSelectTask}
            onOpenEdit={onOpenEdit}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
    </div>
  );
};
