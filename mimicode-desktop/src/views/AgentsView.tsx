import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';

interface AgentsViewProps {
  projectPath: string;
}

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  desc: string;
  cliName: string;       // maps to launch_external_cli's cli_name
  cliCommand: string;    // display name of the actual CLI command
  color: string;         // avatar background color
  model: string;         // default model
  availableModels: string[];
  maxTokens: number;
  autoApprove: boolean;
  configPath?: string;
}

const defaultAgents: AgentConfig[] = [
  {
    id: 'hermes', name: 'Hermes Agent', role: 'Planner',
    desc: '负责需求拆解、SDLC 生成、任务规划与分配',
    cliName: 'hermes_agent', cliCommand: 'hermes',
    color: '#EF4444',
    model: 'claude-sonnet-4-20250514', availableModels: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'gpt-4o'],
    maxTokens: 8192, autoApprove: false,
  },
  {
    id: 'antigravity', name: 'Antigravity', role: 'Frontend Expert',
    desc: '专注前端开发，负责 UI/UX 实现与交互逻辑',
    cliName: 'gemini', cliCommand: 'gemini',
    color: '#3B82F6',
    model: 'gemini-2.5-pro', availableModels: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-3.5-pro'],
    maxTokens: 16384, autoApprove: false,
  },
  {
    id: 'codex', name: 'Codex', role: 'Backend Expert',
    desc: '专注后端开发，负责 API、数据库与业务逻辑',
    cliName: 'codex', cliCommand: 'codex',
    color: '#10B981',
    model: 'o4-mini', availableModels: ['o4-mini', 'o3', 'gpt-4o', 'codex-mini-latest'],
    maxTokens: 8192, autoApprove: true,
  },
  {
    id: 'claudecode', name: 'Claude Code', role: 'Auditor',
    desc: '负责代码审查，测试执行与质量把控',
    cliName: 'claude', cliCommand: 'claude',
    color: '#F59E0B',
    model: 'claude-sonnet-4-20250514', availableModels: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3.5-sonnet'],
    maxTokens: 8192, autoApprove: false,
  },
  {
    id: 'opencode', name: 'OpenCode CLI', role: 'Refactorer',
    desc: '负责全局重构，代码搜索与批量优化',
    cliName: 'opencode', cliCommand: 'opencode',
    color: '#8B5CF6',
    model: 'claude-sonnet-4-20250514', availableModels: ['claude-sonnet-4-20250514', 'gpt-4o', 'gemini-2.5-pro'],
    maxTokens: 8192, autoApprove: false,
  },
];

