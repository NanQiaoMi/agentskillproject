import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';

// --- localStorage helper ---
function lsGet(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* noop */ }
}
function lsBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === 'true';
  } catch { return fallback; }
}

// --- Types ---
interface AgentConfigInfo {
  model: string;
  config_path: string;
}

interface EnvStatus {
  git_installed: boolean;
  git_version: string;
  python_installed: boolean;
  python_version: string;
  uv_installed: boolean;
  uv_version: string;
  venv_initialized: boolean;
  project_db_shared: boolean;
}

interface CustomAgent {
  name: string;
  model: string;
  enabled: boolean;
}

interface SettingsViewProps {
  projectPath?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ projectPath = '' }) => {
  const [activeTab, setActiveTab] = useState('Models');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- Test Connection ---
  const [connectionStatus, setConnectionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Model Fallback ---
  const [modelFallback, setModelFallback] = useState(() => lsBool('mimi-model-fallback', true));

  // --- Agent configs (from backend) ---
  const [agentConfigs, setAgentConfigs] = useState<Record<string, AgentConfigInfo>>({});
  const [agentEnabled, setAgentEnabled] = useState<Record<string, boolean>>({});
  const [agentModels, setAgentModels] = useState<Record<string, string>>({});

  // --- Custom agents (localStorage) ---
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>(() => {
    try {
      const stored = localStorage.getItem('mimi-custom-agents');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');

  // --- Editor settings ---
  const [editorFontSize, setEditorFontSize] = useState(() => parseInt(lsGet('mimi-editor-font-size', '14'), 10));
  const [editorTabWidth, setEditorTabWidth] = useState(() => lsGet('mimi-editor-tab-width', '4'));
  const [editorAutoSave, setEditorAutoSave] = useState(() => lsBool('mimi-editor-auto-save', false));
  const [editorWordWrap, setEditorWordWrap] = useState(() => lsBool('mimi-editor-word-wrap', true));

  // --- Terminal settings ---
  const [termShell, setTermShell] = useState(() => lsGet('mimi-terminal-shell', 'powershell'));
  const [termFontSize, setTermFontSize] = useState(() => parseInt(lsGet('mimi-terminal-font-size', '13'), 10));
  const [termCursorStyle, setTermCursorStyle] = useState(() => lsGet('mimi-terminal-cursor-style', 'block'));

  // --- Notification settings ---
  const [notifTaskComplete, setNotifTaskComplete] = useState(() => lsBool('mimi-notif-task-complete', true));
  const [notifAgentIntercept, setNotifAgentIntercept] = useState(() => lsBool('mimi-notif-agent-intercept', true));
  const [notifSound, setNotifSound] = useState(() => lsBool('mimi-notif-sound', false));

  // --- Advanced settings ---
  const [logLevel, setLogLevel] = useState(() => lsGet('mimi-log-level', 'info'));
  const [cacheClearMsg, setCacheClearMsg] = useState('');

  // --- Theme ---
  const [theme, setTheme] = useState(() => lsGet('mimi-theme', 'light'));

  // --- Language ---
  const [language, setLanguage] = useState(() => lsGet('mimi-language', '简体中文'));

  // ------ Load API keys on mount ------
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const anthropic = await invoke("get_credential", { service: "anthropic", username: "default" });
        if (anthropic) setAnthropicKey(anthropic as string);
      } catch (e) {}
      try {
        const openai = await invoke("get_credential", { service: "openai", username: "default" });
        if (openai) setOpenAIKey(openai as string);
      } catch (e) {}
      try {
        const deepseek = await invoke("get_credential", { service: "deepseek", username: "default" });
        if (deepseek) setDeepseekKey(deepseek as string);
      } catch (e) {}
    };
    loadKeys();
  }, []);

  // ------ Load agent configs on mount ------
  useEffect(() => {
    const loadAgentConfigs = async () => {
      try {
        const configs = await invoke("read_agent_configs") as Record<string, AgentConfigInfo>;
        setAgentConfigs(configs);

        // Initialize enabled/model state from localStorage or defaults
        const enabledMap: Record<string, boolean> = {};
        const modelMap: Record<string, string> = {};
        for (const [key, info] of Object.entries(configs)) {
          enabledMap[key] = lsBool(`mimi-agent-enabled-${key}`, true);
          modelMap[key] = lsGet(`mimi-agent-model-${key}`, info.model);
        }
        setAgentEnabled(enabledMap);
        setAgentModels(modelMap);
      } catch (e) {
        // If backend fails, leave empty
      }
    };
    loadAgentConfigs();
  }, []);

  // ------ Apply theme on mount ------
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleSaveKey = async (provider: string, key: string) => {
    setIsSaving(true);
    try {
      await invoke("store_credential", { service: provider, username: "default", secret: key });
      alert(`${provider} API Key 保存成功`);
    } catch (e) {
      alert("保存失败: " + e);
    } finally {
      setIsSaving(false);
    }
  };

  // ------ Test Connection ------
  const handleTestConnection = useCallback(async () => {
    setConnectionStatus(null);
    try {
      const status = await invoke("check_environment", { projectPath }) as EnvStatus;
      if (status.git_installed && status.python_installed) {
        setConnectionStatus({
          type: 'success',
          message: `✓ Git ${status.git_version}, Python ${status.python_version}${status.venv_initialized ? ', venv ✓' : ', venv ✗'}`
        });
      } else {
        const missing: string[] = [];
        if (!status.git_installed) missing.push('Git');
        if (!status.python_installed) missing.push('Python');
        setConnectionStatus({ type: 'error', message: `Missing: ${missing.join(', ')}` });
      }
    } catch (e) {
      setConnectionStatus({ type: 'error', message: `Connection test failed: ${e}` });
    }
  }, [projectPath]);

  // ------ Model Fallback toggle ------
  const handleModelFallbackChange = (checked: boolean) => {
    setModelFallback(checked);
    lsSet('mimi-model-fallback', String(checked));
  };

  // ------ Agent toggle (enable/disable) ------
  const handleAgentToggle = async (agentKey: string, checked: boolean) => {
    setAgentEnabled(prev => ({ ...prev, [agentKey]: checked }));
    lsSet(`mimi-agent-enabled-${agentKey}`, String(checked));
  };

  // ------ Agent model select ------
  const handleAgentModelChange = (agentKey: string, model: string) => {
    setAgentModels(prev => ({ ...prev, [agentKey]: model }));
    lsSet(`mimi-agent-model-${agentKey}`, model);
  };

  // ------ Add custom agent ------
  const handleAddAgent = () => {
    if (!newAgentName.trim()) return;
    const agent: CustomAgent = { name: newAgentName.trim(), model: 'Opus 4.5', enabled: true };
    const updated = [...customAgents, agent];
    setCustomAgents(updated);
    lsSet('mimi-custom-agents', JSON.stringify(updated));
    setNewAgentName('');
    setShowAddAgent(false);
  };

  const handleCustomAgentToggle = (idx: number, checked: boolean) => {
    const updated = [...customAgents];
    updated[idx] = { ...updated[idx], enabled: checked };
    setCustomAgents(updated);
    lsSet('mimi-custom-agents', JSON.stringify(updated));
  };

  const handleCustomAgentModelChange = (idx: number, model: string) => {
    const updated = [...customAgents];
    updated[idx] = { ...updated[idx], model };
    setCustomAgents(updated);
    lsSet('mimi-custom-agents', JSON.stringify(updated));
  };

  // ------ Theme change ------
  const handleThemeChange = (value: string) => {
    setTheme(value);
    document.documentElement.setAttribute('data-theme', value);
    lsSet('mimi-theme', value);
  };

  // ------ Language change ------
  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    lsSet('mimi-language', value);
  };

  // ------ Clear cache ------
  const handleClearCache = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('mimi-')) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
    setCacheClearMsg(`Cleared ${keys.length} cached setting(s).`);
    setTimeout(() => setCacheClearMsg(''), 3000);
  };

  // --- Agent display name mapping ---
  const agentDisplayNames: Record<string, string> = {
    hermes: 'Hermes Agent',
    antigravity: 'Antigravity',
    codex: 'Codex',
    claudecode: 'Claude Code',
    opencode: 'OpenCode',
  };

  // Shared inline styles for settings-form items (consistent with Models tab)
  const formGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', marginBottom: '16px' };
  const formLabelStyle: React.CSSProperties = { fontWeight: 500, marginBottom: '8px', display: 'block', fontSize: '13px' };
  const inputStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' };
  const selectStyle: React.CSSProperties = { maxWidth: '300px', padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' };

  return (
    <div className="view-container bg-panel">
      <div className="view-header">
        <h1 className="view-title">Settings</h1>
      </div>

      <div className="view-content" style={{ display: 'flex', gap: '32px', padding: '24px', overflowY: 'auto' }}>
        <div className="settings-sidebar">
          {['General', 'Agents', 'Models', 'Editor', 'Terminal', 'Notifications', 'Advanced'].map(tab => (
            <div 
              key={tab} 
              className={`settings-nav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'General' && <Icons.Settings className="settings-nav-icon" />}
              {tab === 'Agents' && <Icons.Users className="settings-nav-icon" />}
              {tab === 'Models' && <Icons.Activity className="settings-nav-icon" />}
              {tab === 'Editor' && <Icons.Edit2 className="settings-nav-icon" />}
              {tab === 'Terminal' && <Icons.Terminal className="settings-nav-icon" />}
              {tab === 'Notifications' && <Icons.MessageSquare className="settings-nav-icon" />}
              {tab === 'Advanced' && <Icons.Shield className="settings-nav-icon" />}
              {tab}
            </div>
          ))}
        </div>
        
        <div className="settings-content" style={{ flex: 1 }}>
          <h2 className="settings-section-title" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{activeTab} Configuration</h2>
          
          {activeTab === 'Models' && (
            <div className="settings-form">
              <div className="text-sm text-muted mb-4">配置各类智能体在推理和代码生成时使用的模型。</div>
              <div className="model-list-wrapper">
                <div className="model-list-card-item">
                  <div className="model-list-card-left">
                    <div className="model-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--color-border)', fontWeight: 'bold' }}>A</div>
                    <div>
                      <div className="font-semibold text-main text-sm">Opus 4.5</div>
                      <div className="text-xs text-muted">Anthropic</div>
                    </div>
                  </div>
                  <span className="model-badge-primary">Primary</span>
                </div>
                <div className="model-list-card-item">
                  <div className="model-list-card-left">
                    <div className="model-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--color-border)', fontWeight: 'bold' }}>A</div>
                    <div>
                      <div className="font-semibold text-main text-sm">Sonnet 3.7</div>
                      <div className="text-xs text-muted">Anthropic</div>
                    </div>
                  </div>
                  <div><Icons.ChevronRight className="text-muted" style={{ transform: 'rotate(90deg)' }} /></div>
                </div>
                <div className="model-list-card-item">
                  <div className="model-list-card-left">
                    <div className="model-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--color-border)', fontWeight: 'bold' }}>O</div>
                    <div>
                      <div className="font-semibold text-main text-sm">GPT-4o</div>
                      <div className="text-xs text-muted">OpenAI</div>
                    </div>
                  </div>
                  <div><Icons.ChevronRight className="text-muted" style={{ transform: 'rotate(90deg)' }} /></div>
                </div>
              </div>

              <div className="settings-group toggle-group" style={{ marginTop: '24px' }}>
                <div className="toggle-info">
                  <div className="toggle-title">Enable Model Fallback</div>
                  <div className="toggle-desc">当首选模型响应超时或失败时，自动切换至备用模型。</div>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" id="modelfallback" checked={modelFallback} onChange={e => handleModelFallbackChange(e.target.checked)} />
                  <label htmlFor="modelfallback"></label>
                </div>
              </div>

              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>API Keys Configuration</h3>
                <div className="form-group mb-4" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontWeight: 500, marginBottom: '8px', display: 'block', fontSize: '13px' }}>Anthropic API Key</label>
                    <input type="password" className="chat-input-area bg-panel" style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px' }} placeholder="sk-ant-..." value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" onClick={() => handleSaveKey('anthropic', anthropicKey)} disabled={isSaving}>Save</button>
                </div>
                <div className="form-group mb-4" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontWeight: 500, marginBottom: '8px', display: 'block', fontSize: '13px' }}>OpenAI API Key</label>
                    <input type="password" className="chat-input-area bg-panel" style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px' }} placeholder="sk-..." value={openAIKey} onChange={e => setOpenAIKey(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" onClick={() => handleSaveKey('openai', openAIKey)} disabled={isSaving}>Save</button>
                </div>
                <div className="form-group mb-4" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontWeight: 500, marginBottom: '8px', display: 'block', fontSize: '13px' }}>DeepSeek API Key</label>
                    <input type="password" className="chat-input-area bg-panel" style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px' }} placeholder="sk-..." value={deepseekKey} onChange={e => setDeepseekKey(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" onClick={() => handleSaveKey('deepseek', deepseekKey)} disabled={isSaving}>Save</button>
                </div>
              </div>
              <button className="btn mt-4" style={{ alignSelf: 'flex-start' }} onClick={handleTestConnection}><Icons.CheckCircle2 style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Test Connection</button>
              {connectionStatus && (
                <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', backgroundColor: connectionStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: connectionStatus.type === 'success' ? '#16a34a' : '#dc2626', border: `1px solid ${connectionStatus.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                  {connectionStatus.message}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Agents' && (
            <div className="settings-form">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="text-sm text-muted">管理所有可用的智能体。</div>
                <button className="btn btn-ghost" onClick={() => setShowAddAgent(true)}><Icons.Plus style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Add Agent</button>
              </div>

              {/* Add Agent Modal */}
              {showAddAgent && (
                <div style={{ marginBottom: '16px', padding: '16px', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--bg-main)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Add Custom Agent</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      className="chat-input-area bg-panel"
                      style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px', fontSize: '13px' }}
                      placeholder="Agent name..."
                      value={newAgentName}
                      onChange={e => setNewAgentName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddAgent(); }}
                      autoFocus
                    />
                    <button className="btn btn-primary" onClick={handleAddAgent}>Add</button>
                    <button className="btn" onClick={() => { setShowAddAgent(false); setNewAgentName(''); }}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="agents-config-list flex-col gap-4">
                {/* Backend-loaded agents */}
                {Object.entries(agentConfigs).map(([key, info]) => (
                  <div key={key} className="agent-cfg-item bg-main border rounded-md p-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', padding: '16px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div className="agent-avatar-large" style={{ width: '36px', height: '36px', fontSize: '16px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 600 }}>{(agentDisplayNames[key] ?? key).charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="font-semibold text-main text-sm">{agentDisplayNames[key] ?? key}</div>
                        <div className="text-xs text-muted" style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.model}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="text-xs text-muted mb-1" style={{ marginBottom: '4px' }}>Model</span>
                        <select
                          className="form-select"
                          style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' }}
                          value={agentModels[key] ?? info.model}
                          onChange={e => handleAgentModelChange(key, e.target.value)}
                        >
                          <option>Opus 4.5</option>
                          <option>Sonnet 3.7</option>
                          <option>GPT-4o</option>
                          <option>{info.model}</option>
                        </select>
                      </div>
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          id={`setting-agent-${key}`}
                          checked={agentEnabled[key] ?? true}
                          onChange={e => handleAgentToggle(key, e.target.checked)}
                        />
                        <label htmlFor={`setting-agent-${key}`}></label>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Custom agents */}
                {customAgents.map((agent, i) => (
                  <div key={`custom-${i}`} className="agent-cfg-item bg-main border rounded-md p-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', padding: '16px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div className="agent-avatar-large" style={{ width: '36px', height: '36px', fontSize: '16px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 600 }}>{agent.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="font-semibold text-main text-sm">{agent.name}</div>
                        <div className="text-xs text-muted">Custom Agent</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="text-xs text-muted mb-1" style={{ marginBottom: '4px' }}>Model</span>
                        <select
                          className="form-select"
                          style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' }}
                          value={agent.model}
                          onChange={e => handleCustomAgentModelChange(i, e.target.value)}
                        >
                          <option>Opus 4.5</option>
                          <option>Sonnet 3.7</option>
                          <option>GPT-4o</option>
                        </select>
                      </div>
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          id={`setting-custom-agent-${i}`}
                          checked={agent.enabled}
                          onChange={e => handleCustomAgentToggle(i, e.target.checked)}
                        />
                        <label htmlFor={`setting-custom-agent-${i}`}></label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'General' && (
            <div className="settings-form">
              <div className="settings-group">
                <label className="settings-label" style={{ fontSize: '13px', fontWeight: 600 }}>Theme</label>
                <div className="radio-group" style={{ display: 'flex', gap: '16px' }}>
                  <label className="radio-label"><input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={() => handleThemeChange('light')} /> Light</label>
                  <label className="radio-label"><input type="radio" name="theme" value="system" checked={theme === 'system'} onChange={() => handleThemeChange('system')} /> System</label>
                  <label className="radio-label"><input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={() => handleThemeChange('dark')} /> Dark</label>
                </div>
              </div>
              
              <div className="settings-group">
                <label className="settings-label" style={{ fontSize: '13px', fontWeight: 600 }}>Language</label>
                <select
                  className="form-select"
                  style={{ maxWidth: '300px', padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                  value={language}
                  onChange={e => handleLanguageChange(e.target.value)}
                >
                  <option>简体中文</option>
                  <option>English</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'Editor' && (
            <div className="settings-form">
              <div className="text-sm text-muted mb-4">配置内置编辑器的显示和行为偏好。</div>

              <div className="form-group" style={formGroupStyle}>
                <label className="form-label" style={formLabelStyle}>Font Size</label>
                <input
                  type="number"
                  className="intercept-input"
                  style={inputStyle}
                  min={8}
                  max={32}
                  value={editorFontSize}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) { setEditorFontSize(v); lsSet('mimi-editor-font-size', String(v)); }
                  }}
                />
              </div>

              <div className="form-group" style={formGroupStyle}>
                <label className="form-label" style={formLabelStyle}>Tab Width</label>
                <select
                  className="form-select"
                  style={selectStyle}
                  value={editorTabWidth}
                  onChange={e => { setEditorTabWidth(e.target.value); lsSet('mimi-editor-tab-width', e.target.value); }}
                >
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="8">8</option>
                </select>
              </div>

              <div className="settings-group toggle-group" style={{ marginTop: '8px' }}>
                <div className="toggle-info">
                  <div className="toggle-title">Auto Save</div>
                  <div className="toggle-desc">文件修改后自动保存。</div>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" id="editor-autosave" checked={editorAutoSave} onChange={e => { setEditorAutoSave(e.target.checked); lsSet('mimi-editor-auto-save', String(e.target.checked)); }} />
                  <label htmlFor="editor-autosave"></label>
                </div>
              </div>

              <div className="settings-group toggle-group" style={{ marginTop: '16px' }}>
                <div className="toggle-info">
                  <div className="toggle-title">Word Wrap</div>
                  <div className="toggle-desc">长行文本自动换行显示。</div>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" id="editor-wordwrap" checked={editorWordWrap} onChange={e => { setEditorWordWrap(e.target.checked); lsSet('mimi-editor-word-wrap', String(e.target.checked)); }} />
                  <label htmlFor="editor-wordwrap"></label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Terminal' && (
            <div className="settings-form">
              <div className="text-sm text-muted mb-4">配置内置终端的显示和默认 Shell。</div>

              <div className="form-group" style={formGroupStyle}>
                <label className="form-label" style={formLabelStyle}>Default Shell</label>
                <input
                  type="text"
                  className="intercept-input"
                  style={inputStyle}
                  value={termShell}
                  onChange={e => { setTermShell(e.target.value); lsSet('mimi-terminal-shell', e.target.value); }}
                />
              </div>

              <div className="form-group" style={formGroupStyle}>
                <label className="form-label" style={formLabelStyle}>Font Size</label>
                <input
                  type="number"
                  className="intercept-input"
                  style={inputStyle}
                  min={8}
                  max={32}
                  value={termFontSize}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) { setTermFontSize(v); lsSet('mimi-terminal-font-size', String(v)); }
                  }}
                />
              </div>

              <div className="form-group" style={formGroupStyle}>
                <label className="form-label" style={formLabelStyle}>Cursor Style</label>
                <select
                  className="form-select"
                  style={selectStyle}
                  value={termCursorStyle}
                  onChange={e => { setTermCursorStyle(e.target.value); lsSet('mimi-terminal-cursor-style', e.target.value); }}
                >
                  <option value="block">Block</option>
                  <option value="line">Line</option>
                  <option value="underline">Underline</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <div className="settings-form">
              <div className="text-sm text-muted mb-4">配置通知偏好设置。</div>

              <div className="settings-group toggle-group">
                <div className="toggle-info">
                  <div className="toggle-title">Task Complete</div>
                  <div className="toggle-desc">当任务完成时发送通知。</div>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" id="notif-task-complete" checked={notifTaskComplete} onChange={e => { setNotifTaskComplete(e.target.checked); lsSet('mimi-notif-task-complete', String(e.target.checked)); }} />
                  <label htmlFor="notif-task-complete"></label>
                </div>
              </div>

              <div className="settings-group toggle-group" style={{ marginTop: '16px' }}>
                <div className="toggle-info">
                  <div className="toggle-title">Agent Interception</div>
                  <div className="toggle-desc">当智能体需要人工审查或确认时通知。</div>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" id="notif-agent-intercept" checked={notifAgentIntercept} onChange={e => { setNotifAgentIntercept(e.target.checked); lsSet('mimi-notif-agent-intercept', String(e.target.checked)); }} />
                  <label htmlFor="notif-agent-intercept"></label>
                </div>
              </div>

              <div className="settings-group toggle-group" style={{ marginTop: '16px' }}>
                <div className="toggle-info">
                  <div className="toggle-title">Sound</div>
                  <div className="toggle-desc">通知时播放提示音。</div>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" id="notif-sound" checked={notifSound} onChange={e => { setNotifSound(e.target.checked); lsSet('mimi-notif-sound', String(e.target.checked)); }} />
                  <label htmlFor="notif-sound"></label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Advanced' && (
            <div className="settings-form">
              <div className="text-sm text-muted mb-4">高级配置与维护选项。</div>

              <div className="form-group" style={formGroupStyle}>
                <label className="form-label" style={formLabelStyle}>Data Directory</label>
                <input
                  type="text"
                  className="intercept-input"
                  style={{ ...inputStyle, maxWidth: '500px', opacity: 0.7, cursor: 'default' }}
                  value={projectPath || '(not set)'}
                  readOnly
                />
              </div>

              <div className="form-group" style={formGroupStyle}>
                <label className="form-label" style={formLabelStyle}>Log Level</label>
                <select
                  className="form-select"
                  style={selectStyle}
                  value={logLevel}
                  onChange={e => { setLogLevel(e.target.value); lsSet('mimi-log-level', e.target.value); }}
                >
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div style={{ marginTop: '8px' }}>
                <button className="btn" onClick={handleClearCache}>
                  <Icons.RefreshCw style={{ width: '14px', height: '14px', marginRight: '4px' }} /> Clear Cache
                </button>
                {cacheClearMsg && (
                  <span style={{ marginLeft: '12px', fontSize: '13px', color: '#16a34a' }}>{cacheClearMsg}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
