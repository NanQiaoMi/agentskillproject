import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../../components/Icons';
import { Highlight, themes } from 'prism-react-renderer';

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
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--bg-panel)' }}>
              <Icons.FileText style={{ width: '16px', height: '16px', marginRight: '8px', color: 'var(--color-primary-orange)' }} />
              <span style={{ fontSize: '13px', color: 'var(--color-text-main)', fontFamily: 'var(--font-mono)' }}>{selectedFile}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <Icons.MoreHorizontal style={{ width: '16px', height: '16px', color: 'var(--color-text-muted)', cursor: 'pointer' }} />
              </div>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#1e1e1e' }}>
              <Highlight theme={themes.vsDark} code={fileContent} language={selectedFile.split('.').pop() || 'typescript'}>
                {({ style, tokens, getLineProps, getTokenProps }) => (
                  <pre style={{ ...style, margin: 0, padding: '16px 0', fontSize: '13px', fontFamily: '"Cascadia Code", "Fira Code", monospace', minHeight: '100%' }}>
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })} style={{ display: 'flex' }}>
                        <span style={{ 
                          width: '40px', 
                          textAlign: 'right', 
                          paddingRight: '16px', 
                          color: '#858585', 
                          userSelect: 'none',
                          opacity: 0.5
                        }}>{i + 1}</span>
                        <span style={{ paddingLeft: '8px' }}>
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </span>
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            </div>
            
            <div className="editor-statusbar" style={{ 
              padding: '6px 16px', 
              borderTop: '1px solid var(--color-border)', 
              backgroundColor: 'var(--bg-main)', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '24px',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)'
            }}>
              <span>Ln {fileContent.split('\n').length}, Col 1</span>
              <span>Spaces: 4</span>
              <span>UTF-8</span>
              <span>LF</span>
              <span style={{ textTransform: 'capitalize' }}>{selectedFile.split('.').pop() || 'text'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