export const AgentsView: React.FC<AgentsViewProps> = ({ projectPath }) => {
  const [agents, setAgents] = useState<AgentConfig[]>(defaultAgents);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [runningAgents, setRunningAgents] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [settingsAgentId, setSettingsAgentId] = useState<string | null>(null);
  const [injectModalAgent, setInjectModalAgent] = useState<AgentConfig | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch configs on mount
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const configs = await invoke<Record<string, { model: string; config_path: string }>>('read_agent_configs');
        setAgents(prev => prev.map(agent => {
          const config = configs[agent.id];
          if (config) {
            const updatedModels = [...agent.availableModels];
            if (config.model && !updatedModels.includes(config.model)) {
              updatedModels.push(config.model);
            }
            return {
              ...agent,
              model: config.model || agent.model,
              availableModels: updatedModels,
              configPath: config.config_path,
            };
          }
          return agent;
        }));
      } catch (err) {
        console.error('Failed to load agent configs:', err);
      }
    };
    fetchConfigs();
  }, []);

  // Poll running states
  useEffect(() => {
    const checkRunning = async () => {
      try {
        const runningStates = await invoke<Record<string, boolean>>('check_agent_clis_running');
        setRunningAgents(runningStates);
      } catch (err) {
        console.error('Failed to check running status:', err);
      }
    };
    checkRunning();
    const timer = setInterval(checkRunning, 2000);
    return () => clearInterval(timer);
  }, []);

  // Listen for Enter / Escape keys to quickly dismiss the modal
  useEffect(() => {
    if (!injectModalAgent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        setInjectModalAgent(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [injectModalAgent]);

  const handleLaunch = async (agent: AgentConfig) => {
    if (!projectPath) {
      alert('请先在左侧选择一个项目目录');
      return;
    }
    setLaunchingId(agent.id);
    try {
      await invoke<string>('launch_external_cli', {
        cliName: agent.cliName,
        projectPath: projectPath,
      });
      setRunningAgents(prev => ({ ...prev, [agent.id]: true }));
      setInjectModalAgent(agent);
      setTimeout(() => setLaunchingId(null), 1000);
    } catch (err: any) {
      alert(`启动 ${agent.name} 失败:\n${err.toString()}`);
      setLaunchingId(null);
    }
  };

  const updateAgentSetting = (agentId: string, key: keyof AgentConfig, value: any) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, [key]: value } : a));
  };

  const settingsAgent = agents.find(a => a.id === settingsAgentId);

  return (
    <div className="view-container bg-panel">
      <div className="view-header">
        <div className="view-title-row">
          <h1 className="view-title">Agents</h1>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '8px' }}>
          管理你的多智能体团队 · 工作目录: <span className="font-mono" style={{ color: 'var(--color-text-main)' }}>{projectPath || '未选择'}</span>
        </p>
      </div>

      <div className="view-content" style={{ padding: '24px' }}>
        <div className="agents-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px' }}>
          {agents.map(agent => {
            const isLaunching = launchingId === agent.id;
            const isRunning = runningAgents[agent.id];

            return (
              <div key={agent.id} className="agent-list-card">
                <div className="agent-list-left">
                  <div className="agent-avatar-large" style={{ backgroundColor: agent.color, color: '#fff' }}>
                    {agent.name.charAt(0)}
                  </div>
                  <div className="agent-list-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="agent-name-large">{agent.name}</span>
                      <span className="agent-role-badge">{agent.role}</span>
                    </div>
                    <div className="agent-desc">{agent.desc}</div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      <span>Model: <span className="font-mono">{agent.model}</span></span>
                      <span>·</span>
                      <span>CLI: <span className="font-mono">{agent.cliCommand}</span></span>
                    </div>
                  </div>
                </div>
                <div className="agent-list-right" style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                  <span className={`agent-status-text ${isRunning ? 'success' : 'offline'}`} style={{ fontSize: '12px' }}>
                    {isRunning ? 'Running' : 'Offline'}
                  </span>

                  {/* Launch Button */}
                  <button
                    className="btn-icon-ghost"
                    title={`启动 ${agent.cliCommand}`}
                    disabled={isLaunching}
                    onClick={() => handleLaunch(agent)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      backgroundColor: isRunning ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      color: isRunning ? '#10B981' : 'var(--color-text-muted)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isLaunching
                      ? <Icons.RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                      : <Icons.Play style={{ width: '14px', height: '14px' }} />
                    }
                  </button>

                  {/* More Settings Button */}
                  <button
                    className="btn-icon-ghost"
                    title="更多设置"
                    onClick={() => setOpenMenuId(openMenuId === agent.id ? null : agent.id)}
                    style={{ width: '32px', height: '32px', borderRadius: '8px' }}
                  >
                    <Icons.MoreHorizontal style={{ width: '14px', height: '14px' }} />
                  </button>

                  {/* Dropdown Menu */}
                  {openMenuId === agent.id && (
                    <div
                      ref={menuRef}
                      className="agent-dropdown-menu"
                      style={{
                        position: 'absolute',
                        top: '40px',
                        right: '0',
                        width: '220px',
                        backgroundColor: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        zIndex: 100,
                        overflow: 'hidden',
                        padding: '4px 0',
                      }}
                    >
                      <div
                        className="dropdown-item"
                        style={dropdownItemStyle}
                        onClick={() => { handleLaunch(agent); setOpenMenuId(null); }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-panel)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Icons.Play style={{ width: '14px', height: '14px', marginRight: '10px', color: '#10B981' }} />
                        启动 {agent.cliCommand}
                      </div>

                      <div
                        className="dropdown-item"
                        style={dropdownItemStyle}
                        onClick={() => { setSettingsAgentId(agent.id); setOpenMenuId(null); }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-panel)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Icons.Settings style={{ width: '14px', height: '14px', marginRight: '10px', color: 'var(--color-text-muted)' }} />
                        Agent 设置
                      </div>

                      <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

                      <div
                        className="dropdown-item"
                        style={dropdownItemStyle}
                        onClick={() => { setOpenMenuId(null); }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-panel)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Icons.FileText style={{ width: '14px', height: '14px', marginRight: '10px', color: 'var(--color-text-muted)' }} />
                        查看日志
                      </div>

                      <div
                        className="dropdown-item"
                        style={dropdownItemStyle}
                        onClick={() => {
                          if (isRunning) {
                            setRunningAgents(prev => ({ ...prev, [agent.id]: false }));
                          }
                          setOpenMenuId(null);
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-panel)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Icons.Square style={{ width: '14px', height: '14px', marginRight: '10px', color: '#EF4444' }} />
                        停止 Agent
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings Modal */}
      {settingsAgent && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSettingsAgentId(null); }}
        >
          <div
            className="settings-modal"
            style={{
              width: '480px',
              backgroundColor: 'var(--bg-main)',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  backgroundColor: settingsAgent.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: '16px',
                }}>
                  {settingsAgent.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-main)' }}>{settingsAgent.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{settingsAgent.role}</div>
                </div>
              </div>
              <button
                onClick={() => setSettingsAgentId(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', padding: '4px',
                }}
              >
                <Icons.Plus style={{ width: '18px', height: '18px', transform: 'rotate(45deg)' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Model Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>Model</label>
                <select
                  value={settingsAgent.model}
                  onChange={e => updateAgentSetting(settingsAgent.id, 'model', e.target.value)}
                  style={selectStyle}
                >
                  {settingsAgent.availableModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Max Tokens */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>Max Output Tokens</label>
                <input
                  type="number"
                  value={settingsAgent.maxTokens}
                  onChange={e => updateAgentSetting(settingsAgent.id, 'maxTokens', parseInt(e.target.value) || 4096)}
                  style={inputStyle}
                />
              </div>

              {/* CLI Command */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>CLI Command</label>
                <input
                  type="text"
                  value={settingsAgent.cliCommand}
                  readOnly
                  style={{ ...inputStyle, backgroundColor: 'var(--bg-panel)', cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  启动时将在项目目录下执行此命令
                </span>
              </div>

              {/* Config File Path */}
              {settingsAgent.configPath && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>配置文件路径</label>
                  <input
                    type="text"
                    value={settingsAgent.configPath}
                    readOnly
                    style={{ ...inputStyle, backgroundColor: 'var(--bg-panel)', cursor: 'not-allowed', fontSize: '11px' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    只读形式，自动从系统路径中读取
                  </span>
                </div>
              )}

              {/* Auto-approve toggle */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: '10px', backgroundColor: 'var(--bg-panel)',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>Auto-approve</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>自动批准 Agent 的文件修改操作</div>
                </div>
                <div
                  onClick={() => updateAgentSetting(settingsAgent.id, 'autoApprove', !settingsAgent.autoApprove)}
                  style={{
                    width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer',
                    backgroundColor: settingsAgent.autoApprove ? '#10B981' : 'var(--border-color)',
                    position: 'relative', transition: 'background-color 0.2s ease',
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff',
                    position: 'absolute', top: '2px',
                    left: settingsAgent.autoApprove ? '20px' : '2px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'flex-end', gap: '8px',
            }}>
              <button
                onClick={() => setSettingsAgentId(null)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent', color: 'var(--color-text-main)', cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  setSettingsAgentId(null);
                  // Settings are already saved in state; in production you'd persist to disk here
                }}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#10B981', color: '#fff', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 500,
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Injection Instructions Modal */}
      {injectModalAgent && (
        <div className="inject-modal-overlay" onClick={() => setInjectModalAgent(null)}>
          <div className="inject-modal-card" onClick={e => e.stopPropagation()}>
            <div className="inject-modal-icon-wrapper">
              <Icons.CheckCircle2 className="inject-success-icon" />
            </div>
            <h2 className="inject-modal-title">智能体已就绪 (Agent Ready)</h2>
            <p className="inject-modal-desc">
              系统已自动将 <strong>{injectModalAgent.name}</strong> 的专属提示词复制到您的剪贴板。
            </p>
            <div className="action-hint-box">
              请在刚刚弹出的命令行终端窗口中，直接按下 <kbd className="kbd-badge">Ctrl</kbd> + <kbd className="kbd-badge">V</kbd> 粘贴并按回车以注入协作规程。
            </div>
            <button className="inject-modal-btn" onClick={() => setInjectModalAgent(null)}>
              我知道了 (Got it)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 16px',
  fontSize: '13px',
  color: 'var(--color-text-main)',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  backgroundColor: 'transparent',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-main)',
  color: 'var(--color-text-main)',
  fontSize: '13px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-main)',
  color: 'var(--color-text-main)',
  fontSize: '13px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
};
