import React, { useEffect, useState, useRef } from 'react';
import { logger, LogEntry } from '../utils/logger';
import * as Icons from './Icons';

export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial fetch
    setLogs(logger.getLogs());
    
    // Subscribe to new logs
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error': return '#ef4444'; // red
      case 'warn': return '#f59e0b'; // yellow
      case 'debug': return '#858585'; // gray
      case 'info':
      default: return '#e7e7e7'; // white
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error': return <Icons.XCircle style={{ color: '#ef4444', width: 14, height: 14, marginTop: 2, flexShrink: 0 }} />;
      case 'warn': return <Icons.AlertTriangle style={{ color: '#f59e0b', width: 14, height: 14, marginTop: 2, flexShrink: 0 }} />;
      case 'debug': return <Icons.Settings style={{ color: '#858585', width: 14, height: 14, marginTop: 2, flexShrink: 0 }} />;
      case 'info':
      default: return <Icons.Info style={{ color: '#3b82f6', width: 14, height: 14, marginTop: 2, flexShrink: 0 }} />;
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
      {/* Output Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '4px 12px', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#858585', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={autoScroll} 
              onChange={e => setAutoScroll(e.target.checked)} 
              style={{ accentColor: 'var(--color-primary-orange)' }}
            />
            Auto Scroll
          </label>
          <div style={{ width: '1px', height: '14px', backgroundColor: '#333', margin: '0 4px', alignSelf: 'center' }} />
          <button 
            className="btn-icon-ghost" 
            onClick={() => logger.clearLogs()}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '2px 6px', color: '#858585' }}
            title="Clear Output"
          >
            <Icons.Trash2 width={12} height={12} /> Clear
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div 
        ref={containerRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '8px 12px',
          fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
          fontSize: '13px',
          lineHeight: '1.5',
          boxSizing: 'border-box'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#858585', fontStyle: 'italic' }}>No output to display.</div>
        ) : (
          logs.map(log => (
            <div key={log.id} style={{ display: 'flex', gap: '8px', marginBottom: '4px', color: getLogColor(log.level), wordBreak: 'break-all' }}>
              <div style={{ color: '#666', flexShrink: 0, width: '75px', fontSize: '12px', marginTop: 1 }}>
                {log.timestamp.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              {getLogIcon(log.level)}
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {log.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
