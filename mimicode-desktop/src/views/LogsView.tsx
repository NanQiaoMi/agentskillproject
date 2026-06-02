import React, { useEffect, useRef } from 'react';
import { Icons } from '../components/Icons';

interface LogsViewProps {
  terminalLogs: string;
}

export const LogsView: React.FC<LogsViewProps> = ({ terminalLogs }) => {
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  return (
    <div className="view-container bg-panel">
      <div className="view-header">
        <div className="view-title-row">
          <div>
            <h1 className="view-title">Logs</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '4px' }}>实时日志与终端输出</p>
          </div>
          <button className="btn btn-ghost">
            <Icons.RefreshCw style={{ width: '14px', height: '14px' }} /> Reconnect
          </button>
        </div>
      </div>

      <div className="view-content" style={{ display: 'flex', gap: '16px', padding: '24px' }}>
        <div className="logs-sidebar">
          <div className="logs-agent-item active">
            <Icons.Code className="logs-icon" /> Codex (PID: 16432)
            <Icons.MoreHorizontal className="logs-more" />
          </div>
          <div className="logs-agent-item">
            <Icons.Zap className="logs-icon" /> Antigravity (PID: 16433)
          </div>
          <div className="logs-agent-item">
            <Icons.Shield className="logs-icon" /> Claudecode (PID: 16434)
          </div>
          <div className="logs-agent-item">
            <Icons.Activity className="logs-icon" /> OpenCode CLI (PID: 16435)
          </div>
          <div className="logs-agent-item">
            <Icons.Users className="logs-icon" /> Hermes Agent (PID: 16436)
          </div>
        </div>
        
        <div className="logs-terminal-container">
          <div className="rp-terminal-logs">
            {terminalLogs.split('\n').map((line, index) => {
              if (!line.trim()) return null;
              
              const match = line.match(/^(\d{2}:\d{2}:\d{2})\s+\[([A-Z]+)\]\s+(.*)$/);
              if (match) {
                const [, time, level, msg] = match;
                const levelLower = level.toLowerCase();
                return (
                  <div key={index} className="log-line">
                    <span className="log-time">{time}</span>
                    <span className={`log-level ${levelLower}`}>[{level}]</span>
                    <span style={{ color: 'var(--color-text-main)' }}>{msg}</span>
                  </div>
                );
              }
              
              return (
                <div key={index} className="log-line" style={{ color: 'var(--color-text-main)' }}>
                  {line}
                </div>
              );
            })}
            <div ref={consoleBottomRef} />
          </div>
          
          <div className="rp-terminal-input">
            <input 
              type="text" 
              className="rp-term-input-field" 
              placeholder="Type a command..." 
            />
            <Icons.Send style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
