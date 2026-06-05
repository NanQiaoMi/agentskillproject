import React from 'react';

export interface CommitTimelineProps {
  commits: Array<{ hash: string; subject: string; author: string; date: string }>;
  loadingDetails: boolean;
}

export const CommitTimeline: React.FC<CommitTimelineProps> = ({ commits, loadingDetails }) => {
  return (
    <div className="commits-box wt-details-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: 'var(--bg-main)', minHeight: 0, padding: '24px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--color-text-main)', letterSpacing: '-0.01em', flexShrink: 0 }}>最近提交记录 (Recent Commits)</h3>
      {loadingDetails ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>正在加载提交记录...</div>
      ) : commits.length > 0 ? (
        <div style={{ flex: 1, position: 'relative', paddingLeft: '8px', minHeight: 0 }}>
          <div style={{ position: 'absolute', left: '15px', top: '8px', bottom: '12px', width: '2px', backgroundColor: 'var(--color-border)' }}></div>
          
          <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '2px' }}>
            {commits.map((cmt, idx) => (
              <div key={idx} className="wt-commit-item" style={{ display: 'flex', gap: '12px', position: 'relative', paddingLeft: '20px', flexShrink: 0 }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '3px', 
                  top: '4px', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: idx === 0 ? 'var(--color-primary-orange)' : 'var(--color-text-muted)', 
                  border: '2px solid var(--bg-main)',
                  zIndex: 2,
                  boxShadow: idx === 0 ? '0 0 0 2px rgba(232, 104, 74, 0.2)' : 'none'
                }}></div>
                
                <span className="font-mono" style={{ 
                  color: idx === 0 ? 'var(--color-primary-orange)' : 'var(--color-text-muted)', 
                  fontWeight: 600, 
                  fontSize: '10px', 
                  paddingTop: '1px',
                  backgroundColor: 'var(--bg-panel)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  height: 'fit-content'
                }}>
                  {cmt.hash.substring(0, 7)}
                </span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <div style={{ fontWeight: 600, fontSize: '11.5px', color: 'var(--color-text-main)', lineBreak: 'anywhere' }}>{cmt.subject}</div>
                  <div className="text-muted" style={{ fontSize: '10.5px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span>👤 {cmt.author}</span>
                    <span>·</span>
                    <span>📅 {cmt.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--color-border)', borderRadius: '8px', color: 'var(--color-text-muted)', fontSize: '12px' }}>无提交历史记录</div>
      )}
    </div>
  );
};
