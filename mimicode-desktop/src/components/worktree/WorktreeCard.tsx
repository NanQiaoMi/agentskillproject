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
        padding: '12px 14px',
        backgroundColor: isSelected ? 'var(--bg-hover)' : 'var(--bg-panel)',
        border: isSelected ? '1.5px solid var(--color-primary-orange)' : '1px solid var(--color-border)',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        position: 'relative',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.03)' : 'none'
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
