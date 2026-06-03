import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

const translations = {
  'English': {
    settingsTitle: 'Settings',
    tabs: {
      General: 'General',
      Agents: 'Agents',
      Models: 'Models',
      Editor: 'Editor',
      Terminal: 'Terminal',
      Notifications: 'Notifications',
      Advanced: 'Advanced',
    },
    subtitles: {
      General: 'Manage your basic preferences, API keys, and language settings.',
      Agents: 'Configure built-in and custom AI agents.',
      Models: 'Set up LLM providers and fallback strategies.',
      Editor: 'Customize the built-in code editor behavior and appearance.',
      Terminal: 'Configure terminal display and default shell.',
      Notifications: 'Adjust system notifications and sounds.',
      Advanced: 'Advanced diagnostics and cache management.',
    },
    general: {
      themeTitle: 'Theme',
      themeDesc: 'Select the visual appearance of the application.',
      themeLight: 'Light',
      themeSystem: 'System',
      themeDark: 'Dark',
      langTitle: 'Language',
      langDesc: 'Choose your preferred language for the UI.',
      anthropicTitle: 'Anthropic API Key',
      anthropicDesc: 'Required for Claude models.',
      save: 'Save',
      saveSuccess: 'API Key saved successfully',
      saveFail: 'Failed to save: ',
      openaiTitle: 'OpenAI Configuration',
      openaiDesc: 'Configure API key, base URL, and model for OpenAI-compatible services.',
      baseUrlPlaceholder: 'Base URL (e.g. https://api.openai.com/v1)',
      modelPlaceholder: 'Model',
      deepseekTitle: 'DeepSeek API Key',
      deepseekDesc: 'Required for DeepSeek models.'
    },
    agents: {
      addCustom: 'Add Custom Agent',
      createTitle: 'Create New Agent',
      namePlaceholder: 'Agent Name...',
      addBtn: 'Add',
      cancelBtn: 'Cancel',
      builtIn: 'Built-in',
      custom: 'Custom'
    },
    models: {
      fallbackTitle: 'Model Fallback Strategy',
      fallbackDesc: 'Automatically switch to a fallback model if the primary model times out or encounters an error.',
      diagTitle: 'Connection Diagnostics',
      diagDesc: 'Check if required dependencies (Git, Python, uv) are correctly configured.',
      runDiag: 'Run Diagnostics'
    },
    editor: {
      fontSizeTitle: 'Font Size',
      fontSizeDesc: 'Controls the font size in the built-in code editor.',
      tabWidthTitle: 'Tab Width',
      tabWidthDesc: 'The number of spaces a tab is equal to.',
      spaces: 'spaces',
      autoSaveTitle: 'Auto Save',
      autoSaveDesc: 'Automatically save files when modifications are made.',
      wordWrapTitle: 'Word Wrap',
      wordWrapDesc: 'Wrap lines that exceed the width of the editor.'
    },
    terminal: {
      shellTitle: 'Default Shell',
      shellDesc: 'The default executable used by the terminal (e.g. bash, zsh, powershell).',
      fontSizeTitle: 'Font Size',
      fontSizeDesc: 'Controls the font size for terminal output.',
      cursorTitle: 'Cursor Style',
      cursorDesc: 'Visual appearance of the terminal cursor.',
      cursorBlock: 'Block',
      cursorLine: 'Line',
      cursorUnderline: 'Underline'
    },
    notifications: {
      taskCompleteTitle: 'Task Completion',
      taskCompleteDesc: 'Notify me when an agent successfully finishes a task.',
      agentInterceptTitle: 'Agent Interception',
      agentInterceptDesc: 'Notify me when an agent pauses and requires human review or input.',
      soundTitle: 'Play Sounds',
      soundDesc: 'Play a brief chime when a notification is triggered.'
    },
    advanced: {
      projectDirTitle: 'Project Data Directory',
      projectDirDesc: 'The absolute path where Mimicode stores project metadata and agent state.',
      notSet: '(not set)',
      logLevelTitle: 'Log Level',
      logLevelDesc: 'Determines the verbosity of system logs.',
      logDebug: 'Debug',
      logInfo: 'Info',
      logWarn: 'Warn',
      logError: 'Error',
      cacheTitle: 'Cache Management',
      cacheDesc: 'Clear local preferences, UI states, and cached tokens.',
      clearCacheBtn: 'Clear Cache',
      cacheCleared: 'Cleared {n} cached setting(s).'
    }
  },
  '简体中文': {
    settingsTitle: '设置',
    tabs: {
      General: '常规',
      Agents: '智能体',
      Models: '模型',
      Editor: '编辑器',
      Terminal: '终端',
      Notifications: '通知',
      Advanced: '高级',
    },
    subtitles: {
      General: '管理基础偏好设置、API密钥以及界面语言。',
      Agents: '配置内置智能体和自定义智能体。',
      Models: '设置LLM供应商及模型降级回退策略。',
      Editor: '自定义内置代码编辑器的行为与外观。',
      Terminal: '配置终端显示样式及默认Shell解释器。',
      Notifications: '调整系统通知和声音提示。',
      Advanced: '高级系统诊断与缓存管理。',
    },
    general: {
      themeTitle: '主题颜色',
      themeDesc: '选择应用程序的外观模式。',
      themeLight: '浅色',
      themeSystem: '跟随系统',
      themeDark: '深色',
      langTitle: '界面语言',
      langDesc: '选择您偏好的用户界面语言。',
      anthropicTitle: 'Anthropic API 密钥',
      anthropicDesc: 'Claude 系列模型必需。',
      save: '保存',
      saveSuccess: 'API 密钥保存成功',
      saveFail: '保存失败: ',
      openaiTitle: 'OpenAI 兼容配置',
      openaiDesc: '配置兼容 OpenAI 的 API 密钥、基础 URL 和默认模型。',
      baseUrlPlaceholder: '基础 URL (如: https://api.openai.com/v1)',
      modelPlaceholder: '模型名称',
      deepseekTitle: 'DeepSeek API 密钥',
      deepseekDesc: 'DeepSeek 系列模型必需。'
    },
    agents: {
      addCustom: '添加自定义智能体',
      createTitle: '创建新智能体',
      namePlaceholder: '智能体名称...',
      addBtn: '添加',
      cancelBtn: '取消',
      builtIn: '内置',
      custom: '自定义'
    },
    models: {
      fallbackTitle: '模型降级策略',
      fallbackDesc: '当主模型请求超时或发生错误时，自动回退到备用模型。',
      diagTitle: '连接与环境诊断',
      diagDesc: '检查项目所需的依赖环境 (Git, Python, uv) 是否正确配置。',
      runDiag: '运行环境诊断'
    },
    editor: {
      fontSizeTitle: '字体大小',
      fontSizeDesc: '控制内置代码编辑器的字体大小。',
      tabWidthTitle: '制表符宽度',
      tabWidthDesc: '按Tab键时等效的空格数量。',
      spaces: '个空格',
      autoSaveTitle: '自动保存',
      autoSaveDesc: '在进行代码修改后自动保存文件。',
      wordWrapTitle: '自动换行',
      wordWrapDesc: '当代码超出编辑器宽度时自动折行显示。'
    },
    terminal: {
      shellTitle: '默认 Shell',
      shellDesc: '终端使用的默认可执行文件 (如: bash, zsh, powershell)。',
      fontSizeTitle: '字体大小',
      fontSizeDesc: '控制终端输出的字体大小。',
      cursorTitle: '光标样式',
      cursorDesc: '终端光标的视觉表现形式。',
      cursorBlock: '方块',
      cursorLine: '线条',
      cursorUnderline: '下划线'
    },
    notifications: {
      taskCompleteTitle: '任务完成提醒',
      taskCompleteDesc: '当智能体成功完成一个任务时发送通知。',
      agentInterceptTitle: '智能体人工拦截',
      agentInterceptDesc: '当智能体暂停运行并需要人工审查或确认时发送通知。',
      soundTitle: '播放提示音',
      soundDesc: '触发通知时播放简短的提示音。'
    },
    advanced: {
      projectDirTitle: '项目数据目录',
      projectDirDesc: 'Mimicode 存储项目元数据和智能体状态的绝对路径。',
      notSet: '(未设置)',
      logLevelTitle: '日志级别',
      logLevelDesc: '决定系统日志的详细程度。',
      logDebug: '调试 (Debug)',
      logInfo: '信息 (Info)',
      logWarn: '警告 (Warn)',
      logError: '错误 (Error)',
      cacheTitle: '缓存管理',
      cacheDesc: '清除本地偏好设置、界面状态及缓存的凭证信息。',
      clearCacheBtn: '清除缓存',
      cacheCleared: '已清除 {n} 个缓存设置项。'
    }
  }
};

