import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../../components/Icons';

interface TaskCommitsTabProps {
  projectPath: string;
}

export const TaskCommitsTab: React.FC<TaskCommitsTabProps> = ({ projectPath }) => {
  const [commits, setCommits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCommits = async () => {
      try {
        const result = await invoke<string>("get_git_commits", { repoPath: projectPath });
        const parsed = result.split('\n').filter(Boolean).map(line => {
          const parts = line.split('|');
          return {
            hash: parts[0]?.substring(0, 7) || 'unknown',
            agent: parts[1] || 'Unknown',
            time: parts[2] || '',
            message: parts[3] || line,
          };
        });
        setCommits(parsed);
      } catch (err: any) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    };
    fetchCommits();
  }, [projectPath]);

  return (
    <div className="tab-pane-full flex-col">
      <div className="tab-toolbar" style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-main)' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Worktree:</span>
          <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-hover)', padding: '4px 10px', borderRadius: '4px' }}>
            <Icons.GitBranch style={{ width: '14px', height: '14px' }} />
            {projectPath.split(/[\\/]/).pop()}
          </span>
        </div>
      </div>
      <div className="commits-list" style={{ flex: 1, padding: '32px 48px', overflowY: 'auto' }}>
        {loading && <div style={{ color: 'var(--color-text-muted)' }}>Loading commits...</div>}
        {error && <div style={{ color: 'var(--color-destructive)' }}>{error}</div>}
        {!loading && !error && commits.length === 0 && <div style={{ color: 'var(--color-text-muted)' }}>No commits found.</div>}
        {!loading && !error && commits.map((commit, index) => (
          <div key={index} className="commit-item" style={{ display: 'flex', gap: '24px', position: 'relative', minHeight: '64px' }}>
            <div className="commit-dot-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12px' }}>
              <div className="commit-dot" style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981', zIndex: 1, marginTop: '6px' }}></div>
              {index !== commits.length - 1 && <div className="commit-line" style={{ width: '1px', flex: 1, backgroundColor: 'var(--color-border)', marginTop: '-2px' }}></div>}
            </div>
            <div className="commit-content" style={{ flex: 1, paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="commit-left">
                <div className="commit-message font-mono" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)', marginBottom: '8px' }}>{commit.message}</div>
                <div className="commit-agent text-xs" style={{ color: 'var(--color-text-muted)' }}>{commit.agent}</div>
              </div>
              <div className="commit-right" style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingTop: '2px' }}>
                <div className="commit-time text-xs" style={{ color: 'var(--color-text-muted)' }}>{commit.time}</div>
                <div className="commit-hash font-mono text-xs" style={{ color: 'var(--color-text-main)', backgroundColor: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {commit.hash} <Icons.Copy style={{ width: '12px', height: '12px', color: 'var(--color-text-muted)' }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
