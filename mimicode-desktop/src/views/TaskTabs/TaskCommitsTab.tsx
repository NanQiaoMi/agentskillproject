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
    <div className="tab-pane-full">
      <div className="commits-list">
        {loading && <div style={{ padding: '24px', color: 'var(--color-text-muted)' }}>Loading commits...</div>}
        {error && <div style={{ padding: '24px', color: 'var(--color-destructive)' }}>{error}</div>}
        {!loading && !error && commits.length === 0 && <div style={{ padding: '24px', color: 'var(--color-text-muted)' }}>No commits found.</div>}
        {!loading && !error && commits.map((commit, index) => (
          <div key={index} className="commit-item">
            <div className="commit-dot-wrapper">
              <div className="commit-dot"></div>
              {index !== commits.length - 1 && <div className="commit-line"></div>}
            </div>
            <div className="commit-content">
              <div className="commit-message font-mono text-sm">{commit.message}</div>
              <div className="commit-meta text-xs text-muted">
                <span className="commit-agent">{commit.agent}</span>
                <span className="commit-dot-sep">•</span>
                <span>{commit.time}</span>
              </div>
            </div>
            <div className="commit-hash font-mono text-xs text-muted">
              {commit.hash} <Icons.Link style={{ width: '12px', height: '12px', marginLeft: '4px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
