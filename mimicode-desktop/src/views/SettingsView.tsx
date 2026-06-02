import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Models');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
                  <input type="checkbox" id="modelfallback" defaultChecked />
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
              <button className="btn mt-4" style={{ alignSelf: 'flex-start' }}><Icons.CheckCircle2 style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Test Connection</button>
            </div>
          )}

          {activeTab === 'Agents' && (
            <div className="settings-form">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="text-sm text-muted">管理所有可用的智能体。</div>
                <button className="btn btn-ghost"><Icons.Plus style={{ width: '14px', height: '14px', marginRight: '4px' }}/> Add Agent</button>
              </div>

              <div className="agents-config-list flex-col gap-4">
                {['Hermes Agent', 'Antigravity', 'Codex', 'Claudecode'].map((name, i) => (
                  <div key={name} className="agent-cfg-item bg-main border rounded-md p-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', padding: '16px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div className="agent-avatar-large" style={{ width: '36px', height: '36px', fontSize: '16px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 600 }}>{name.charAt(0)}</div>
                      <div>
                        <div className="font-semibold text-main text-sm">{name}</div>
                        <div className="text-xs text-muted">MIMI智能团队开发成员</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="text-xs text-muted mb-1" style={{ marginBottom: '4px' }}>Model</span>
                        <select className="form-select" style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--color-text-main)' }}>
                          <option>Opus 4.5</option>
                          <option>Sonnet 3.7</option>
                          <option>GPT-4o</option>
                        </select>
                      </div>
                      <div className="toggle-switch">
                        <input type="checkbox" id={`setting-agent-${i}`} defaultChecked />
                        <label htmlFor={`setting-agent-${i}`}></label>
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
                  <label className="radio-label"><input type="radio" name="theme" defaultChecked /> Light</label>
                  <label className="radio-label"><input type="radio" name="theme" /> System</label>
                  <label className="radio-label"><input type="radio" name="theme" /> Dark</label>
                </div>
              </div>
              
              <div className="settings-group">
                <label className="settings-label" style={{ fontSize: '13px', fontWeight: 600 }}>Language</label>
                <select className="form-select" style={{ maxWidth: '300px', padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                  <option>简体中文</option>
                  <option>English</option>
                </select>
              </div>
            </div>
          )}

          {activeTab !== 'Models' && activeTab !== 'Agents' && activeTab !== 'General' && (
            <div className="text-muted" style={{ fontSize: '13px' }}>Settings section for {activeTab} will appear here.</div>
          )}
        </div>
      </div>
    </div>
  );
};
