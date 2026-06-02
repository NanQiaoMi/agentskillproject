import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TaskTerminalTabProps {
  projectPath: string;
  taskId: string;
}

export const TaskTerminalTab: React.FC<TaskTerminalTabProps> = ({ projectPath, taskId }) => {
  const [activeTermTab, setActiveTermTab] = useState('agentflow');
  const [logContent, setLogContent] = useState('');

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

  return (
    <div className="tab-pane-full flex-col">
      <div className="terminal-tabs-row">
        {['agentflow', 'bash', 'pytest', 'git'].map(tab => (
          <div 
            key={tab}
            className={`term-tab ${activeTermTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTermTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>
      
      <div className="terminal-window">
        {activeTermTab === 'agentflow' && (
          <div className="term-content font-mono text-xs">
            {logContent.split('\n').map((line, i) => (
              <div key={i} className="term-line" style={{ whiteSpace: 'pre-wrap' }}>
                {line}
              </div>
            ))}
            <div className="term-line"><span className="term-cursor"></span></div>
          </div>
        )}
        
        {activeTermTab === 'git' && (
          <div className="term-content font-mono text-xs">
            <div className="term-line"><span className="term-prompt">(venv) ➜</span> <span className="term-cmd">git status</span></div>
            <div className="term-line">On branch feature/{taskId}</div>
            <div className="term-line">nothing to commit, working tree clean</div>
            <div className="term-line"><span className="term-prompt">(venv) ➜</span> <span className="term-cursor"></span></div>
          </div>
        )}
        
        {activeTermTab === 'pytest' && (
          <div className="term-content font-mono text-xs">
            <div className="term-line"><span className="term-prompt">(venv) ➜</span> <span className="term-cmd">pytest</span></div>
            <div className="term-line"><span className="term-prompt">(venv) ➜</span> <span className="term-cursor"></span></div>
          </div>
        )}
      </div>
    </div>
  );
};
