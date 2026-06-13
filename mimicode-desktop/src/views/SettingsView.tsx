import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';
import { AgentApiConfigPanel } from '../components/AgentApiConfigPanel';
import { McpConfigPanel } from '../components/McpConfigPanel';

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
      Agents: 'Local TUI Agents',
      AgentAPI: 'AgentTeam Config',
      Models: 'Models',
      Editor: 'Editor',
      Terminal: 'Terminal',
      Notifications: 'Notifications',
      Advanced: 'Advanced',
      McpServers: 'MCP Servers',
    },
    subtitles: {
      General: 'Manage your basic preferences, API keys, and language settings.',
      Agents: 'Configure built-in and custom AI agents.',
      AgentAPI: 'Customize independent API endpoints, models, and keys for subagents.',
      Models: 'Set up LLM providers and fallback strategies.',
      Editor: 'Customize the built-in code editor behavior and appearance.',
      Terminal: 'Configure terminal display and default shell.',
      Notifications: 'Adjust system notifications and sounds.',
      Advanced: 'Advanced diagnostics and cache management.',
      McpServers: 'Configure Model Context Protocol (MCP) servers for extended agent capabilities.',
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
      openaiTitle: 'Local TUI API Config',
      openaiDesc: 'Configure API key, base URL, and model for the local Terminal User Interface and Main Agent.',
      baseUrlPlaceholder: 'Base URL (e.g. https://api.openai.com/v1)',
      modelPlaceholder: 'Model',
      deepseekTitle: 'DeepSeek API Key',
      deepseekDesc: 'Required for DeepSeek models.',
      lyclaudeTitle: 'LyClaude API Configuration',
      lyclaudeDesc: 'Required for LyClaude API endpoints.'
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
      Agents: '本地智能体 (TUI)',
      AgentAPI: '多智能体协作 (AgentTeam)',
      Models: '模型',
      Editor: '编辑器',
      Terminal: '终端',
      Notifications: '通知',
      Advanced: '高级',
      McpServers: 'MCP 服务器',
    },
    subtitles: {
      General: '管理应用偏好、API 密钥与界面语言。',
      Agents: '配置内置智能体或添加自定义的本地 CLI 智能体。',
      AgentAPI: '为各子智能体配置独立的 API 端点、模型与密钥。',
      Models: '设置 LLM 接口供应商与模型异常时的回退策略。',
      Editor: '自定义内置代码编辑器的显示与行为。',
      Terminal: '配置终端窗口的显示风格与默认 Shell。',
      Notifications: '设置系统通知与声音提醒。',
      Advanced: '高级调试与缓存管理。',
      McpServers: '配置模型上下文协议 (MCP) 服务器以扩展智能体能力。',
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
      openaiTitle: '本地 TUI 接口配置',
      openaiDesc: '控制本地终端交互界面 (TUI) 和主控智能体所使用的大模型默认接口。多智能体协作(AgentTeam)的配置请在下一选项卡中设置。',
      baseUrlPlaceholder: '基础 URL (如: https://api.openai.com/v1)',
      modelPlaceholder: '模型名称 (如: gpt-4o)',
      deepseekTitle: 'DeepSeek API 密钥',
      deepseekDesc: 'DeepSeek 系列模型必需。',
      lyclaudeTitle: 'LyClaude API 接口配置',
      lyclaudeDesc: '用于 LyClaude 代理服务商（支持 Claude 等模型）。'
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
  const [lyclaudeKey, setLyclaudeKey] = useState('');
  const [lyclaudeBaseUrl, setLyclaudeBaseUrl] = useState(() => lsGet('mimi-lyclaude-base-url', 'https://free.lyclaude.site/v1'));
  const [lyclaudeModel, setLyclaudeModel] = useState(() => lsGet('mimi-lyclaude-model', 'claude-3-5-sonnet-20241022'));
  const [isSaving, setIsSaving] = useState(false);

  const [availableOpenAIModels, setAvailableOpenAIModels] = useState<string[]>([]);
  const [isFetchingOpenAIModels, setIsFetchingOpenAIModels] = useState(false);

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
      try { const lyclaude = await invoke("get_credential", { service: "lyclaude", username: "default" }); if (lyclaude) setLyclaudeKey(lyclaude as string); } catch (e) {}
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

  const handleFetchOpenAIModels = async () => {
    if (!openAIBaseUrl) return;
    setIsFetchingOpenAIModels(true);
    try {
      const url = openAIBaseUrl.endsWith('/') ? `${openAIBaseUrl}models` : `${openAIBaseUrl}/models`;
      const headers: any = { 'Content-Type': 'application/json' };
      const keys = openAIKey.split(',').map(k => k.trim()).filter(Boolean);
      const key = keys.length > 0 ? keys[Math.floor(Math.random() * keys.length)] : '';
      if (key) {
        headers['Authorization'] = `Bearer ${key}`;
      }
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        let modelsList: string[] = [];
        if (Array.isArray(data)) modelsList = data.map((m: any) => m.name || m.id);
        else if (data.data && Array.isArray(data.data)) modelsList = data.data.map((m: any) => m.id || m.name);
        else if (data.models && Array.isArray(data.models)) modelsList = data.models.map((m: any) => m.name || m.id);
        if (modelsList.length > 0) {
          setAvailableOpenAIModels(modelsList);
        } else {
          alert('未能获取到有效的模型列表 (空数组)');
        }
      } else {
        alert(`获取模型失败: HTTP ${res.status}`);
      }
    } catch (e: any) {
      alert(`获取模型失败: ${e.message}`);
    } finally {
      setIsFetchingOpenAIModels(false);
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
    setTimeout(() => {
      setCacheClearMsg('');
      window.location.reload();
    }, 1500);
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

  const SettingIconBox = ({ icon: Icon, color, rgb }: { icon: any, color: string, rgb: string }) => (
    <div style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      width: '36px', height: '36px', borderRadius: '10px', 
      background: `linear-gradient(135deg, rgba(${rgb}, 0.15) 0%, rgba(${rgb}, 0.05) 100%)`, 
      color: color, marginRight: '10px', 
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 6px rgba(0,0,0,0.04)',
      border: `1px solid rgba(${rgb}, 0.1)`
    }}>
      <Icon style={{ width: '20px', height: '20px' }} />
    </div>
  );

  return (
    <div className="view-container bg-panel" style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column' }}>
      <div className="settings-container" style={{ flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div className="settings-sidebar">
          <div className="settings-sidebar-header">{t.settingsTitle}</div>
          {['General', 'AgentAPI', 'McpServers', 'Agents', 'Models', 'Editor', 'Terminal', 'Notifications', 'Advanced'].map(tab => (
            <div 
              key={tab} 
              className={`settings-nav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'General' && <Icons.Settings className="settings-nav-icon" />}
              {tab === 'AgentAPI' && <Icons.GitBranch className="settings-nav-icon" />}
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
                  <div className="settings-group-title"><Icons.Palette style={{ color: 'var(--color-primary-orange)', width: '18px', height: '18px' }} /> {t.general.themeTitle}</div>
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
                  <div className="settings-group-title"><Icons.Globe style={{ color: '#3B82F6', width: '18px', height: '18px' }} /> {t.general.langTitle}</div>
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
                  <div className="settings-group-title"><Icons.Key style={{ color: '#8B5CF6', width: '18px', height: '18px' }} /> {t.general.anthropicTitle}</div>
                  <div className="settings-group-desc">{t.general.anthropicDesc}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type="password" className="modern-input" style={{ width: '100%', paddingLeft: '36px', fontFamily: 'var(--font-mono)' }} placeholder="sk-ant-..." value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} />
                    <Icons.Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' }} />
                  </div>
                  <button className="modern-btn" style={{ minWidth: '100px', backgroundColor: 'var(--bg-hover)' }} onClick={() => handleSaveKey('anthropic', anthropicKey)} disabled={isSaving}>{t.general.save}</button>
                </div>
              </div>

              <div className="settings-group" style={{ flexDirection: 'column', gap: '16px' }}>
                <div className="settings-group-info" style={{ maxWidth: '100%' }}>
                  <div className="settings-group-title"><Icons.Cpu style={{ color: '#10B981', width: '18px', height: '18px' }} /> {t.general.deepseekTitle}</div>
                  <div className="settings-group-desc">{t.general.deepseekDesc}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type="password" className="modern-input" style={{ width: '100%', paddingLeft: '36px', fontFamily: 'var(--font-mono)' }} placeholder="sk-..." value={deepseekKey} onChange={e => setDeepseekKey(e.target.value)} />
                    <Icons.Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' }} />
                  </div>
                  <button className="modern-btn" style={{ minWidth: '100px', backgroundColor: 'var(--bg-hover)' }} onClick={() => handleSaveKey('deepseek', deepseekKey)} disabled={isSaving}>{t.general.save}</button>
                </div>
              </div>

              <div className="settings-group" style={{ flexDirection: 'column', gap: '16px' }}>
                <div className="settings-group-info" style={{ maxWidth: '100%' }}>
                  <div className="settings-group-title"><Icons.Cloud style={{ color: '#F59E0B', width: '18px', height: '18px' }} /> {t.general.lyclaudeTitle}</div>
                  <div className="settings-group-desc">{t.general.lyclaudeDesc}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type="text" className="modern-input" style={{ width: '100%', paddingLeft: '36px', fontFamily: 'var(--font-mono)' }} placeholder={t.general.baseUrlPlaceholder} value={lyclaudeBaseUrl} onChange={e => { setLyclaudeBaseUrl(e.target.value); lsSet('mimi-lyclaude-base-url', e.target.value); }} />
                    <Icons.Link2 style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' }} />
                  </div>
                  <div style={{ flex: '0 0 240px', position: 'relative' }}>
                    <input type="text" className="modern-input" style={{ width: '100%', paddingLeft: '36px', fontFamily: 'var(--font-mono)' }} placeholder={t.general.modelPlaceholder} value={lyclaudeModel} onChange={e => { setLyclaudeModel(e.target.value); lsSet('mimi-lyclaude-model', e.target.value); }} />
                    <Icons.Box style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type="password" className="modern-input" style={{ width: '100%', paddingLeft: '36px', fontFamily: 'var(--font-mono)' }} placeholder="sk-..." value={lyclaudeKey} onChange={e => setLyclaudeKey(e.target.value)} />
                    <Icons.Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' }} />
                  </div>
                  <button className="modern-btn" style={{ minWidth: '100px', backgroundColor: 'var(--bg-hover)' }} onClick={() => handleSaveKey('lyclaude', lyclaudeKey)} disabled={isSaving}>{t.general.save}</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Agents' && (
            <div>
              <div className="settings-card" style={{ marginBottom: '24px', padding: '24px' }}>
                <div className="settings-group" style={{ flexDirection: 'column', gap: '20px', border: 'none', padding: 0, backgroundColor: 'transparent' }}>
                  <div className="settings-group-info" style={{ maxWidth: '100%' }}>
                    <div className="settings-group-title" style={{ fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <SettingIconBox icon={Icons.Server} color="#F97316" rgb="249, 115, 22" />
                        {t.general.openaiTitle}
                      </div>
                      <div className="mimi-tooltip-wrapper">
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--bg-hover)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', cursor: 'help' }}>
                          ?
                        </div>
                        <div className="mimi-tooltip-content">
                          <span style={{color: '#F97316', fontWeight: 600}}>隐藏作用：</span>在多智能体协作(AgentTeam)中，如果某个子智能体没有配置专属接口模型，系统将默认回退(Fallback)使用此处的模型配置。
                        </div>
                      </div>
                    </div>
                    <div className="settings-group-desc" style={{ fontSize: '13px', marginLeft: '42px' }}>{t.general.openaiDesc}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input type="text" className="modern-input" style={{ width: '100%', paddingLeft: '36px', fontFamily: 'var(--font-mono)' }} placeholder={t.general.baseUrlPlaceholder} value={openAIBaseUrl} onChange={e => { setOpenAIBaseUrl(e.target.value); lsSet('mimi-openai-base-url', e.target.value); }} />
                      <Icons.Link2 style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' }} />
                    </div>
                    <div style={{ flex: '0 0 240px', position: 'relative' }}>
                      {availableOpenAIModels.length > 0 ? (
                        <select className="modern-select" style={{ width: '100%', paddingLeft: '36px', fontFamily: 'var(--font-mono)' }} value={openAIModel} onChange={e => { setOpenAIModel(e.target.value); lsSet('mimi-openai-model', e.target.value); }}>
                          <option value="">-- 选择模型 --</option>
                          {availableOpenAIModels.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      ) : (
                        <input type="text" className="modern-input" style={{ width: '100%', paddingLeft: '36px', fontFamily: 'var(--font-mono)' }} placeholder={t.general.modelPlaceholder} value={openAIModel} onChange={e => { setOpenAIModel(e.target.value); lsSet('mimi-openai-model', e.target.value); }} />
                      )}
                      <Icons.Box style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' }} />
                    </div>
                    <button className="modern-btn" onClick={handleFetchOpenAIModels} disabled={isFetchingOpenAIModels} style={{ minWidth: '100px', backgroundColor: 'var(--bg-panel)' }}>
                      {isFetchingOpenAIModels ? '拉取中...' : '拉取模型'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input type="password" className="modern-input" style={{ width: '100%', paddingLeft: '36px', fontFamily: 'var(--font-mono)' }} placeholder="sk-..." value={openAIKey} onChange={e => setOpenAIKey(e.target.value)} />
                      <Icons.Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' }} />
                    </div>
                    <button className="modern-btn" style={{ minWidth: '100px', backgroundColor: 'var(--bg-hover)' }} onClick={() => handleSaveKey('openai', openAIKey)} disabled={isSaving}>{t.general.save}</button>
                  </div>
                </div>
              </div>
              {!showAddAgent && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                  <div 
                    className="agent-card" 
                    onClick={() => setShowAddAgent(true)}
                    style={{ 
                      border: '1px dashed var(--color-border)', 
                      backgroundColor: 'transparent', 
                      cursor: 'pointer',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      minHeight: '180px',
                      boxShadow: 'none'
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                      <Icons.Plus style={{ width: '24px', height: '24px' }} />
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)' }}>{t.agents.addCustom}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>创建专属于您的本地或远端智能体</div>
                  </div>
                </div>
              )}

              {/* Add Agent Form */}
              {showAddAgent && (
                <div className="settings-card" style={{ marginBottom: '24px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', animation: 'cardSlideIn 0.4s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)' }}>
                      <Icons.Plus style={{ width: '20px', height: '20px' }} />
                    </div>
                    <div>
                      <div className="settings-group-title" style={{ fontSize: '18px', marginBottom: '4px' }}>{t.agents.createTitle}</div>
                      <div className="settings-group-desc" style={{ fontSize: '13px' }}>配置一个新的大语言模型实例作为智能体参与工作流</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input className="modern-input" style={{ flex: 1, height: '44px', fontSize: '15px' }} placeholder={t.agents.namePlaceholder} value={newAgentName} onChange={e => setNewAgentName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddAgent(); }} autoFocus />
                    <button className="modern-btn" style={{ height: '44px', padding: '0 24px', background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)' }} onClick={handleAddAgent}>{t.agents.addBtn}</button>
                    <button className="modern-btn" style={{ height: '44px', padding: '0 24px' }} onClick={() => { setShowAddAgent(false); setNewAgentName(''); }}>{t.agents.cancelBtn}</button>
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
                        <div className="agent-card-avatar" style={{ 
                          background: [
                            'linear-gradient(135deg, #FF6B6B 0%, #C0392B 100%)',
                            'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)',
                            'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
                            'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
                            'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
                            'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)'
                          ][Math.abs(agent.name.split('').reduce((a,b)=>a+b.charCodeAt(0),0)) % 6], 
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
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

          {activeTab === 'AgentAPI' && (
            <AgentApiConfigPanel />
          )}

          {activeTab === 'McpServers' && (
            <McpConfigPanel />
          )}

          {activeTab === 'Models' && (
            <div>
              <div className="settings-card" style={{ marginBottom: '24px', padding: '8px' }}>
                <div className="settings-group" style={{ borderRadius: '12px' }}>
                  <div className="settings-group-info">
                    <div className="settings-group-title">
                      <SettingIconBox icon={Icons.Activity} color="#3B82F6" rgb="59, 130, 246" />
                      {t.models.fallbackTitle}
                    </div>
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
              
              <div className="settings-card" style={{ padding: '8px' }}>
                <div className="settings-group" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start', borderRadius: '12px' }}>
                  <div className="settings-group-info" style={{ maxWidth: '100%' }}>
                    <div className="settings-group-title">
                      <SettingIconBox icon={Icons.Server} color="#8B5CF6" rgb="139, 92, 246" />
                      {t.models.diagTitle}
                    </div>
                    <div className="settings-group-desc">{t.models.diagDesc}</div>
                  </div>
                  <button className="modern-btn" onClick={handleTestConnection} style={{ backgroundColor: '#8B5CF6', color: '#fff', borderColor: '#8B5CF6' }}>
                    <Icons.CheckCircle2 style={{ width: '16px', height: '16px' }}/> {t.models.runDiag}
                  </button>
                  {connectionStatus && (
                    <div style={{ padding: '12px 16px', width: '100%', borderRadius: '8px', fontSize: '14px', backgroundColor: connectionStatus.type === 'success' ? 'var(--color-success-bg)' : 'rgba(239,68,68,0.1)', color: connectionStatus.type === 'success' ? 'var(--color-success)' : '#dc2626', border: `1px solid ${connectionStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                      {connectionStatus.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Editor' && (
            <div className="settings-card" style={{ padding: '8px' }}>
              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.Type} color="#8B5CF6" rgb="139, 92, 246" />
                    {t.editor.fontSizeTitle}
                  </div>
                  <div className="settings-group-desc">{t.editor.fontSizeDesc}</div>
                </div>
                <div className="settings-group-control">
                  <input type="number" className="modern-input" min={8} max={32} value={editorFontSize} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) { setEditorFontSize(v); lsSet('mimi-editor-font-size', String(v)); window.dispatchEvent(new Event('mimi-editor-settings-updated')); } }} />
                </div>
              </div>

              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.AlignLeft} color="#3B82F6" rgb="59, 130, 246" />
                    {t.editor.tabWidthTitle}
                  </div>
                  <div className="settings-group-desc">{t.editor.tabWidthDesc}</div>
                </div>
                <div className="settings-group-control">
                  <select className="modern-select" value={editorTabWidth} onChange={e => { setEditorTabWidth(e.target.value); lsSet('mimi-editor-tab-width', e.target.value); window.dispatchEvent(new Event('mimi-editor-settings-updated')); }}>
                    <option value="2">2 {t.editor.spaces}</option>
                    <option value="4">4 {t.editor.spaces}</option>
                    <option value="8">8 {t.editor.spaces}</option>
                  </select>
                </div>
              </div>

              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.Save} color="#10B981" rgb="16, 185, 129" />
                    {t.editor.autoSaveTitle}
                  </div>
                  <div className="settings-group-desc">{t.editor.autoSaveDesc}</div>
                </div>
                <div className="settings-group-control">
                  <label className="modern-toggle">
                    <input type="checkbox" checked={editorAutoSave} onChange={e => { setEditorAutoSave(e.target.checked); lsSet('mimi-editor-auto-save', String(e.target.checked)); window.dispatchEvent(new Event('mimi-editor-settings-updated')); }} />
                    <span className="modern-toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.WrapText} color="#F59E0B" rgb="245, 158, 11" />
                    {t.editor.wordWrapTitle}
                  </div>
                  <div className="settings-group-desc">{t.editor.wordWrapDesc}</div>
                </div>
                <div className="settings-group-control">
                  <label className="modern-toggle">
                    <input type="checkbox" checked={editorWordWrap} onChange={e => { setEditorWordWrap(e.target.checked); lsSet('mimi-editor-word-wrap', String(e.target.checked)); window.dispatchEvent(new Event('mimi-editor-settings-updated')); }} />
                    <span className="modern-toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Terminal' && (
            <div className="settings-card" style={{ padding: '8px' }}>
              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.Terminal} color="#14B8A6" rgb="20, 184, 166" />
                    {t.terminal.shellTitle}
                  </div>
                  <div className="settings-group-desc">{t.terminal.shellDesc}</div>
                </div>
                <div className="settings-group-control">
                  <input type="text" className="modern-input" value={termShell} onChange={e => { setTermShell(e.target.value); lsSet('mimi-terminal-shell', e.target.value); }} />
                </div>
              </div>

              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.Type} color="#6366F1" rgb="99, 102, 241" />
                    {t.terminal.fontSizeTitle}
                  </div>
                  <div className="settings-group-desc">{t.terminal.fontSizeDesc}</div>
                </div>
                <div className="settings-group-control">
                  <input type="number" className="modern-input" min={8} max={32} value={termFontSize} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) { setTermFontSize(v); lsSet('mimi-terminal-font-size', String(v)); } }} />
                </div>
              </div>

              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.Edit2} color="#EC4899" rgb="236, 72, 153" />
                    {t.terminal.cursorTitle}
                  </div>
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
            <div className="settings-card" style={{ padding: '8px' }}>
              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.CheckCircle2} color="#10B981" rgb="16, 185, 129" />
                    {t.notifications.taskCompleteTitle}
                  </div>
                  <div className="settings-group-desc">{t.notifications.taskCompleteDesc}</div>
                </div>
                <div className="settings-group-control">
                  <label className="modern-toggle">
                    <input type="checkbox" checked={notifTaskComplete} onChange={e => { setNotifTaskComplete(e.target.checked); lsSet('mimi-notif-task-complete', String(e.target.checked)); }} />
                    <span className="modern-toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.Shield} color="#F43F5E" rgb="244, 63, 94" />
                    {t.notifications.agentInterceptTitle}
                  </div>
                  <div className="settings-group-desc">{t.notifications.agentInterceptDesc}</div>
                </div>
                <div className="settings-group-control">
                  <label className="modern-toggle">
                    <input type="checkbox" checked={notifAgentIntercept} onChange={e => { setNotifAgentIntercept(e.target.checked); lsSet('mimi-notif-agent-intercept', String(e.target.checked)); }} />
                    <span className="modern-toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.Bell} color="#3B82F6" rgb="59, 130, 246" />
                    {t.notifications.soundTitle}
                  </div>
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
            <div className="settings-card" style={{ padding: '8px' }}>
              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.FolderOpen} color="#F59E0B" rgb="245, 158, 11" />
                    {t.advanced.projectDirTitle}
                  </div>
                  <div className="settings-group-desc">{t.advanced.projectDirDesc}</div>
                </div>
                <div className="settings-group-control">
                  <input type="text" className="modern-input" style={{ opacity: 0.6, backgroundColor: 'transparent', width: '240px' }} value={projectPath || t.advanced.notSet} readOnly />
                </div>
              </div>

              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.Activity} color="#10B981" rgb="16, 185, 129" />
                    {t.advanced.logLevelTitle}
                  </div>
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

              <div className="settings-group" style={{ borderRadius: '12px' }}>
                <div className="settings-group-info">
                  <div className="settings-group-title">
                    <SettingIconBox icon={Icons.Trash2} color="#EF4444" rgb="239, 68, 68" />
                    {t.advanced.cacheTitle}
                  </div>
                  <div className="settings-group-desc">{t.advanced.cacheDesc}</div>
                </div>
                <div className="settings-group-control" style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {cacheClearMsg && <span style={{ color: 'var(--color-success)', fontSize: '13px' }}>{cacheClearMsg}</span>}
                  <button className="modern-btn" onClick={handleClearCache} style={{ backgroundColor: '#EF4444', color: '#fff', borderColor: '#EF4444' }}>
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
