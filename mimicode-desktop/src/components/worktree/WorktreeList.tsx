import React from 'react';
import { WorktreeCard } from './WorktreeCard';

export interface WorktreeListProps {
  worktrees: Array<{ path: string; name: string; branch: string }>;
  selectedWt: { path: string; name: string; branch: string } | null;
  projectPath: string;
  wtStatuses: Record<string, { is_clean: boolean }>;
  onSelectWt: (wt: any) => void;
  normalizePath: (p: string) => string;
}

export const WorktreeList: React.FC<WorktreeListProps> = ({
  worktrees,
  selectedWt,
  projectPath,
  wtStatuses,
  onSelectWt,
  normalizePath
}) => {
  return (
    <div className="wt-details-card" style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)', height: '100%', overflow: 'hidden', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          开发隔离环境 ({worktrees.length})
        </span>
        <span style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 600 }}>
          🟢 联接中
        </span>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '2px' }}>
        {worktrees.map(wt => {
          const isSelected = selectedWt?.path === wt.path;
          const isMain = normalizePath(wt.path) === normalizePath(projectPath);
          const wtStatus = wtStatuses[wt.path];
          const isClean = wtStatus ? wtStatus.is_clean : true;
          
          return (
            <WorktreeCard
              key={wt.path}
              wt={wt}
              isSelected={isSelected}
              isMain={isMain}
              isClean={isClean}
              onSelect={() => onSelectWt(wt)}
            />
          );
        })}
      </div>
    </div>
  );
};
