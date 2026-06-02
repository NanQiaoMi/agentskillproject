import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';

interface WorktreesViewProps {
  projectPath: string;
}

export const WorktreesView: React.FC<WorktreesViewProps> = ({ projectPath }) => {
  const [worktrees, setWorktrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWt, setSelectedWt] = useState<any>(null);

  useEffect(() => {
    const fetchWorktrees = async () => {
      try {
        const result = await invoke<string>("list_git_worktrees", { repoPath: projectPath });
        const parsed = result.split('\n').filter(Boolean).map(line => {
          const parts = line.trim().split(/\s+/);
          const path = parts[0];
          const branch = parts.length > 2 ? parts.slice(2).join(' ').replace(/[\[\]]/g, '') : 'detached';
          const name = path.split('/').pop()?.split('\\').pop() || 'unknown';
          return {
            id: name,
            name: name,
            branch: branch,
            path: path,
            status: 'Active',
            created: '2026-05-20 10:15'
          };
        });
        setWorktrees(parsed);
        if (parsed.length > 0) setSelectedWt(parsed[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorktrees();
  }, [projectPath]);

  return (
    <div className="view-container bg-panel">
      <div className="view-header">
        <div className="view-title-row">
          <div>
            <h1 className="view-title">Worktrees</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '4px' }}>基于 Git Worktree 的任务隔离环境</p>
          </div>
        </div>
      </div>

      <div className="view-content" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>
        ) : selectedWt ? (
          <div className="worktree-split-container">
            {/* Left Column */}
            <div className="worktree-details-left">
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Worktree: {selectedWt.name}</h2>
              <span className="text-muted" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{selectedWt.path}</span>
              
              <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '8px 0' }}></div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Branch</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="font-mono" style={{ fontWeight: 500 }}>{selectedWt.branch}</span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontWeight: 600 }}>Active</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Base Branch</span>
                  <span className="font-mono">main</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Created</span>
                  <span>{selectedWt.created}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Location</span>
                  <span className="font-mono" style={{ fontSize: '11px' }}>{selectedWt.path}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Status</span>
                  <span style={{ color: '#10B981', fontWeight: 600 }}>Clean</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Head Commit</span>
                  <span className="font-mono" style={{ color: 'var(--color-text-main)', fontWeight: 500 }}>e182c3d feat: add login API</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button className="btn" style={{ flex: 1 }}><Icons.FolderOpen style={{ width: '14px', height: '14px', marginRight: '6px' }}/> Open in Explorer</button>
                <button className="btn" style={{ flex: 1 }}><Icons.Terminal style={{ width: '14px', height: '14px', marginRight: '6px' }}/> Open in Terminal</button>
              </div>
            </div>

            {/* Right Column */}
            <div className="worktree-details-right">
              <div className="changes-box">
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>File Changes</h3>
                <div className="text-xs text-muted mb-4" style={{ marginBottom: '12px' }}>3 files changed <span style={{ color: '#10B981' }}>+45</span> <span style={{ color: '#EF4444' }}>-12</span></div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>src/backend/app/routes/auth.py</span>
                    <span style={{ color: '#10B981' }}>+32 -4</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>src/frontend/components/Login.tsx</span>
                    <span style={{ color: '#10B981' }}>+10 -2</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>tests/test_auth.py</span>
                    <span style={{ color: '#EF4444' }}>+3 -6</span>
                  </div>
                </div>
              </div>

              <div className="commits-box">
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Recent Commits</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span className="font-mono" style={{ color: 'var(--color-text-muted)' }}>e182c3d</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>feat: add login API</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Johnnie · 2h ago</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span className="font-mono" style={{ color: 'var(--color-text-muted)' }}>d48df0d</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>fix: password validation</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Johnnie · 3h ago</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span className="font-mono" style={{ color: 'var(--color-text-muted)' }}>e770b09</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>test: add auth tests</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Johnnie · 1d ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center' }}>No active worktrees.</div>
        )}
      </div>
    </div>
  );
};
