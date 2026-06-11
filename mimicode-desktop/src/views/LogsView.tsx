import React, { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';

import { parseMarkdown } from '../utils/markdownParser';
import { runMermaidSafely } from '../utils/mermaidRunner';

interface LogsViewProps {
  projectPath: string;
  terminalLogs: string;
}

interface AgentInfo {
  id: string;
  name: string;
  running: boolean;
}

// Map agent IDs to display-friendly icons
const agentIconMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  codex: Icons.Code,
  antigravity: Icons.Zap,
  claudecode: Icons.Shield,
  opencode: Icons.Activity,
  hermes: Icons.Users,
};

export const LogsView: React.FC<LogsViewProps> = ({ projectPath, terminalLogs }) => {
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>(terminalLogs);
  const [inputText, setInputText] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch the agent list and their running states from the backend
  const fetchAgentList = useCallback(async () => {
    try {
      const [configs, runningStates] = await Promise.all([
        invoke<Record<string, { model: string; config_path: string }>>('read_agent_configs'),
        invoke<Record<string, boolean>>('check_agent_clis_running'),
      ]);

      const agentNames: Record<string, string> = {
        hermes: 'Hermes Agent',
        antigravity: 'Antigravity',
        codex: 'Codex',
        claudecode: 'Claude Code',
        opencode: 'OpenCode CLI',
      };

      const agentList: AgentInfo[] = Object.keys(configs).map((id) => ({
        id,
        name: agentNames[id] || id,
        running: runningStates[id] ?? false,
      }));

      // Sort so running agents come first
      agentList.sort((a, b) => (b.running ? 1 : 0) - (a.running ? 1 : 0));

      setAgents(agentList);

      // Auto-select the first agent if none is selected yet
      if (!selectedAgentId && agentList.length > 0) {
        setSelectedAgentId(agentList[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch agent list:', err);
    }
  }, [selectedAgentId]);

  // Fetch log content for the selected agent
  const fetchLogs = useCallback(async () => {
    if (!projectPath || !selectedAgentId) return;

    try {
      const separator = projectPath.includes('/') ? '/' : '\\';
      const logFilePath = `${projectPath}${separator}.agentflow${separator}logs${separator}agent_${selectedAgentId}.log`;
      const content = await invoke<string | null>('read_file_content', { path: logFilePath });
      if (content) {
        setLogContent(content);
      } else {
        // Fallback to task log if daemon log doesn't exist yet
        try {
          const taskLog = await invoke<string>('read_task_log', {
            projectPath,
            taskId: selectedAgentId,
          });
          setLogContent(taskLog);
        } catch {
          setLogContent(terminalLogs || `Agent "${selectedAgentId}" started. Waiting for command input...`);
        }
      }
    } catch (err) {
      console.error('Failed to read logs:', err);
    }
  }, [projectPath, selectedAgentId, terminalLogs]);

  // Initial load
  useEffect(() => {
    fetchAgentList();
  }, [fetchAgentList]);

  // Poll running states periodically
  useEffect(() => {
    const timer = setInterval(fetchAgentList, 5000);
    return () => clearInterval(timer);
  }, [fetchAgentList]);

  // Ensure daemon runs & Fetch logs periodically
  useEffect(() => {
    if (projectPath && selectedAgentId) {
      invoke('ensure_agent_daemon', { cliName: selectedAgentId, projectPath })
        .catch(err => console.error('Failed to ensure agent daemon:', err));
    }

    fetchLogs();
    const timer = setInterval(fetchLogs, 1500); // 1.5s interval for interactive responsiveness
    return () => clearInterval(timer);
  }, [fetchLogs, projectPath, selectedAgentId]);

  // Auto-scroll to bottom when log content updates
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logContent, commandHistory]);



  // Run mermaid when log content changes
  useEffect(() => {
    let active = true;
    const runMermaid = async () => {
      // Small delay to ensure React has finished rendering the content in dangerouslySetInnerHTML
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (!active) return;
      try {
        await runMermaidSafely();
      } catch (err) {
        // Suppress expected mermaid errors on partial logs
      }
    };

    runMermaid();

    return () => {
      active = false;
    };
  }, [logContent, commandHistory]);

  // Handle reconnect
  const handleReconnect = async () => {
    setIsRefreshing(true);
    if (projectPath && selectedAgentId) {
      await invoke('ensure_agent_daemon', { cliName: selectedAgentId, projectPath }).catch(() => {});
    }
    await fetchAgentList();
    await fetchLogs();
    setIsRefreshing(false);
  };

  // Handle selecting an agent
  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCommandHistory([]);
  };

  // Handle terminal command execution
  const handleCommandSubmit = async () => {
    const cmd = inputText.trim();
    if (!cmd) return;

    setInputText('');

    if (!projectPath) {
      setCommandHistory((prev) => [...prev, '[Error] No project path set. Please select a project first.']);
      return;
    }

    try {
      if (selectedAgentId) {
        await invoke('send_agent_stdin', {
          cliName: selectedAgentId,
          projectPath,
          input: cmd,
        });
      }
    } catch (err: any) {
      setCommandHistory((prev) => [...prev, `[Error] ${err?.toString() || 'Failed to send command'}`]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommandSubmit();
    }
  };

  // Combine log content and command history for display
  const displayContent = logContent + (commandHistory.length > 0 ? '\n' + commandHistory.join('\n') : '');

  return (
    <div className="view-container bg-panel">
      <div className="view-header">
        <div className="view-title-row">
          <div>
            <h1 className="view-title">Logs</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '4px' }}>实时日志与终端输出</p>
          </div>
          <button
            className="btn btn-ghost"
            onClick={handleReconnect}
            disabled={isRefreshing}
          >
            <Icons.RefreshCw style={{
              width: '14px',
              height: '14px',
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }} /> Reconnect
          </button>
        </div>
      </div>

      <div className="view-content" style={{ display: 'flex', gap: '16px', padding: '24px' }}>
        <div className="logs-sidebar">
          {agents.length === 0 ? (
            <div className="logs-agent-item" style={{ opacity: 0.5, justifyContent: 'center' }}>
              <Icons.RefreshCw className="logs-icon" style={{ animation: 'spin 1s linear infinite' }} />
              Loading...
            </div>
          ) : (
            agents.map((agent) => {
              const IconComponent = agentIconMap[agent.id] || Icons.Activity;
              const isSelected = selectedAgentId === agent.id;
              return (
                <div
                  key={agent.id}
                  className={`logs-agent-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectAgent(agent.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <IconComponent className="logs-icon" />
                  <span style={{ flex: 1 }}>
                    {agent.name}
                    {agent.running && (
                      <span style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        marginLeft: '6px',
                        verticalAlign: 'middle',
                      }} />
                    )}
                  </span>
                  {isSelected && <Icons.MoreHorizontal className="logs-more" />}
                </div>
              );
            })
          )}
        </div>
        
        <div className="logs-terminal-container" style={{ backgroundColor: 'var(--bg-main)' }}>
          <div className="rp-terminal-logs" style={{ display: 'block', padding: '32px', paddingBottom: '80px', color: 'var(--color-text-main)', fontSize: '14px', lineHeight: '1.7' }}>
            <div dangerouslySetInnerHTML={{ __html: parseMarkdown(displayContent, 'Agent starting... Waiting for logs...') }} />
            <div ref={consoleBottomRef} />
          </div>
          
          <div className="rp-terminal-input">
            <input 
              type="text" 
              className="rp-term-input-field" 
              placeholder="Type a command..." 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Icons.Send
              style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
              onClick={handleCommandSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
