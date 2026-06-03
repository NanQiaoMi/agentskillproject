import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from '../components/Icons';
import { EnvStatus } from '../types';
import { invoke } from '@tauri-apps/api/core';

interface DiagnosticsViewProps {
  envStatus: EnvStatus | null;
  projectPath: string;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ envStatus, projectPath }) => {
  const [activeTab, setActiveTab] = useState('System Diagnostics');
  const [logs, setLogs] = useState<string>('');
  const [nodeVersion, setNodeVersion] = useState<string>('');
  const [nodeHealthy, setNodeHealthy] = useState<boolean>(false);
  const [agentStatus, setAgentStatus] = useState<Record<string, boolean>>({});
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  // Logs tab state
  const [agentFilter, setAgentFilter] = useState('All Agents');
  const [levelFilter, setLevelFilter] = useState('All Levels');
  const [dateFilter, setDateFilter] = useState('Today');
  const [searchText, setSearchText] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Fetch Node.js version on mount
  useEffect(() => {
    fetchNodeVersion();
    fetchAgentStatus();
  }, []);

  // Auto-scroll logs when content changes
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, agentFilter, levelFilter, searchText]);

  const fetchNodeVersion = async () => {
    try {
      const version: string = await invoke('get_node_version');
      setNodeVersion(version);
      setNodeHealthy(true);
    } catch (_e) {
      setNodeVersion('Not Detected');
      setNodeHealthy(false);
    }
  };

  const fetchAgentStatus = async () => {
    try {
      const status: Record<string, boolean> = await invoke('check_agent_clis_running');
      setAgentStatus(status);
    } catch (_e) {
      setAgentStatus({});
    }
  };

  const getAgentSummary = (): { text: string; healthy: boolean } => {
    const entries = Object.entries(agentStatus);
    if (entries.length === 0) return { text: 'Unable to detect', healthy: false };
    const runningCount = entries.filter(([, v]) => v).length;
    const totalCount = entries.length;
    if (runningCount === 0) return { text: 'No agents running', healthy: false };
    if (runningCount === totalCount) return { text: 'All agents are online', healthy: true };
    return { text: `${runningCount}/${totalCount} agents running`, healthy: false };
  };

  const handleRunFullCheck = async () => {
    setIsRunningCheck(true);
    try {
      await Promise.allSettled([
        invoke('check_environment', { projectPath }),
        invoke('check_agent_clis_running').then((status: unknown) => {
          setAgentStatus(status as Record<string, boolean>);
        }),
        fetchNodeVersion(),
      ]);
    } finally {
      setIsRunningCheck(false);
    }
  };

  const handleRepairEnvironment = async () => {
    setIsRepairing(true);
    try {
      await invoke('setup_environment', { projectPath });
    } catch (e) {
      console.error('Repair failed:', e);
    } finally {
      setIsRepairing(false);
    }
  };

  // Load logs when Logs tab is activated
  useEffect(() => {
    if (activeTab === 'Logs') {
      const loadLogs = async () => {
        try {
          const logContent: string = await invoke('read_task_log', {
            projectPath,
            taskId: 'latest',
          });
          setLogs(logContent);
        } catch (_e) {
          setLogs('No logs available');
        }
      };
      loadLogs();
    }
  }, [activeTab, projectPath]);

  const getFilteredLogs = useCallback((): string => {
    if (!logs) return '';
    let lines = logs.split('\n');

    // Agent filter
    if (agentFilter !== 'All Agents') {
      const agentLower = agentFilter.toLowerCase();
      lines = lines.filter(
        (line) => line.toLowerCase().includes(agentLower) || !line.match(/\[(INFO|ERROR|WARN|DEBUG)\]/)
      );
    }

    // Level filter
    if (levelFilter !== 'All Levels') {
      lines = lines.filter(
        (line) => line.includes(`[${levelFilter}]`) || !line.match(/\[(INFO|ERROR|WARN|DEBUG)\]/)
      );
    }

    // Date filter
    if (dateFilter === 'Today') {
      // Show all lines for today (no date-based filtering needed for current logs)
    } else if (dateFilter === 'Yesterday') {
      // For log data without date stamps, show all
    }

    // Text search
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      lines = lines.filter((line) => line.toLowerCase().includes(searchLower));
    }

    return lines.join('\n');
  }, [logs, agentFilter, levelFilter, dateFilter, searchText]);

  const handleExport = () => {
    const content = getFilteredLogs();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostics-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const agentSummary = getAgentSummary();

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
                  <div className="diag-desc text-muted">{nodeVersion || 'Detecting...'}</div>
                </div>
                <div className={`diag-status ${nodeHealthy ? 'text-success' : 'text-destructive'}`}>
                  {nodeHealthy ? 'Healthy' : 'Error'}
                </div>
              </div>
              <div className="diag-item">
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Users /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">Agents Services</div>
                  <div className="diag-desc text-muted">{agentSummary.text}</div>
                </div>
                <div className={`diag-status ${agentSummary.healthy ? 'text-success' : 'text-destructive'}`}>
                  {agentSummary.healthy ? 'Healthy' : 'Error'}
                </div>
              </div>
            </div>
            
            <div className="diag-sidebar" style={{ width: '240px' }}>
              <h3 className="section-title text-main font-semibold" style={{ marginBottom: '16px', fontSize: '14px', textTransform: 'none', letterSpacing: 'normal' }}>Quick Actions</h3>
              <button
                className="btn w-full"
                style={{ justifyContent: 'flex-start', padding: '10px 14px', backgroundColor: 'var(--bg-main)', marginBottom: '8px' }}
                onClick={handleRunFullCheck}
                disabled={isRunningCheck}
              >
                <Icons.RefreshCw style={{ width: '16px', height: '16px', marginRight: '8px', animation: isRunningCheck ? 'spin 1s linear infinite' : undefined }}/>
                {isRunningCheck ? 'Checking...' : 'Run Full Check'}
              </button>
              <button
                className="btn w-full"
                style={{ justifyContent: 'flex-start', padding: '10px 14px', backgroundColor: 'var(--bg-main)' }}
                onClick={handleRepairEnvironment}
                disabled={isRepairing}
              >
                <Icons.Settings style={{ width: '16px', height: '16px', marginRight: '8px', animation: isRepairing ? 'spin 1s linear infinite' : undefined }}/>
                {isRepairing ? 'Repairing...' : 'Repair Environment'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'Logs' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="form-select"
                  style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' }}
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                >
                  <option>All Agents</option>
                  <option>Codex</option>
                  <option>Antigravity</option>
                </select>
                <select
                  className="form-select"
                  style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' }}
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                >
                  <option>All Levels</option>
                  <option>INFO</option>
                  <option>ERROR</option>
                </select>
                <select
                  className="form-select"
                  style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' }}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option>Today</option>
                  <option>Yesterday</option>
                </select>
              </div>
              <input
                type="text"
                className="form-select"
                style={{ width: '200px', padding: '6px 12px', fontSize: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' }}
                placeholder="Search logs..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div
              ref={logContainerRef}
              style={{
                flex: 1, backgroundColor: '#1E1E1E', color: '#A9FFB2', fontFamily: 'var(--font-mono)',
                fontSize: '12px', padding: '16px', borderRadius: '8px', overflowY: 'auto', whiteSpace: 'pre-wrap',
                border: '1px solid var(--color-border)', minHeight: '280px'
              }}
            >
              {getFilteredLogs()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                /> Auto scroll
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setLogs('')}>Clear</button>
                <button className="btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleExport}>Export</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
