import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TaskTerminalTabProps {
  projectPath: string;
  taskId: string;
}

interface BashHistoryItem {
  type: 'cmd' | 'output' | 'error';
  text: string;
}

export const TaskTerminalTab: React.FC<TaskTerminalTabProps> = ({ projectPath, taskId }) => {
  const [activeTermTab, setActiveTermTab] = useState('agentflow');
  const [logContent, setLogContent] = useState('');

  // Git state
  const [gitStatus, setGitStatus] = useState('');
  const [gitLoading, setGitLoading] = useState(false);

  // Pytest state
  const [pytestStatus, setPytestStatus] = useState('');
  const [pytestLoading, setPytestLoading] = useState(false);

  // Bash state
  const [bashHistory, setBashHistory] = useState<BashHistoryItem[]>([
    { type: 'output', text: 'Welcome to MIMIcode Terminal. Run commands in your workspace project directory.' }
  ]);
  const [bashInput, setBashInput] = useState('');
  const [bashRunning, setBashRunning] = useState(false);

  const termEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll inside terminal window
  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logContent, gitStatus, pytestStatus, bashHistory, activeTermTab]);

  // AgentFlow log streaming
  useEffect(() => {
    if (activeTermTab !== 'agentflow') return;
    
    const fetchLog = async () => {
      try {
        const content = await invoke("read_task_log", { projectPath, taskId });
        setLogContent(content as string);
      } catch (e) {
        // file might not exist yet
      }
    };
    
    fetchLog();
    const interval = setInterval(fetchLog, 2000);
    return () => clearInterval(interval);
  }, [projectPath, taskId, activeTermTab]);

  // Git Status loading
  useEffect(() => {
    if (activeTermTab !== 'git') return;
    
    const fetchGit = async () => {
      setGitLoading(true);
      try {
        const status = await invoke<string>("get_git_status", { repoPath: projectPath });
        setGitStatus(status || 'nothing to commit, working tree clean');
      } catch (err: any) {
        setGitStatus('Error running git status: ' + err.toString());
      } finally {
        setGitLoading(false);
      }
    };
    fetchGit();
  }, [projectPath, activeTermTab]);

  // Pytest check
  useEffect(() => {
    if (activeTermTab !== 'pytest') return;

    const fetchPytest = async () => {
      setPytestLoading(true);
      try {
        const result = await invoke<string>("run_shell_command", { command: "pytest --version", cwd: projectPath });
        setPytestStatus(result);
      } catch (err: any) {
        setPytestStatus('pytest not found / ' + err.toString());
      } finally {
        setPytestLoading(false);
      }
    };
    fetchPytest();
  }, [projectPath, activeTermTab]);

  // Bash command execution
  const handleBashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bashInput.trim() || bashRunning) return;

    const cmd = bashInput.trim();
    setBashInput('');
    setBashHistory(prev => [...prev, { type: 'cmd', text: cmd }]);
    setBashRunning(true);

    try {
      const output = await invoke<string>("run_shell_command", { command: cmd, cwd: projectPath });
      setBashHistory(prev => [...prev, { type: 'output', text: output }]);
    } catch (err: any) {
      setBashHistory(prev => [...prev, { type: 'error', text: err.toString() }]);
    } finally {
      setBashRunning(false);
    }
  };

  return (
    <div className="tab-pane-full flex-col" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="terminal-tabs-row" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
        {['agentflow', 'bash', 'pytest', 'git'].map(tab => (
          <div 
            key={tab}
            className={`term-tab ${activeTermTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTermTab(tab)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              borderBottom: activeTermTab === tab ? '2px solid var(--color-primary-orange)' : 'none',
              color: activeTermTab === tab ? 'var(--color-text-main)' : 'var(--color-text-muted)'
            }}
          >
            {tab}
          </div>
        ))}
      </div>
      
      <div className="terminal-window" style={{ flex: 1, backgroundColor: 'var(--bg-terminal, #1e1e1e)', color: '#d4d4d4', overflowY: 'auto', padding: '16px', fontFamily: '"Cascadia Code", "Fira Code", monospace', display: 'flex', flexDirection: 'column' }}>
        {activeTermTab === 'agentflow' && (
          <div className="term-content font-mono text-xs" style={{ flex: 1 }}>
            {logContent.trim() ? logContent.split('\n').map((line, i) => (
              <div key={i} className="term-line" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {line}
              </div>
            )) : <div style={{ color: 'var(--color-text-muted)' }}>No logs available for this task.</div>}
            <div ref={termEndRef} />
          </div>
        )}
        
        {activeTermTab === 'git' && (
          <div className="term-content font-mono text-xs" style={{ flex: 1 }}>
            <div className="term-line" style={{ color: '#888' }}><span className="term-prompt">➜</span> <span className="term-cmd">git status</span></div>
            {gitLoading ? (
              <div className="term-line">Running git status...</div>
            ) : (
              gitStatus.split('\n').map((line, i) => (
                <div key={i} className="term-line" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {line}
                </div>
              ))
            )}
            <div ref={termEndRef} />
          </div>
        )}
        
        {activeTermTab === 'pytest' && (
          <div className="term-content font-mono text-xs" style={{ flex: 1 }}>
            <div className="term-line" style={{ color: '#888' }}><span className="term-prompt">➜</span> <span className="term-cmd">pytest --version</span></div>
            {pytestLoading ? (
              <div className="term-line">Running pytest...</div>
            ) : (
              pytestStatus.split('\n').map((line, i) => (
                <div key={i} className="term-line" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {line}
                </div>
              ))
            )}
            <div ref={termEndRef} />
          </div>
        )}

        {activeTermTab === 'bash' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="term-content font-mono text-xs" style={{ flex: 1 }}>
              {bashHistory.map((item, i) => (
                <div key={i} className="term-line" style={{ 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: 1.5,
                  color: item.type === 'cmd' ? '#3B82F6' : item.type === 'error' ? '#EF4444' : '#d4d4d4'
                }}>
                  {item.type === 'cmd' && <span style={{ color: '#10B981', marginRight: '8px' }}>➜</span>}
                  {item.text}
                </div>
              ))}
              {bashRunning && <div className="term-line" style={{ color: '#888' }}>Running command...</div>}
              <div ref={termEndRef} />
            </div>
            
            <form onSubmit={handleBashSubmit} style={{ display: 'flex', marginTop: '12px', borderTop: '1px solid #333', paddingTop: '8px' }}>
              <span style={{ color: '#10B981', fontFamily: 'monospace', marginRight: '8px', display: 'flex', alignItems: 'center' }}>➜</span>
              <input
                type="text"
                value={bashInput}
                onChange={e => setBashInput(e.target.value)}
                placeholder="Type bash command and press Enter..."
                disabled={bashRunning}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontFamily: '"Cascadia Code", "Fira Code", monospace',
                  fontSize: '12px'
                }}
              />
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
