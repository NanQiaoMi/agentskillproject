import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../../components/Icons';

interface TaskFilesTabProps {
  projectPath: string;
}

export const TaskFilesTab: React.FC<TaskFilesTabProps> = ({ projectPath }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const result = await invoke<string>("read_dir_recursive", { path: projectPath });
        setFiles(result.split('\n').filter(Boolean));
      } catch (err: any) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [projectPath]);

  return (
    <div className="tab-pane-full flex-row">
      <div className="file-tree-sidebar" style={{ width: '300px', overflowY: 'auto', borderRight: '1px solid var(--border-color)' }}>
        <div className="tree-header" style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <span className="font-semibold text-sm">Files</span>
        </div>
        <div className="tree-content" style={{ padding: '8px 0' }}>
          {loading && <div style={{ padding: '0 16px', color: 'var(--color-text-muted)' }}>Loading files...</div>}
          {error && <div style={{ padding: '0 16px', color: 'var(--color-destructive)' }}>{error}</div>}
          {!loading && !error && files.map((file, i) => (
            <div key={i} className="tree-item" style={{ padding: '4px 16px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <Icons.FileText style={{ width: '14px', height: '14px', marginRight: '8px', color: 'var(--color-text-muted)' }} />
              <span className="tree-label font-mono text-xs" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="code-editor-viewer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
          Select a file to view contents (Demo)
        </div>
      </div>
    </div>
  );
};
