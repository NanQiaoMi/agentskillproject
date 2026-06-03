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
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState('');

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

  const handleFileClick = async (file: string) => {
    // Build the full file path
    const separator = projectPath.includes('/') ? '/' : '\\';
    const filePath = file.startsWith(projectPath) ? file : projectPath + separator + file;

    setSelectedFile(file);
    setFileContent('');
    setFileError('');
    setFileLoading(true);
    try {
      const content = await invoke<string>('read_file_content', { path: filePath });
      setFileContent(content);
    } catch (err: any) {
      setFileError(err.toString());
    } finally {
      setFileLoading(false);
    }
  };

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
            <div
              key={i}
              className="tree-item"
              style={{
                padding: '4px 16px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                backgroundColor: selectedFile === file ? 'var(--bg-hover)' : 'transparent'
              }}
              onClick={() => handleFileClick(file)}
            >
              <Icons.FileText style={{ width: '14px', height: '14px', marginRight: '8px', color: 'var(--color-text-muted)' }} />
              <span className="tree-label font-mono text-xs" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="code-editor-viewer" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)', overflow: 'hidden' }}>
        {!selectedFile ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Select a file to view contents
          </div>
        ) : fileLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Loading file...
          </div>
        ) : fileError ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-destructive)', fontSize: '13px', padding: '16px' }}>
            {fileError}
          </div>
        ) : (
          <>
            <div style={{ padding: '6px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
              {selectedFile}
            </div>
            <pre style={{
              flex: 1,
              margin: 0,
              padding: '12px 16px',
              fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
              fontSize: '12px',
              lineHeight: 1.6,
              overflowY: 'auto',
              overflowX: 'auto',
              backgroundColor: 'var(--bg-terminal, var(--bg-main))',
              color: 'var(--color-text-main)',
              whiteSpace: 'pre',
              tabSize: 4
            }}>
              {fileContent}
            </pre>
          </>
        )}
      </div>
    </div>
  );
};
