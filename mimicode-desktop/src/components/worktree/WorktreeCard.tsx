import React from 'react';
import { Icons } from '../Icons';

export interface WorktreeCardProps {
  wt: { path: string; name: string; branch: string };
  isSelected: boolean;
  isMain: boolean;
  isClean: boolean;
  onSelect: () => void;
}

export const WorktreeCard: React.FC<WorktreeCardProps> = ({
  wt,
  isSelected,
  isMain,
  isClean,
  onSelect
}) => {
  return (
    <div 
      onClick={onSelect}
      className="wt-sidebar-item"
      style={{
        padding: '14px 16px',
        background: isSelected ? 'linear-gradient(145deg, rgba(249, 115, 22, 0.05), rgba(249, 115, 22, 0.01))' : 'var(--bg-panel)',
        border: isSelected ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid rgba(0,0,0,0.04)',
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: isSelected ? '0 8px 24px -4px rgba(249, 115, 22, 0.1)' : '0 2px 8px rgba(0,0,0,0.01)'
      }}
    >
      {/* Selected Indicator Bar */}
      {isSelected && (
        <div style={{ position: 'absolute', left: 0, top: '12px', bottom: '12px', width: '3px', backgroundColor: 'var(--color-primary-orange)', borderRadius: '0 2px 2px 0' }}></div>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span style={{ fontSize: '12.5px', fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--color-primary-orange)' : 'var(--color-text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }} title={wt.name}>
          {wt.name}
        </span>
        
        {/* Pulse indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span 
            style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: isMain ? '#3B82F6' : (isClean ? '#10B981' : '#F59E0B'),
              display: 'inline-block'
            }}
            className={isMain ? 'pulse-dot-blue' : (isClean ? 'pulse-dot-green' : 'pulse-dot-orange')}
          />
          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {isMain ? 'Main' : (isClean ? 'Clean' : 'Changes')}
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
        <Icons.GitBranch style={{ width: '11px', height: '11px', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-mono)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={wt.branch}>
          {wt.branch}
        </span>
      </div>
    </div>
  );
};
