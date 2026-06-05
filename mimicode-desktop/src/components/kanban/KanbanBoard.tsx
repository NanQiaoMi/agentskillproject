import React from 'react';
import { Task } from '../../types';
import { KanbanColumn } from './KanbanColumn';

export interface KanbanBoardProps {
  filteredTasks: Task[];
  activeColumns: Array<{ key: string; title: string; color: string }>;
  groupBy: 'status' | 'assignee';
  onSelectTask: (id: string) => void;
  onOpenEdit: (e: React.MouseEvent, task: Task) => void;
  onDeleteTask: (e: React.MouseEvent, id: string) => void;
  onCreateTaskClick: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  filteredTasks,
  activeColumns,
  groupBy,
  onSelectTask,
  onOpenEdit,
  onDeleteTask,
  onCreateTaskClick
}) => {
  return (
    <div className="view-content" style={{ padding: '16px', overflow: 'hidden' }}>
      <div className="kanban-board-container">
        {activeColumns.map(col => {
          const colTasks = filteredTasks.filter(t => {
            if (groupBy === 'status') {
              if (col.key === 'todo') return t.status === 'todo' || t.status === 'pending' || !t.status;
              if (col.key === 'in_progress') return t.status === 'in_progress' || t.status === 'fixing';
              if (col.key === 'review') return t.status === 'review';
              return t.status === col.key;
            } else {
              if (col.key === 'user') return t.assignee === 'user' || !t.assignee;
              return t.assignee === col.key;
            }
          });

          return (
            <KanbanColumn
              key={col.key}
              col={col}
              colTasks={colTasks}
              onSelectTask={onSelectTask}
              onOpenEdit={onOpenEdit}
              onDeleteTask={onDeleteTask}
              onCreateTaskClick={onCreateTaskClick}
            />
          );
        })}
      </div>
    </div>
  );
};
