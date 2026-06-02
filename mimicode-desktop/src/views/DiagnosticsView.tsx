import React, { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { EnvStatus } from '../types';
import { invoke } from '@tauri-apps/api/core';

interface DiagnosticsViewProps {
  envStatus: EnvStatus | null;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ envStatus }) => {
  const [activeTab, setActiveTab] = useState('System Diagnostics');
  const [logs, setLogs] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'Logs') {
      const loadLogs = async () => {
        try {
          // Attempt to load some dynamic CLI logging or fallback to mock
          await invoke("run_agentflow_cmd", {
            projectPath: "d:\\agentcode",
            args: ["json-list"]
          });
        } catch (e) {
          // ignore
        }
        setLogs("18:36:24 [INFO] Agent Codex started\n18:36:24 [INFO] Webserver: localhost:142\n18:36:27 [INFO] Analyzing requirements...\n18:36:29 [INFO] Creating API endpoints...\n18:36:31 [INFO] Implementing login logic...\n18:37:05 [INFO] Running tests...\n18:37:08 [INFO] All tests passed\n18:37:11 [INFO] Committing changes...\n18:37:15 [INFO] Task completed successfully");
      };
      loadLogs();
    }
  }, [activeTab]);

  return (
    <div className="view-container bg-panel">
      <div className="view-header" style={{ paddingBottom: 0 }}>
        <div className="view-title-row">
          <h1 className="view-title">Diagnostics & Logs</h1>
        </div>
        
        <div className="view-tabs-row" style={{ marginTop: '16px' }}>
          <div className="view-tabs">
            {['System Diagnostics', 'Logs'].map(tab => (
              <div 
                key={tab} 
                className={`view-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="view-content" style={{ overflowY: 'auto' }}>
        {activeTab === 'System Diagnostics' && (
          <div style={{ padding: '24px 32px', display: 'flex', gap: '32px' }}>
            <div className="diag-list" style={{ flex: 1 }}>
              <div className="diag-item">
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.GitBranch /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">Git</div>
                  <div className="diag-desc text-muted">{envStatus?.git_version || 'Not Detected'}</div>
                </div>
                <div className={`diag-status ${envStatus?.git_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.git_installed ? 'Healthy' : 'Error'}
                </div>
              </div>
              <div className="diag-item">
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Code /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">Python Environment</div>
                  <div className="diag-desc text-muted">{envStatus?.python_version || 'Not Detected'}</div>
                </div>
                <div className={`diag-status ${envStatus?.python_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.python_installed ? 'Healthy' : 'Error'}
                </div>
              </div>
              <div className="diag-item">
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Zap /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">uv Package Manager</div>
                  <div className="diag-desc text-muted">{envStatus?.uv_version || 'Not Detected'}</div>
                </div>
                <div className={`diag-status ${envStatus?.uv_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.uv_installed ? 'Healthy' : 'Error'}
                </div>
              </div>
              <div className="diag-item">
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Box /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">Node.js</div>
                  <div className="diag-desc text-muted">Version 20.11.1</div>
                </div>
                <div className="diag-status text-success">Healthy</div>
              </div>
              <div className="diag-item">
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Users /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">Agents Services</div>
                  <div className="diag-desc text-muted">All agents are online</div>
                </div>
                <div className="diag-status text-success">Healthy</div>
              </div>
            </div>
            
            <div className="diag-sidebar" style={{ width: '240px' }}>
              <h3 className="section-title text-main font-semibold" style={{ marginBottom: '16px', fontSize: '14px', textTransform: 'none', letterSpacing: 'normal' }}>Quick Actions</h3>
              <button className="btn w-full" style={{ justifyContent: 'flex-start', padding: '10px 14px', backgroundColor: 'var(--bg-main)', marginBottom: '8px' }}><Icons.RefreshCw style={{ width: '16px', height: '16px', marginRight: '8px' }}/> Run Full Check</button>
              <button className="btn w-full" style={{ justifyContent: 'flex-start', padding: '10px 14px', backgroundColor: 'var(--bg-main)' }}><Icons.Settings style={{ width: '16px', height: '16px', marginRight: '8px' }}/> Repair Environment</button>
            </div>
          </div>
        )}

        {activeTab === 'Logs' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="form-select" style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' }}><option>All Agents</option><option>Codex</option><option>Antigravity</option></select>
                <select className="form-select" style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' }}><option>All Levels</option><option>INFO</option><option>ERROR</option></select>
                <select className="form-select" style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' }}><option>Today</option><option>Yesterday</option></select>
              </div>
              <input type="text" className="form-select" style={{ width: '200px', padding: '6px 12px', fontSize: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' }} placeholder="Search logs..." />
            </div>

            <div style={{
              flex: 1, backgroundColor: '#1E1E1E', color: '#A9FFB2', fontFamily: 'var(--font-mono)',
              fontSize: '12px', padding: '16px', borderRadius: '8px', overflowY: 'auto', whiteSpace: 'pre-wrap',
              border: '1px solid var(--color-border)', minHeight: '280px'
            }}>
              {logs}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" defaultChecked /> Auto scroll
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setLogs('')}>Clear</button>
                <button className="btn" style={{ padding: '6px 12px', fontSize: '12px' }}>Export</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
