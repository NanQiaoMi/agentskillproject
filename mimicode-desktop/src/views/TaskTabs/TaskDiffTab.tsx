import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../../components/Icons';

interface TaskDiffTabProps {
  projectPath: string;
}

export const TaskDiffTab: React.FC<TaskDiffTabProps> = ({ projectPath }) => {

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [parsedFiles, setParsedFiles] = useState<{name: string, diff: string[], additions: number, deletions: number}[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        const result = await invoke<string>("get_git_diff", { repoPath: projectPath });

        
        // Parse the diff output
        const files: {name: string, diff: string[], additions: number, deletions: number}[] = [];
        const lines = result.split('\n');
        let currentFile: { name: string, diff: string[], additions: number, deletions: number } | null = null;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith('diff --git')) {
            const parts = line.split(' ');
            const name = parts[parts.length - 1].substring(2); // remove b/
            currentFile = { name, diff: [], additions: 0, deletions: 0 };
            files.push(currentFile);
          } else if (currentFile) {
            currentFile.diff.push(line);
            if (line.startsWith('+') && !line.startsWith('+++')) currentFile.additions++;
            if (line.startsWith('-') && !line.startsWith('---')) currentFile.deletions++;
          }
        }
        
        setParsedFiles(files);
        if (files.length > 0) {
          setSelectedFile(files[0].name);
        }
      } catch (err: any) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    };
    fetchDiff();
  }, [projectPath]);

  return (
    <div className="tab-pane-full flex-row" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left Sidebar: File Tree */}
      <div className="file-tree-sidebar" style={{ width: '260px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-sidebar)' }}>
        <div className="tree-header" style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-main)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Changed Files ({parsedFiles.length})</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: 'var(--color-success)' }}>+{parsedFiles.reduce((acc, f) => acc + f.additions, 0)}</span>
            <span style={{ color: 'var(--color-destructive)' }}>-{parsedFiles.reduce((acc, f) => acc + f.deletions, 0)}</span>
          </div>
        </div>
        <div className="tree-content" style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {parsedFiles.map((file, idx) => (
            <div 
              key={idx} 
              className={`tree-item ${selectedFile === file.name ? 'active' : ''}`}
              onClick={() => setSelectedFile(file.name)}
              style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
            >
              <Icons.FileText style={{ width: '14px', height: '14px', marginRight: '8px', color: selectedFile === file.name ? 'var(--color-primary-orange)' : 'var(--color-text-muted)' }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name.split('/').pop()}</span>
              <div className="diff-badges" style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
                {file.additions > 0 && <span style={{ color: 'var(--color-success)' }}>+{file.additions}</span>}
                {file.deletions > 0 && <span style={{ color: 'var(--color-destructive)' }}>-{file.deletions}</span>}
              </div>
            </div>
          ))}
          {parsedFiles.length === 0 && !loading && (
            <div style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '12px', textAlign: 'center' }}>No files changed</div>
          )}
        </div>
      </div>

      {/* Right Content: Diff Viewer */}
      <div className="code-diff-viewer" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)', overflow: 'hidden' }}>
        {loading && <div style={{ padding: '24px', color: 'var(--color-text-muted)' }}>Loading diff...</div>}
        {error && <div style={{ padding: '24px', color: 'var(--color-destructive)' }}>{error}</div>}
        
        {!loading && !error && selectedFile && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="diff-header" style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--bg-panel)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-mono text-sm font-semibold">{selectedFile}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ padding: '4px 8px', backgroundColor: 'var(--bg-hover)', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Split</div>
                <div style={{ padding: '4px 8px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-orange)', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Unified</div>
              </div>
            </div>
            
            <div className="diff-content font-mono text-xs" style={{ flex: 1, overflowY: 'auto', backgroundColor: '#1e1e1e', padding: '16px 0', lineHeight: 1.6 }}>
              {parsedFiles.find(f => f.name === selectedFile)?.diff.map((line, i) => {
                // Skip the index and header lines of git diff
                if (line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) return null;
                
                let isAdd = line.startsWith('+');
                let isDel = line.startsWith('-');
                let isHunk = line.startsWith('@@');
                
                let bg = 'transparent';
                let color = '#d4d4d4';
                if (isAdd) { bg = 'rgba(16, 185, 129, 0.15)'; color = '#10B981'; }
                if (isDel) { bg = 'rgba(239, 68, 68, 0.15)'; color = '#EF4444'; }
                if (isHunk) { bg = 'rgba(139, 92, 246, 0.1)'; color = '#8B5CF6'; }
                
                return (
                  <div key={i} className={`diff-line ${isAdd ? 'addition' : isDel ? 'deletion' : ''}`} style={{ display: 'flex', backgroundColor: bg }}>
                    <div className="line-numbers" style={{ display: 'flex', width: '80px', backgroundColor: '#1e1e1e', borderRight: '1px solid #404040', paddingRight: '12px', color: '#858585', userSelect: 'none', position: 'relative' }}>
                      <span className="diff-sign" style={{ position: 'absolute', left: '8px', color: isAdd ? '#10B981' : isDel ? '#EF4444' : 'transparent' }}>{isAdd ? '+' : isDel ? '-' : ' '}</span>
                      <span className="ln" style={{ flex: 1, textAlign: 'right' }}>{isHunk ? ' ' : i}</span>
                    </div>
                    <div className="line-code" style={{ paddingLeft: '24px', flex: 1, color, whiteSpace: 'pre-wrap' }}>
                      {line.substring(isAdd || isDel ? 1 : 0)}
                    </div>
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
