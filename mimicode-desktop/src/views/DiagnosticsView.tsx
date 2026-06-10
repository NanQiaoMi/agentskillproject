import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Icons } from '../components/Icons';
import { EnvStatus } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../context/AppContext';
import { EnvironmentRepairModal } from '../components/EnvironmentRepairModal';

interface DiagnosticsViewProps {
  envStatus: EnvStatus | null;
  projectPath: string;
}

const translations = {
  English: {
    diagAndLogs: 'Diagnostics & Logs',
    systemDiag: 'System Diagnostics',
    logs: 'Logs',
    notDetected: 'Not Detected',
    detecting: 'Detecting...',
    healthy: 'Healthy',
    error: 'Error',
    git: 'Git',
    pythonEnv: 'Python Environment',
    uvPkg: 'uv Package Manager',
    node: 'Node.js',
    agentsServices: 'Agents Services',
    quickActions: 'Quick Actions',
    checking: 'Checking...',
    runFullCheck: 'Run Full Check',
    repairing: 'Repairing...',
    repairEnv: 'Repair Environment',
    unableToDetect: 'Unable to detect',
    noAgentsRunning: 'No agents running',
    allAgentsOnline: 'All agents are online',
    agentsRunning: 'agents running',
    allAgents: 'All Agents',
    allLevels: 'All Levels',
    today: 'Today',
    yesterday: 'Yesterday',
    searchLogs: 'Search logs...',
    autoScroll: 'Auto scroll',
    clear: 'Clear',
    export: 'Export'
  },
  '简体中文': {
    diagAndLogs: '诊断与日志',
    systemDiag: '系统诊断',
    logs: '日志',
    notDetected: '未检测到',
    detecting: '检测中...',
    healthy: '正常',
    error: '异常',
    git: 'Git',
    pythonEnv: 'Python 环境',
    uvPkg: 'uv 包管理器',
    node: 'Node.js',
    agentsServices: '智能体服务',
    quickActions: '快捷操作',
    checking: '检查中...',
    runFullCheck: '运行完整检查',
    repairing: '修复中...',
    repairEnv: '修复环境',
    unableToDetect: '无法检测',
    noAgentsRunning: '无智能体运行',
    allAgentsOnline: '所有智能体运行中',
    agentsRunning: '个智能体运行中',
    allAgents: '全部智能体',
    allLevels: '全部级别',
    today: '今天',
    yesterday: '昨天',
    searchLogs: '搜索日志...',
    autoScroll: '自动滚动',
    clear: '清空',
    export: '导出'
  }
};

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ envStatus, projectPath }) => {
  const { setEnvStatus, addToast } = useAppContext();
  const [activeTab, setActiveTab] = useState('System Diagnostics');
  const [logs, setLogs] = useState<string>('');
  const [agentStatus, setAgentStatus] = useState<Record<string, boolean>>({});
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);

  // Logs tab state
  const [selectedSource, setSelectedSource] = useState<{ type: 'task' | 'daemon'; id: string }>({ type: 'task', id: 'latest' });
  const [levelFilter, setLevelFilter] = useState('All Levels');
  const [searchText, setSearchText] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  const [availableTasks, setAvailableTasks] = useState<string[]>(['latest']);
  const [terminalInputText, setTerminalInputText] = useState('');
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);

  // Language setup
  const lsGet = (key: string, def: string) => {
    const val = localStorage.getItem(key);
    return val ? val : def;
  };
  const [language, setLanguage] = useState(() => lsGet('mimi-language', '简体中文'));
  const t = useMemo(() => translations[language as keyof typeof translations] || translations['English'], [language]);

  useEffect(() => {
    const handleLang = (e: any) => setLanguage(e.detail);
    window.addEventListener('mimi-language-changed', handleLang);
    return () => window.removeEventListener('mimi-language-changed', handleLang);
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchAgentStatus();
  }, []);

  // Auto-scroll logs when content changes
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, levelFilter, searchText, selectedSource]);

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
    if (entries.length === 0) return { text: t.unableToDetect, healthy: false };
    const runningCount = entries.filter(([, v]) => v).length;
    const totalCount = entries.length;
    if (runningCount === 0) return { text: t.noAgentsRunning, healthy: false };
    if (runningCount === totalCount) return { text: t.allAgentsOnline, healthy: true };
    return { text: `${runningCount}/${totalCount} ${t.agentsRunning}`, healthy: false };
  };

  const handleRunFullCheck = async () => {
    setIsRunningCheck(true);
    try {
      await Promise.allSettled([
        invoke('check_environment', { projectPath }).then((status) => setEnvStatus(status as EnvStatus)),
        invoke('check_agent_clis_running').then((status: unknown) => {
          setAgentStatus(status as Record<string, boolean>);
        })
      ]);
    } finally {
      setIsRunningCheck(false);
      const msg = language === '简体中文' ? '环境检查已完成' : 'Environment check completed';
      addToast(msg, 'success');
    }
  };

  // Scan available tasks from .agentflow/logs/test_*.log
  const fetchAvailableTasks = useCallback(async () => {
    if (!projectPath) return;
    try {
      const isWindows = !projectPath.startsWith('/');
      const command = isWindows 
        ? 'dir /B .agentflow\\logs\\test_*.log' 
        : 'find .agentflow/logs -name "test_*.log" -exec basename {} \\;';
      
      const output = await invoke<string>('run_shell_command', {
        command,
        cwd: projectPath
      });
      
      if (output) {
        const lines = output.split(/\r?\n/);
        const taskIds = lines
          .map(line => {
            const cleanLine = line.trim();
            const filename = cleanLine.split(/[\/\\]/).pop() || '';
            const match = filename.match(/^test_(.+)\.log$/);
            return match ? match[1] : '';
          })
          .filter(id => id && id !== 'latest');
        
        const uniqueTaskIds = Array.from(new Set(taskIds)).sort();
        setAvailableTasks(['latest', ...uniqueTaskIds]);
      }
    } catch (err) {
      console.error('Failed to list historical tasks:', err);
    }
  }, [projectPath]);

  // Load logs
  const fetchLogs = useCallback(async () => {
    if (!projectPath) return;
    try {
      const separator = projectPath.includes('/') ? '/' : '\\';
      if (selectedSource.type === 'daemon') {
        const logFilePath = `${projectPath}${separator}.agentflow${separator}logs${separator}agent_${selectedSource.id}.log`;
        const content = await invoke<string | null>('read_file_content', { path: logFilePath });
        if (content) {
          setLogs(content);
        } else {
          setLogs(`Daemon log not created yet for ${selectedSource.id}. Waiting for agent to spawn...`);
        }
      } else {
        const taskLog = await invoke<string>('read_task_log', {
          projectPath,
          taskId: selectedSource.id,
        });
        setLogs(taskLog);
      }
    } catch (_e) {
      setLogs('No logs available');
    }
  }, [projectPath, selectedSource]);

  // Poll log sources and states
  useEffect(() => {
    if (activeTab !== 'Logs' || !projectPath) return;

    fetchAgentStatus();
    fetchAvailableTasks();
    fetchLogs();

    const statusTimer = setInterval(() => {
      fetchAgentStatus();
      fetchAvailableTasks();
    }, 3000);

    const logsTimer = setInterval(() => {
      fetchLogs();
    }, 1500);

    return () => {
      clearInterval(statusTimer);
      clearInterval(logsTimer);
    };
  }, [activeTab, projectPath, fetchAvailableTasks, fetchLogs]);

  // Fetch immediately when selected source changes
  useEffect(() => {
    if (activeTab === 'Logs' && projectPath) {
      fetchLogs();
    }
  }, [selectedSource, activeTab, projectPath, fetchLogs]);

  const getFilteredLogs = useCallback((): string => {
    if (!logs) return '';
    let lines = logs.split('\n');

    // Level filter
    if (levelFilter !== 'All Levels') {
      lines = lines.filter(
        (line) => line.includes(`[${levelFilter}]`) || line.includes(`[${levelFilter.toLowerCase()}]`)
      );
    }

    // Text search
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      lines = lines.filter((line) => line.toLowerCase().includes(searchLower));
    }

    return lines.join('\n');
  }, [logs, levelFilter, searchText]);

  const handleExport = () => {
    const content = getFilteredLogs();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${selectedSource.type}-${selectedSource.id}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = async () => {
    if (!projectPath) return;
    try {
      const separator = projectPath.includes('/') ? '/' : '\\';
      let logFilePath = '';
      if (selectedSource.type === 'daemon') {
        logFilePath = `${projectPath}${separator}.agentflow${separator}logs${separator}agent_${selectedSource.id}.log`;
      } else {
        logFilePath = `${projectPath}${separator}.agentflow${separator}logs${separator}test_${selectedSource.id}.log`;
      }
      await invoke('write_file_content', { path: logFilePath, content: '' });
      setLogs('');
      addToast(language === '简体中文' ? '日志已成功清空' : 'Logs successfully cleared', 'success');
    } catch (err) {
      console.error('Failed to clear logs:', err);
      setLogs('');
    }
  };

  const handleCommandSubmit = async () => {
    const cmd = terminalInputText.trim();
    if (!cmd || !projectPath || selectedSource.type !== 'daemon') return;

    setTerminalInputText('');
    try {
      await invoke('send_agent_stdin', {
        cliName: selectedSource.id,
        projectPath,
        input: cmd,
      });
      setTimeout(fetchLogs, 200);
    } catch (err: any) {
      addToast(`[Error] ${err?.toString() || 'Failed to send command'}`, 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommandSubmit();
    }
  };

  const daemonAgents = [
    { id: 'hermes', name: 'Hermes Agent', icon: Icons.Users, desc: language === '简体中文' ? '团队协作调度器' : 'Team orchestrator' },
    { id: 'antigravity', name: 'Antigravity', icon: Icons.Zap, desc: language === '简体中文' ? '交互式解题智能体' : 'Interactive solver' },
    { id: 'codex', name: 'Codex', icon: Icons.Code, desc: language === '简体中文' ? '代码生成引擎' : 'Code generation engine' },
    { id: 'claudecode', name: 'Claude Code', icon: Icons.Shield, desc: language === '简体中文' ? '高级代码重构' : 'Advanced refactoring' },
    { id: 'opencode', name: 'OpenCode CLI', icon: Icons.Activity, desc: language === '简体中文' ? '执行时环境' : 'Execution runtime' },
  ];

  const renderLogLines = () => {
    if (!logs) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--color-text-muted)', gap: '12px', opacity: 0.8 }}>
          <Icons.Terminal style={{ width: '40px', height: '40px', strokeWidth: 1.5, opacity: 0.5 }} />
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
            {language === '简体中文' ? '未检测到日志输出... 等待智能体启动' : 'No log output detected... Waiting for agent to spawn.'}
          </div>
        </div>
      );
    }

    const filtered = getFilteredLogs();
    if (!filtered) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--color-text-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
          {language === '简体中文' ? '无匹配的日志记录' : 'No matching log entries.'}
        </div>
      );
    }

    const lines = filtered.split('\n');
    return lines.map((line, index) => {
      if (index === lines.length - 1 && !line.trim()) return null;

      const levelMatch = line.match(/\[(INFO|WARN|ERROR|DEBUG)\]/i);
      let level = '';
      if (levelMatch) {
        level = levelMatch[1].toUpperCase();
      }

      const isStdinEcho = line.trim().startsWith('➜') || line.trim().startsWith('[Stdin]');

      let levelColor = '#D1D5DB';
      if (isStdinEcho) {
        levelColor = '#38BDF8';
      } else if (level === 'INFO') {
        levelColor = '#10B981';
      } else if (level === 'WARN') {
        levelColor = '#FBBF24';
      } else if (level === 'ERROR') {
        levelColor = '#F43F5E';
      } else if (level === 'DEBUG') {
        levelColor = '#A78BFA';
      }

      let timestamp = '';
      let logText = line;
      
      const timeMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3}|\d{2}:\d{2}:\d{2})\s*(.*)$/);
      if (timeMatch) {
        timestamp = timeMatch[1];
        logText = timeMatch[2];
      }

      return (
        <div 
          key={index} 
          style={{ 
            display: 'flex', 
            minHeight: '22px', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.02)',
            padding: '2px 0'
          }}
        >
          <div 
            style={{ 
              width: '45px', 
              textAlign: 'right', 
              color: '#475569', 
              paddingRight: '12px', 
              userSelect: 'none',
              borderRight: '1px solid rgba(255, 255, 255, 0.05)',
              flexShrink: 0
            }}
          >
            {index + 1}
          </div>

          <div style={{ paddingLeft: '12px', flex: 1, wordBreak: 'break-all', whiteSpace: 'pre-wrap', color: isStdinEcho ? '#38BDF8' : '#D1D5DB' }}>
            {timestamp && (
              <span style={{ color: '#475569', marginRight: '8px', userSelect: 'none' }}>
                {timestamp}
              </span>
            )}
            {level && (
              <span style={{ color: levelColor, fontWeight: 'bold', marginRight: '8px' }}>
                [{level}]
              </span>
            )}
            <span>
              {logText}
            </span>
          </div>
        </div>
      );
    });
  };

  const agentSummary = getAgentSummary();

  return (
    <div className="view-container bg-panel">
      <div className="view-header" style={{ paddingBottom: 0 }}>
        <div className="view-title-row">
          <h1 className="view-title">{t.diagAndLogs}</h1>
        </div>
        
        <div className="view-tabs-row" style={{ marginTop: '16px' }}>
          <div className="view-tabs">
            {[{key: 'System Diagnostics', label: t.systemDiag}, {key: 'Logs', label: t.logs}].map(tab => (
              <div 
                key={tab.key} 
                className={`view-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="view-content" style={{ overflowY: 'auto' }}>
        {activeTab === 'System Diagnostics' && (
          <div style={{ padding: '24px 32px', display: 'flex', gap: '32px' }}>
            <div className="diag-list" style={{ flex: 1 }}>
              <div className="diag-item" style={{ '--i': 0 } as React.CSSProperties}>
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.GitBranch /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">{t.git}</div>
                  <div className="diag-desc text-muted">{envStatus?.git_version || t.notDetected}</div>
                </div>
                <div className={`diag-status ${envStatus?.git_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.git_installed ? t.healthy : t.error}
                </div>
              </div>
              <div className="diag-item" style={{ '--i': 1 } as React.CSSProperties}>
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Code /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">{t.pythonEnv}</div>
                  <div className="diag-desc text-muted">{envStatus?.python_version || t.notDetected}</div>
                </div>
                <div className={`diag-status ${envStatus?.python_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.python_installed ? t.healthy : t.error}
                </div>
              </div>
              <div className="diag-item" style={{ '--i': 2 } as React.CSSProperties}>
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Zap /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">{t.uvPkg}</div>
                  <div className="diag-desc text-muted">{envStatus?.uv_version || t.notDetected}</div>
                </div>
                <div className={`diag-status ${envStatus?.uv_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.uv_installed ? t.healthy : t.error}
                </div>
              </div>
              <div className="diag-item" style={{ '--i': 3 } as React.CSSProperties}>
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Box /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">{t.node}</div>
                  <div className="diag-desc text-muted">{envStatus?.node_version || t.notDetected}</div>
                </div>
                <div className={`diag-status ${envStatus?.node_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.node_installed ? t.healthy : t.error}
                </div>
              </div>
              <div className="diag-item" style={{ '--i': 4 } as React.CSSProperties}>
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Box /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">npm</div>
                  <div className="diag-desc text-muted">{envStatus?.npm_version || t.notDetected}</div>
                </div>
                <div className={`diag-status ${envStatus?.npm_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.npm_installed ? t.healthy : t.error}
                </div>
              </div>
              <div className="diag-item" style={{ '--i': 5 } as React.CSSProperties}>
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Users /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">Smithery CLI</div>
                  <div className="diag-desc text-muted">{envStatus?.smithery_installed ? 'Installed' : t.notDetected}</div>
                </div>
                <div className={`diag-status ${envStatus?.smithery_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.smithery_installed ? t.healthy : t.error}
                </div>
              </div>
              <div className="diag-item" style={{ '--i': 6 } as React.CSSProperties}>
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Users /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">Claude Code CLI</div>
                  <div className="diag-desc text-muted">{envStatus?.claude_code_installed ? 'Installed' : t.notDetected}</div>
                </div>
                <div className={`diag-status ${envStatus?.claude_code_installed ? 'text-success' : 'text-destructive'}`}>
                  {envStatus?.claude_code_installed ? t.healthy : t.error}
                </div>
              </div>
              <div className="diag-item" style={{ '--i': 7 } as React.CSSProperties}>
                <div className="diag-icon-wrapper" style={{ backgroundColor: 'transparent' }}><Icons.Users /></div>
                <div className="diag-info">
                  <div className="diag-name font-semibold">{t.agentsServices} (Running)</div>
                  <div className="diag-desc text-muted">{agentSummary.text}</div>
                </div>
                <div className={`diag-status ${agentSummary.healthy ? 'text-success' : 'text-destructive'}`}>
                  {agentSummary.healthy ? t.healthy : t.error}
                </div>
              </div>
            </div>
            
            <div className="diag-sidebar" style={{ width: '240px' }}>
              <h3 className="section-title text-main font-semibold" style={{ marginBottom: '16px', fontSize: '14px', textTransform: 'none', letterSpacing: 'normal' }}>{t.quickActions}</h3>
              <button
                className="btn w-full"
                style={{ justifyContent: 'flex-start', padding: '10px 14px', backgroundColor: 'var(--bg-main)', marginBottom: '8px' }}
                onClick={handleRunFullCheck}
                disabled={isRunningCheck}
              >
                <Icons.RefreshCw style={{ width: '16px', height: '16px', marginRight: '8px', animation: isRunningCheck ? 'spin 1s linear infinite' : undefined }}/>
                {isRunningCheck ? t.checking : t.runFullCheck}
              </button>
              <button
                className="btn w-full"
                style={{ justifyContent: 'flex-start', padding: '10px 14px', backgroundColor: 'var(--bg-main)' }}
                onClick={() => setIsRepairModalOpen(true)}
              >
                <Icons.Settings style={{ width: '16px', height: '16px', marginRight: '8px' }}/>
                {t.repairEnv}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'Logs' && (
          <div style={{ display: 'flex', gap: '20px', padding: '24px', height: 'calc(100% - 20px)', boxSizing: 'border-box', overflow: 'hidden' }}>
            {/* Sidebar (Left) */}
            <div 
              className="logs-sidebar" 
              style={{ 
                width: '260px', 
                flexShrink: 0, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                background: 'var(--bg-main)', 
                border: '1px solid var(--color-border)', 
                borderRadius: '12px', 
                padding: '16px',
                boxSizing: 'border-box',
                overflowY: 'auto'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '4px' }}>
                {language === '简体中文' ? '任务执行日志' : 'Task Run Logs'}
              </div>
              <div
                className={`logs-agent-item ${selectedSource.type === 'task' ? 'active' : ''}`}
                onClick={() => setSelectedSource({ type: 'task', id: 'latest' })}
                onMouseEnter={() => setHoveredSource('task')}
                onMouseLeave={() => setHoveredSource(null)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  background: selectedSource.type === 'task' 
                    ? 'rgba(232, 104, 74, 0.08)' 
                    : hoveredSource === 'task' 
                      ? 'var(--bg-hover)' 
                      : 'transparent',
                  border: selectedSource.type === 'task' ? '1px solid rgba(232, 104, 74, 0.2)' : '1px solid transparent'
                }}
              >
                <Icons.Terminal style={{ width: '16px', height: '16px', color: selectedSource.type === 'task' ? 'var(--color-primary-orange)' : 'var(--color-text-secondary)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: selectedSource.type === 'task' ? 600 : 500, color: selectedSource.type === 'task' ? 'var(--color-primary-orange)' : 'var(--color-text-main)' }}>
                    {language === '简体中文' ? '智能体任务执行' : 'All Agents Tasks'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {language === '简体中文' ? '历史与最新任务输出' : 'History & latest runs'}
                  </span>
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--color-border)', margin: '8px 0' }} />

              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '4px' }}>
                {language === '简体中文' ? '智能体后台服务' : 'Agent Daemon Services'}
              </div>
              
              {daemonAgents.map(agent => {
                const IconComponent = agent.icon;
                const isSelected = selectedSource.type === 'daemon' && selectedSource.id === agent.id;
                const isHovered = hoveredSource === agent.id;
                const isRunning = agentStatus[agent.id] ?? false;

                return (
                  <div
                    key={agent.id}
                    className={`logs-agent-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedSource({ type: 'daemon', id: agent.id })}
                    onMouseEnter={() => setHoveredSource(agent.id)}
                    onMouseLeave={() => setHoveredSource(null)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      background: isSelected 
                        ? 'rgba(232, 104, 74, 0.08)' 
                        : isHovered 
                          ? 'var(--bg-hover)' 
                          : 'transparent',
                      border: isSelected ? '1px solid rgba(232, 104, 74, 0.2)' : '1px solid transparent'
                    }}
                  >
                    <IconComponent style={{ width: '16px', height: '16px', color: isSelected ? 'var(--color-primary-orange)' : 'var(--color-text-secondary)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--color-primary-orange)' : 'var(--color-text-main)' }}>
                          {agent.name}
                        </span>
                        {/* Status glow dot */}
                        <span 
                          style={{
                            display: 'inline-block',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isRunning ? '#10B981' : '#64748B',
                            boxShadow: isRunning ? '0 0 6px #10B981' : 'none',
                            transition: 'all 0.3s'
                          }} 
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {agent.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Terminal Main Window (Right) */}
            <div 
              style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                background: '#090D16', 
                border: '1px solid var(--color-border)', 
                borderRadius: '12px', 
                overflow: 'hidden', 
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                boxSizing: 'border-box'
              }}
            >
              {/* Terminal Window Header */}
              <div 
                style={{ 
                  height: '42px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '0 16px', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
                  background: 'rgba(15, 23, 42, 0.6)',
                  userSelect: 'none'
                }}
              >
                {/* macOS Control Dots */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#EF4444', opacity: 0.8 }} />
                  <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#F59E0B', opacity: 0.8 }} />
                  <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#10B981', opacity: 0.8 }} />
                  <span style={{ marginLeft: '12px', color: '#64748B', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    {selectedSource.type === 'task' 
                      ? `.agentflow/logs/test_${selectedSource.id}.log` 
                      : `.agentflow/logs/agent_${selectedSource.id}.log`}
                  </span>
                </div>

                {/* Quick actions (Right side of header) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      style={{ accentColor: 'var(--color-primary-orange)' }}
                    />
                    {t.autoScroll}
                  </label>
                  <button 
                    onClick={handleClear} 
                    style={{ background: 'none', border: 'none', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '2px 4px', borderRadius: '4px', transition: 'all 0.2s' }}
                    title={t.clear}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
                  >
                    <Icons.Trash2 style={{ width: '12px', height: '12px' }} />
                    {t.clear}
                  </button>
                  <button 
                    onClick={handleExport} 
                    style={{ background: 'none', border: 'none', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '2px 4px', borderRadius: '4px', transition: 'all 0.2s' }}
                    title={t.export}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
                  >
                    <Icons.FileText style={{ width: '12px', height: '12px' }} />
                    {t.export}
                  </button>
                </div>
              </div>

              {/* Log Filter Toolbar */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '8px 16px', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
                  background: 'rgba(9, 13, 22, 0.8)' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Task ID Dropdown (only visible when type === 'task') */}
                  {selectedSource.type === 'task' && (
                    <select
                      className="form-select"
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '11px', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '6px', 
                        backgroundColor: '#0F172A', 
                        color: '#E2E8F0',
                        fontFamily: 'var(--font-mono)',
                        height: '26px'
                      }}
                      value={selectedSource.id}
                      onChange={(e) => setSelectedSource({ type: 'task', id: e.target.value })}
                    >
                      {availableTasks.map(task => (
                        <option key={task} value={task}>Task: {task === 'latest' ? 'latest (最新)' : task}</option>
                      ))}
                    </select>
                  )}

                  {/* Level dropdown */}
                  <select
                    className="form-select"
                    style={{ 
                      padding: '4px 8px', 
                      fontSize: '11px', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '6px', 
                      backgroundColor: '#0F172A', 
                      color: '#E2E8F0',
                      fontFamily: 'var(--font-mono)',
                      height: '26px'
                    }}
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                  >
                    <option value="All Levels">{t.allLevels}</option>
                    <option value="INFO">INFO</option>
                    <option value="WARN">WARN</option>
                    <option value="ERROR">ERROR</option>
                    <option value="DEBUG">DEBUG</option>
                  </select>
                </div>

                {/* Search Field */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Icons.Search style={{ position: 'absolute', left: '8px', width: '12px', height: '12px', color: '#64748B' }} />
                  <input
                    type="text"
                    className="form-select"
                    style={{ 
                      width: '180px', 
                      padding: '4px 8px 4px 26px', 
                      fontSize: '11px', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '6px', 
                      backgroundColor: '#0F172A', 
                      color: '#E2E8F0',
                      height: '26px',
                      fontFamily: 'var(--font-mono)'
                    }}
                    placeholder={t.searchLogs}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
              </div>

              {/* Console Viewport */}
              <div
                ref={logContainerRef}
                style={{
                  flex: 1,
                  backgroundColor: '#060913',
                  padding: '16px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  minHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1px'
                }}
              >
                {renderLogLines()}
                <div ref={consoleBottomRef} />
              </div>

              {/* Interactive Stdin Bar (visible only for active daemons) */}
              {selectedSource.type === 'daemon' && (
                <div 
                  style={{ 
                    padding: '12px 16px', 
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
                    background: 'rgba(15, 23, 42, 0.8)', 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  {agentStatus[selectedSource.id] ? (
                    <>
                      <span style={{ color: '#38BDF8', fontSize: '14px', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>➜</span>
                      <input 
                        type="text" 
                        className="rp-term-input-field" 
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: 'none',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          color: '#F8FAFC',
                          outline: 'none'
                        }}
                        placeholder={
                          language === '简体中文' 
                            ? `向 ${selectedSource.id} 智能体输入指令...` 
                            : `Send instruction to ${selectedSource.id} agent...`
                        }
                        value={terminalInputText}
                        onChange={(e) => setTerminalInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <Icons.Send
                        style={{ color: '#38BDF8', cursor: 'pointer', width: '16px', height: '16px' }}
                        onClick={handleCommandSubmit}
                      />
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                      <Icons.AlertTriangle style={{ width: '14px', height: '14px', color: '#F59E0B' }} />
                      <span>
                        {language === '简体中文' 
                          ? '当前智能体后台服务未运行。输入不可用。' 
                          : 'Daemon is currently not running. Stdin input disabled.'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <EnvironmentRepairModal 
        isOpen={isRepairModalOpen}
        onClose={() => setIsRepairModalOpen(false)}
        envStatus={envStatus}
        projectPath={projectPath}
        language={language}
        onRepairComplete={handleRunFullCheck}
      />
    </div>
  );
};