export const SettingsView: React.FC<SettingsViewProps> = ({ projectPath = '' }) => {
  const [activeTab, setActiveTab] = useState('General');
  
  // --- Language ---
  const [language, setLanguage] = useState(() => lsGet('mimi-language', '简体中文'));
  const t = useMemo(() => translations[language as keyof typeof translations] || translations['English'], [language]);

  const [anthropicKey, setAnthropicKey] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [openAIBaseUrl, setOpenAIBaseUrl] = useState(() => lsGet('mimi-openai-base-url', 'https://token.sensenova.cn/v1'));
  const [openAIModel, setOpenAIModel] = useState(() => lsGet('mimi-openai-model', 'deepseek-v4-flash'));
  const [isSaving, setIsSaving] = useState(false);

  // --- Test Connection ---
  const [connectionStatus, setConnectionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Model Fallback ---
  const [modelFallback, setModelFallback] = useState(() => lsBool('mimi-model-fallback', true));

  // --- Agent configs (from backend) ---
  const [agentConfigs, setAgentConfigs] = useState<Record<string, AgentConfigInfo>>({});
  const [agentEnabled, setAgentEnabled] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    const loadKeys = async () => {
      try { const anthropic = await invoke("get_credential", { service: "anthropic", username: "default" }); if (anthropic) setAnthropicKey(anthropic as string); } catch (e) {}
      try { const openai = await invoke("get_credential", { service: "openai", username: "default" }); if (openai) setOpenAIKey(openai as string); } catch (e) {}
      try { const deepseek = await invoke("get_credential", { service: "deepseek", username: "default" }); if (deepseek) setDeepseekKey(deepseek as string); } catch (e) {}
    };
    loadKeys();
  }, []);

  useEffect(() => {
    const loadAgentConfigs = async () => {
      try {
        const configs = await invoke("read_agent_configs") as Record<string, AgentConfigInfo>;
        setAgentConfigs(configs);
        const enabledMap: Record<string, boolean> = {};
        for (const [key] of Object.entries(configs)) {
          enabledMap[key] = lsBool(`mimi-agent-enabled-${key}`, true);
        }
        setAgentEnabled(enabledMap);
      } catch (e) {}
    };
    loadAgentConfigs();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleSaveKey = async (provider: string, key: string) => {
    setIsSaving(true);
    try {
      await invoke("store_credential", { service: provider, username: "default", secret: key });
      alert(`${provider} ${t.general.saveSuccess}`);
    } catch (e) {
      alert(t.general.saveFail + e);
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleModelFallbackChange = (checked: boolean) => {
    setModelFallback(checked);
    lsSet('mimi-model-fallback', String(checked));
  };

  const handleAgentToggle = async (agentKey: string, checked: boolean) => {
    setAgentEnabled(prev => ({ ...prev, [agentKey]: checked }));
    lsSet(`mimi-agent-enabled-${agentKey}`, String(checked));
  };

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

  const handleThemeChange = (value: string) => {
    setTheme(value);
    document.documentElement.setAttribute('data-theme', value);
    lsSet('mimi-theme', value);
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    lsSet('mimi-language', value);
    window.dispatchEvent(new CustomEvent('mimi-language-changed', { detail: value }));
  };

  const handleClearCache = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('mimi-')) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
    setCacheClearMsg(t.advanced.cacheCleared.replace('{n}', keys.length.toString()));
    setTimeout(() => setCacheClearMsg(''), 3000);
  };

  const agentDisplayNames: Record<string, string> = {
    hermes: 'Hermes Agent',
    antigravity: 'Antigravity',
    codex: 'Codex',
    claudecode: 'Claude Code',
    opencode: 'OpenCode',
  };

  const getAgentIcon = (key: string, name: string) => {
    const baseStyle: React.CSSProperties = { color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' };
    switch(key.toLowerCase()) {
      case 'claudecode':
        return <div className="agent-card-avatar" style={{ ...baseStyle, background: 'linear-gradient(135deg, #FF8C00 0%, #E52E71 100%)' }}><Icons.Shield style={{ width: '20px', height: '20px' }} /></div>;
      case 'codex':
        return <div className="agent-card-avatar" style={{ ...baseStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}><Icons.Code style={{ width: '20px', height: '20px' }} /></div>;
      case 'hermes':
        return <div className="agent-card-avatar" style={{ ...baseStyle, background: 'linear-gradient(135deg, #F53844 0%, #42378F 100%)' }}><Icons.Box style={{ width: '20px', height: '20px' }} /></div>;
      case 'antigravity':
        return <div className="agent-card-avatar" style={{ ...baseStyle, background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}><Icons.Zap style={{ width: '20px', height: '20px' }} /></div>;
      case 'opencode':
        return <div className="agent-card-avatar" style={{ ...baseStyle, background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}><Icons.Terminal style={{ width: '20px', height: '20px' }} /></div>;
      default:
        return <div className="agent-card-avatar" style={{ ...baseStyle, background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }}>{name.charAt(0).toUpperCase()}</div>;
    }
  };

  return (
    <div className="view-container bg-panel" style={{ padding: '24px 32px' }}>
      <div className="settings-container">
        {/* Sidebar */}
        <div className="settings-sidebar">
          <div className="settings-sidebar-header">{t.settingsTitle}</div>
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
              {t.tabs[tab as keyof typeof t.tabs]}
            </div>
          ))}
        </div>
        
        {/* Content Area */}
        <div className="settings-content">
          <div>
            <h2 className="settings-section-title">{t.tabs[activeTab as keyof typeof t.tabs]}</h2>
            <div className="settings-section-subtitle">
              {t.subtitles[activeTab as keyof typeof t.subtitles]}
            </div>
          </div>

          {activeTab === 'General' && (
            <div className="settings-card">
              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.general.themeTitle}</div>
                  <div className="settings-group-desc">{t.general.themeDesc}</div>
                </div>
                <div className="settings-group-control">
                  <select className="modern-select" value={theme} onChange={e => handleThemeChange(e.target.value)}>
                    <option value="light">{t.general.themeLight}</option>
                    <option value="system">{t.general.themeSystem}</option>
                    <option value="dark">{t.general.themeDark}</option>
                  </select>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.general.langTitle}</div>
                  <div className="settings-group-desc">{t.general.langDesc}</div>
                </div>
                <div className="settings-group-control">
                  <select className="modern-select" value={language} onChange={e => handleLanguageChange(e.target.value)}>
                    <option value="简体中文">简体中文</option>
                    <option value="English">English</option>
                  </select>
                </div>
              </div>

              <div className="settings-group" style={{ flexDirection: 'column', gap: '16px' }}>
                <div className="settings-group-info" style={{ maxWidth: '100%' }}>
                  <div className="settings-group-title">{t.general.anthropicTitle}</div>
                  <div className="settings-group-desc">{t.general.anthropicDesc}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <input type="password" className="modern-input" placeholder="sk-ant-..." value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} />
                  <button className="modern-btn" onClick={() => handleSaveKey('anthropic', anthropicKey)} disabled={isSaving}>{t.general.save}</button>
                </div>
              </div>

              <div className="settings-group" style={{ flexDirection: 'column', gap: '16px' }}>
                <div className="settings-group-info" style={{ maxWidth: '100%' }}>
                  <div className="settings-group-title">{t.general.openaiTitle}</div>
                  <div className="settings-group-desc">{t.general.openaiDesc}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <input type="text" className="modern-input" placeholder={t.general.baseUrlPlaceholder} value={openAIBaseUrl} onChange={e => { setOpenAIBaseUrl(e.target.value); lsSet('mimi-openai-base-url', e.target.value); }} />
                  <input type="text" className="modern-input" style={{ maxWidth: '200px' }} placeholder={t.general.modelPlaceholder} value={openAIModel} onChange={e => { setOpenAIModel(e.target.value); lsSet('mimi-openai-model', e.target.value); }} />
                </div>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <input type="password" className="modern-input" placeholder="sk-..." value={openAIKey} onChange={e => setOpenAIKey(e.target.value)} />
                  <button className="modern-btn" onClick={() => handleSaveKey('openai', openAIKey)} disabled={isSaving}>{t.general.save}</button>
                </div>
              </div>

              <div className="settings-group" style={{ flexDirection: 'column', gap: '16px' }}>
                <div className="settings-group-info" style={{ maxWidth: '100%' }}>
                  <div className="settings-group-title">{t.general.deepseekTitle}</div>
                  <div className="settings-group-desc">{t.general.deepseekDesc}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <input type="password" className="modern-input" placeholder="sk-..." value={deepseekKey} onChange={e => setDeepseekKey(e.target.value)} />
                  <button className="modern-btn" onClick={() => handleSaveKey('deepseek', deepseekKey)} disabled={isSaving}>{t.general.save}</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Agents' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button className="modern-btn" onClick={() => setShowAddAgent(true)}>
                  <Icons.Plus style={{ width: '16px', height: '16px' }}/> {t.agents.addCustom}
                </button>
              </div>

              {/* Add Agent Form */}
              {showAddAgent && (
                <div className="settings-card" style={{ marginBottom: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="settings-group-title">{t.agents.createTitle}</div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input className="modern-input" placeholder={t.agents.namePlaceholder} value={newAgentName} onChange={e => setNewAgentName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddAgent(); }} autoFocus />
                    <button className="modern-btn" style={{ backgroundColor: 'var(--color-primary-orange)', color: 'white', borderColor: 'var(--color-primary-orange)' }} onClick={handleAddAgent}>{t.agents.addBtn}</button>
                    <button className="modern-btn" onClick={() => { setShowAddAgent(false); setNewAgentName(''); }}>{t.agents.cancelBtn}</button>
                  </div>
                </div>
              )}

              <div className="agents-grid">
                {/* Built-in Agents */}
                {Object.entries(agentConfigs).map(([key, info], index) => (
                  <div key={key} className="agent-card" style={{ '--i': index } as React.CSSProperties}>
                    <div className="agent-card-header">
                      <div className="agent-card-info">
                        {getAgentIcon(key, agentDisplayNames[key] ?? key)}
                        <div className="agent-card-title-group">
                          <div className="agent-card-name">{agentDisplayNames[key] ?? key}</div>
                          <div className="agent-card-subtitle">{info.model} · {t.agents.builtIn}</div>
                        </div>
                      </div>
                      <div className="modern-toggle-container">
                        <label className="modern-toggle">
                          <input type="checkbox" checked={agentEnabled[key] ?? true} onChange={e => handleAgentToggle(key, e.target.checked)} />
                          <span className="modern-toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Custom Agents */}
                {customAgents.map((agent, i) => (
                  <div key={`custom-${i}`} className="agent-card" style={{ '--i': i } as React.CSSProperties}>
                    <div className="agent-card-header">
                      <div className="agent-card-info">
                        <div className="agent-card-avatar" style={{ background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="agent-card-title-group">
                          <div className="agent-card-name">{agent.name}</div>
                          <div className="agent-card-subtitle">{t.agents.custom}</div>
                        </div>
                      </div>
                      <div className="modern-toggle-container">
                        <label className="modern-toggle">
                          <input type="checkbox" checked={agent.enabled} onChange={e => handleCustomAgentToggle(i, e.target.checked)} />
                          <span className="modern-toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Models' && (
            <div>
              <div className="settings-card" style={{ marginBottom: '24px' }}>
                <div className="settings-group">
                  <div className="settings-group-info">
                    <div className="settings-group-title">{t.models.fallbackTitle}</div>
                    <div className="settings-group-desc">{t.models.fallbackDesc}</div>
                  </div>
                  <div className="settings-group-control">
                    <label className="modern-toggle">
                      <input type="checkbox" checked={modelFallback} onChange={e => handleModelFallbackChange(e.target.checked)} />
                      <span className="modern-toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="settings-card">
                <div className="settings-group" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
                  <div className="settings-group-info" style={{ maxWidth: '100%' }}>
                    <div className="settings-group-title">{t.models.diagTitle}</div>
                    <div className="settings-group-desc">{t.models.diagDesc}</div>
                  </div>
                  <button className="modern-btn" onClick={handleTestConnection}>
                    <Icons.CheckCircle2 style={{ width: '16px', height: '16px' }}/> {t.models.runDiag}
                  </button>
                  {connectionStatus && (
                    <div style={{ padding: '12px 16px', width: '100%', borderRadius: 'var(--radius-md)', fontSize: '14px', backgroundColor: connectionStatus.type === 'success' ? 'var(--color-success-bg)' : 'rgba(239,68,68,0.1)', color: connectionStatus.type === 'success' ? 'var(--color-success)' : '#dc2626', border: `1px solid ${connectionStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                      {connectionStatus.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Editor' && (
            <div className="settings-card">
              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.editor.fontSizeTitle}</div>
                  <div className="settings-group-desc">{t.editor.fontSizeDesc}</div>
                </div>
                <div className="settings-group-control">
                  <input type="number" className="modern-input" min={8} max={32} value={editorFontSize} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) { setEditorFontSize(v); lsSet('mimi-editor-font-size', String(v)); } }} />
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.editor.tabWidthTitle}</div>
                  <div className="settings-group-desc">{t.editor.tabWidthDesc}</div>
                </div>
                <div className="settings-group-control">
                  <select className="modern-select" value={editorTabWidth} onChange={e => { setEditorTabWidth(e.target.value); lsSet('mimi-editor-tab-width', e.target.value); }}>
                    <option value="2">2 {t.editor.spaces}</option>
                    <option value="4">4 {t.editor.spaces}</option>
                    <option value="8">8 {t.editor.spaces}</option>
                  </select>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.editor.autoSaveTitle}</div>
                  <div className="settings-group-desc">{t.editor.autoSaveDesc}</div>
                </div>
                <div className="settings-group-control">
                  <label className="modern-toggle">
                    <input type="checkbox" checked={editorAutoSave} onChange={e => { setEditorAutoSave(e.target.checked); lsSet('mimi-editor-auto-save', String(e.target.checked)); }} />
                    <span className="modern-toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.editor.wordWrapTitle}</div>
                  <div className="settings-group-desc">{t.editor.wordWrapDesc}</div>
                </div>
                <div className="settings-group-control">
                  <label className="modern-toggle">
                    <input type="checkbox" checked={editorWordWrap} onChange={e => { setEditorWordWrap(e.target.checked); lsSet('mimi-editor-word-wrap', String(e.target.checked)); }} />
                    <span className="modern-toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Terminal' && (
            <div className="settings-card">
              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.terminal.shellTitle}</div>
                  <div className="settings-group-desc">{t.terminal.shellDesc}</div>
                </div>
                <div className="settings-group-control">
                  <input type="text" className="modern-input" value={termShell} onChange={e => { setTermShell(e.target.value); lsSet('mimi-terminal-shell', e.target.value); }} />
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.terminal.fontSizeTitle}</div>
                  <div className="settings-group-desc">{t.terminal.fontSizeDesc}</div>
                </div>
                <div className="settings-group-control">
                  <input type="number" className="modern-input" min={8} max={32} value={termFontSize} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) { setTermFontSize(v); lsSet('mimi-terminal-font-size', String(v)); } }} />
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.terminal.cursorTitle}</div>
                  <div className="settings-group-desc">{t.terminal.cursorDesc}</div>
                </div>
                <div className="settings-group-control">
                  <select className="modern-select" value={termCursorStyle} onChange={e => { setTermCursorStyle(e.target.value); lsSet('mimi-terminal-cursor-style', e.target.value); }}>
                    <option value="block">{t.terminal.cursorBlock}</option>
                    <option value="line">{t.terminal.cursorLine}</option>
                    <option value="underline">{t.terminal.cursorUnderline}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <div className="settings-card">
              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.notifications.taskCompleteTitle}</div>
                  <div className="settings-group-desc">{t.notifications.taskCompleteDesc}</div>
                </div>
                <div className="settings-group-control">
                  <label className="modern-toggle">
                    <input type="checkbox" checked={notifTaskComplete} onChange={e => { setNotifTaskComplete(e.target.checked); lsSet('mimi-notif-task-complete', String(e.target.checked)); }} />
                    <span className="modern-toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.notifications.agentInterceptTitle}</div>
                  <div className="settings-group-desc">{t.notifications.agentInterceptDesc}</div>
                </div>
                <div className="settings-group-control">
                  <label className="modern-toggle">
                    <input type="checkbox" checked={notifAgentIntercept} onChange={e => { setNotifAgentIntercept(e.target.checked); lsSet('mimi-notif-agent-intercept', String(e.target.checked)); }} />
                    <span className="modern-toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.notifications.soundTitle}</div>
                  <div className="settings-group-desc">{t.notifications.soundDesc}</div>
                </div>
                <div className="settings-group-control">
                  <label className="modern-toggle">
                    <input type="checkbox" checked={notifSound} onChange={e => { setNotifSound(e.target.checked); lsSet('mimi-notif-sound', String(e.target.checked)); }} />
                    <span className="modern-toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Advanced' && (
            <div className="settings-card">
              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.advanced.projectDirTitle}</div>
                  <div className="settings-group-desc">{t.advanced.projectDirDesc}</div>
                </div>
                <div className="settings-group-control">
                  <input type="text" className="modern-input" style={{ opacity: 0.6, backgroundColor: 'transparent', width: '240px' }} value={projectPath || t.advanced.notSet} readOnly />
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.advanced.logLevelTitle}</div>
                  <div className="settings-group-desc">{t.advanced.logLevelDesc}</div>
                </div>
                <div className="settings-group-control">
                  <select className="modern-select" value={logLevel} onChange={e => { setLogLevel(e.target.value); lsSet('mimi-log-level', e.target.value); }}>
                    <option value="debug">{t.advanced.logDebug}</option>
                    <option value="info">{t.advanced.logInfo}</option>
                    <option value="warn">{t.advanced.logWarn}</option>
                    <option value="error">{t.advanced.logError}</option>
                  </select>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-group-info">
                  <div className="settings-group-title">{t.advanced.cacheTitle}</div>
                  <div className="settings-group-desc">{t.advanced.cacheDesc}</div>
                </div>
                <div className="settings-group-control" style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {cacheClearMsg && <span style={{ color: 'var(--color-success)', fontSize: '13px' }}>{cacheClearMsg}</span>}
                  <button className="modern-btn" onClick={handleClearCache}>
                    <Icons.RefreshCw style={{ width: '16px', height: '16px' }} /> {t.advanced.clearCacheBtn}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
