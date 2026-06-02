import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TaskDiffTabProps {
  projectPath: string;
}

export const TaskDiffTab: React.FC<TaskDiffTabProps> = ({ projectPath }) => {
  const [diffContent, setDiffContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        const result = await invoke<string>("get_git_diff", { repoPath: projectPath });
        setDiffContent(result);
      } catch (err: any) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    };
    fetchDiff();
  }, [projectPath]);

  return (
    <div className="tab-pane-full">
      <div className="diff-view" style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {loading && <div style={{ color: 'var(--color-text-muted)' }}>Loading diff...</div>}
        {error && <div style={{ color: 'var(--color-destructive)' }}>{error}</div>}
        {!loading && !error && (
          <div className="diff-file" style={{ borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', overflow: 'hidden' }}>
            <div className="diff-header" style={{ padding: '8px 16px', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <span className="font-mono text-sm font-semibold">Git Diff</span>
            </div>
            <div className="diff-content font-mono text-xs" style={{ whiteSpace: 'pre-wrap', padding: '16px' }}>
              {diffContent.split('\n').map((line, i) => {
                let color = 'var(--color-text-main)';
                let bg = 'transparent';
                if (line.startsWith('+') && !line.startsWith('+++')) { color = '#10B981'; bg = 'rgba(16, 185, 129, 0.1)'; }
                else if (line.startsWith('-') && !line.startsWith('---')) { color = '#EF4444'; bg = 'rgba(239, 68, 68, 0.1)'; }
                else if (line.startsWith('@@')) { color = '#8B5CF6'; bg = 'rgba(139, 92, 246, 0.1)'; }
                return (
                  <div key={i} style={{ color, backgroundColor: bg, padding: '0 4px' }}>
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
