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
    <div className="tab-pane-full flex-col" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: '#0A0A0A' }}>
      <div className="terminal-tabs-row" style={{ display: 'flex', borderBottom: '1px solid #333', backgroundColor: '#141414', padding: '0 16px' }}>
        {['agentflow', 'bash', 'pytest', 'git'].map(tab => (
          <div 
            key={tab}
            className={`term-tab ${activeTermTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTermTab(tab)}
            style={{
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              borderBottom: activeTermTab === tab ? '2px solid #E8684A' : '2px solid transparent',
              color: activeTermTab === tab ? '#E2E8F0' : '#64748B',
              textTransform: 'capitalize',
              transition: 'all 0.2s ease'
            }}
          >
            {tab === 'agentflow' ? 'AgentFlow' : tab}
          </div>
        ))}
      </div>
      
      <div className="terminal-window" style={{ flex: 1, backgroundColor: '#0A0A0A', color: '#D4D4D4', overflowY: 'auto', padding: '24px', fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace', display: 'flex', flexDirection: 'column', fontSize: '13px', lineHeight: 1.6 }}>
        {activeTermTab === 'agentflow' && (
          <div className="term-content font-mono" style={{ flex: 1 }}>
            {logContent.trim() ? logContent.split('\n').map((line, i) => {
              // Basic colorization for logs
              let color = '#D4D4D4';
              if (line.includes('[INFO]')) color = '#3B82F6';
              else if (line.includes('[ERROR]')) color = '#EF4444';
              else if (line.includes('[WARN]')) color = '#F59E0B';
              else if (line.includes('[SUCCESS]')) color = '#10B981';
              return (
                <div key={i} className="term-line" style={{ whiteSpace: 'pre-wrap', color }}>
                  {line}
                </div>
              );
            }) : <div style={{ color: '#64748B' }}>No logs available for this task.</div>}
            <div ref={termEndRef} />
          </div>
        )}
        
        {activeTermTab === 'git' && (
          <div className="term-content font-mono" style={{ flex: 1 }}>
            <div className="term-line"><span style={{ color: '#10B981', marginRight: '8px' }}>➜</span> <span style={{ color: '#60A5FA', marginRight: '8px' }}>workspace</span> <span style={{ color: '#E2E8F0' }}>git status</span></div>
            {gitLoading ? (
              <div className="term-line" style={{ color: '#64748B', marginTop: '8px' }}>Running git status...</div>
            ) : (
              <div style={{ marginTop: '8px' }}>
                {gitStatus.split('\n').map((line, i) => {
                  let color = '#D4D4D4';
                  if (line.includes('modified:')) color = '#EF4444';
                  else if (line.includes('new file:')) color = '#10B981';
                  else if (line.includes('Untracked files:')) color = '#F59E0B';
                  return (
                    <div key={i} className="term-line" style={{ whiteSpace: 'pre-wrap', color }}>
                      {line}
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={termEndRef} />
          </div>
        )}
        
        {activeTermTab === 'pytest' && (
          <div className="term-content font-mono" style={{ flex: 1 }}>
            <div className="term-line"><span style={{ color: '#10B981', marginRight: '8px' }}>➜</span> <span style={{ color: '#60A5FA', marginRight: '8px' }}>workspace</span> <span style={{ color: '#E2E8F0' }}>pytest --version</span></div>
            {pytestLoading ? (
              <div className="term-line" style={{ color: '#64748B', marginTop: '8px' }}>Running pytest...</div>
            ) : (
              <div style={{ marginTop: '8px' }}>
                {pytestStatus.split('\n').map((line, i) => (
                  <div key={i} className="term-line" style={{ whiteSpace: 'pre-wrap' }}>
                    {line}
                  </div>
                ))}
              </div>
            )}
            <div ref={termEndRef} />
          </div>
        )}

        {activeTermTab === 'bash' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="term-content font-mono" style={{ flex: 1 }}>
              {bashHistory.map((item, i) => (
                <div key={i} className="term-line" style={{ 
                  whiteSpace: 'pre-wrap', 
                  color: item.type === 'cmd' ? '#E2E8F0' : item.type === 'error' ? '#EF4444' : '#94A3B8',
                  marginTop: item.type === 'cmd' && i > 0 ? '16px' : '4px'
                }}>
                  {item.type === 'cmd' && <><span style={{ color: '#10B981', marginRight: '8px' }}>➜</span> <span style={{ color: '#60A5FA', marginRight: '8px' }}>workspace</span></>}
                  {item.text}
                </div>
              ))}
              {bashRunning && <div className="term-line" style={{ color: '#64748B', marginTop: '8px' }}>Running command...</div>}
              <div ref={termEndRef} />
            </div>
            
            <form onSubmit={handleBashSubmit} style={{ display: 'flex', marginTop: '16px', borderTop: '1px solid #333', paddingTop: '16px', alignItems: 'center' }}>
              <span style={{ color: '#10B981', marginRight: '8px' }}>➜</span>
              <span style={{ color: '#60A5FA', marginRight: '8px' }}>workspace</span>
              <input
                type="text"
                value={bashInput}
                onChange={e => setBashInput(e.target.value)}
                placeholder=""
                disabled={bashRunning}
                autoFocus
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#F8FAFC',
                  fontFamily: '"Cascadia Code", "Fira Code", monospace',
                  fontSize: '13px',
                  caretColor: '#10B981'
                }}
              />
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
