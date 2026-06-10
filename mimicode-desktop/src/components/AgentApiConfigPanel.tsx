import React, { useState } from 'react';
import { Icons } from './Icons';

export interface SubAgentConfig {
  id: string;
  name: string;
  role: string;
  icon: string;
  provider?: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

const PROVIDER_PRESETS = [
  { id: 'custom', name: '自定义 (Custom)', baseUrl: 'https://api.openai.com/v1', keys: '' },
  { id: 'sensenova', name: '商汤 (SenseNova)', baseUrl: 'https://token.sensenova.cn/v1', keys: 'sk-YTrTyea99VLT1ur2qAfHYLaoLZldCNOk,sk-sbSUsNQGxFYF58i2iojHKNtd8chEv8Nd,sk-zySxmLsVX9btbturk8f7cVPxhNedIThV,sk-agehZAReQqWPEF5xLb4zM3Eahq4mMcma,sk-j13RFixI1oPaxrmdqcxQXI55Io3NQnNh' },
  { id: 'iamhc', name: '新疆 API (iamhc)', baseUrl: 'https://api.iamhc.cn/v1', keys: 'sk-pxhK7PtVLHYUvJMirPUN6Khgn1uMipeYaYFEqIQpw54ISvzZ,sk-uu82vSct04rFiFdQ7J6zf0hYGkXvUbIt5IecewhBZ3PS2h1k,sk-1PEWqoG9ANtihdOReuZ5XSfMhDCtVWfo56JkbuCUmGP5xlsw' },
  { id: 'minimax', name: 'MiniMax', baseUrl: 'https://api.minimaxi.com/v1', keys: 'sk-cp-9G7oulFn08eTY0lRoa7OUhUj_nQfz515RUHADBHM2WgguDb9F_Z406RxL-bzfyFjsI-lBAOqCbA8vr1aa6Xz5y0qh_1othwe_H36HLtHUzfezSU0Iehwfmg,sk-cp-zLVM9j61k0CD_hmRvjoZWX0ABpn7wAtlaMK67H4P02g-Q6SR5VA1ESDp9Ke9mp1PzUw05x9TwXCCczF0BHig4ssaOB0OTqyJssWtCPQyu9rQcGRpmdd9MCA,sk-cp-DyqaK6rWfVRxrhtviymigqxMn31_JgUgTDVAniMEf40LyQTXniSKnNnoJbd79qSV17sCMTa-wiGnmCof0E7cob3g6eBOrZ0ZW_cQf1RG4vdYXMpT2kgJuGE,sk-cp-YfdX9kvxT9YradFLyKTb49mwo5l_rt2yGFtVAPEyESx1pWD85I6GfFwrzTZqyv-CrvvpkndvYPW1HNoN-2SPOMnsDBtKkXLgAoCCNnUE3lWQNp_qWdc6rVc' },
  { id: 'lyclaude', name: 'LyClaude', baseUrl: 'https://free.lyclaude.site/v1', keys: 'sk-5XD5nu6OIMpw6tN2R3idSr1yNJQXOZLOSe5v6F8MFi57Mzb1' }
];

const DEFAULT_AGENTS: SubAgentConfig[] = [
  { id: '1', name: 'Hermes', role: 'Manager / Leader', icon: 'manager', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', apiKey: '' },
  { id: '2', name: 'Antigravity', role: 'Frontend Engineer', icon: 'coder', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', apiKey: '' },
  { id: '3', name: 'Codex', role: 'Backend Engineer', icon: 'coder', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', apiKey: '' },
  { id: '4', name: 'QA', role: 'Tester', icon: 'coder', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', apiKey: '' },
  { id: '5', name: 'DevOps', role: 'DevOps Engineer', icon: 'coder', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', apiKey: '' },
];

export const AgentApiConfigPanel: React.FC = () => {
  const [agents, setAgents] = useState<SubAgentConfig[]>(() => {
    const saved = localStorage.getItem('mimi-subagent-configs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_AGENTS; }
    }
    return DEFAULT_AGENTS;
  });

  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
  const [isFetchingModels, setIsFetchingModels] = useState<Record<string, boolean>>({});
  const [testLog, setTestLog] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});

  const [providerModels, setProviderModels] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('mimi-provider-models');
    try { return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });

  React.useEffect(() => {
    localStorage.setItem('mimi-provider-models', JSON.stringify(providerModels));
  }, [providerModels]);

  React.useEffect(() => {
    localStorage.setItem('mimi-subagent-configs', JSON.stringify(agents));
    window.dispatchEvent(new Event('mimi-subagent-configs-updated'));
  }, [agents]);

  const updateAgent = (idx: number, field: keyof SubAgentConfig, value: string) => {
    const newAgents = [...agents];
    newAgents[idx] = { ...newAgents[idx], [field]: value };
    setAgents(newAgents);
    
    // Remember chosen model per provider
    if (field === 'model') {
      const provider = agents[idx].provider;
      if (provider && provider !== 'custom') {
        setProviderModels(prev => ({ ...prev, [provider]: value }));
      }
    }
  };

  // 随机挑选一个可用 key
  const getRandomKey = (keysStr: string) => {
    if (!keysStr) return '';
    const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return '';
    return keys[Math.floor(Math.random() * keys.length)];
  };

  const handleProviderChange = (idx: number, providerId: string) => {
    const preset = PROVIDER_PRESETS.find(p => p.id === providerId);
    const newAgents = [...agents];
    const savedModel = providerModels[providerId] || '';
    
    if (preset) {
      newAgents[idx] = { 
        ...newAgents[idx], 
        provider: providerId,
        baseUrl: preset.baseUrl,
        apiKey: preset.keys,
        model: savedModel || newAgents[idx].model
      };
    } else {
      newAgents[idx] = { 
        ...newAgents[idx], 
        provider: 'custom',
        model: savedModel || newAgents[idx].model
      };
    }
    setAgents(newAgents);
  };

  const handleFetchModels = async (idx: number) => {
    const agent = agents[idx];
    if (!agent.baseUrl) {
      setTestLog(prev => ({ ...prev, [agent.id]: '错误: 请先填写 Base URL' }));
      return;
    }
    
    setIsFetchingModels(prev => ({ ...prev, [agent.id]: true }));
    setTestLog(prev => ({ ...prev, [agent.id]: '正在拉取模型列表...' }));
    
    try {
      const url = agent.baseUrl.endsWith('/') ? `${agent.baseUrl}models` : `${agent.baseUrl}/models`;
      const headers: any = { 'Content-Type': 'application/json' };
      const currentKey = getRandomKey(agent.apiKey);
      if (currentKey) {
        headers['Authorization'] = `Bearer ${currentKey}`;
      }
      
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      let modelsList: string[] = [];
      if (Array.isArray(data)) {
        modelsList = data.map((m: any) => m.name || m.id);
      } else if (data.data && Array.isArray(data.data)) {
        modelsList = data.data.map((m: any) => m.id || m.name);
      } else if (data.models && Array.isArray(data.models)) {
        modelsList = data.models.map((m: any) => m.name || m.id);
      }
      
      setAvailableModels(prev => ({ ...prev, [agent.id]: modelsList }));
      setTestLog(prev => ({ ...prev, [agent.id]: `成功拉取 ${modelsList.length} 个模型！请在下拉框中选择。` }));
    } catch (e: any) {
      setTestLog(prev => ({ ...prev, [agent.id]: `获取模型失败: ${e.message}` }));
    } finally {
      setIsFetchingModels(prev => ({ ...prev, [agent.id]: false }));
    }
  };

  const handleTestStream = async (idx: number) => {
    const agent = agents[idx];
    if (!agent.baseUrl || !agent.model) {
      setTestLog(prev => ({ ...prev, [agent.id]: '错误: 请先填写 Base URL 和 Model' }));
      return;
    }
    
    setIsTesting(prev => ({ ...prev, [agent.id]: true }));
    setTestLog(prev => ({ ...prev, [agent.id]: '连接中...' }));
    
    try {
      const url = agent.baseUrl.endsWith('/') ? `${agent.baseUrl}chat/completions` : `${agent.baseUrl}/chat/completions`;
      const headers: any = { 'Content-Type': 'application/json' };
      const currentKey = getRandomKey(agent.apiKey);
      if (currentKey) {
        headers['Authorization'] = `Bearer ${currentKey}`;
      }
      
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: agent.model,
          messages: [{ role: 'user', content: 'Hello! Please reply in one short sentence.' }],
          stream: true
        })
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      
      if (!res.body) throw new Error('No response body');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let completeText = '';
      
      setTestLog(prev => ({ ...prev, [agent.id]: '' }));
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6));
              const delta = parsed.choices[0]?.delta?.content || '';
              completeText += delta;
              setTestLog(prev => ({ ...prev, [agent.id]: completeText }));
            } catch (e) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }
      completeText += '\n\n[流式测试完成]';
      setTestLog(prev => ({ ...prev, [agent.id]: completeText }));
    } catch (e: any) {
      setTestLog(prev => ({ ...prev, [agent.id]: `测试失败: ${e.message}` }));
    } finally {
      setIsTesting(prev => ({ ...prev, [agent.id]: false }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '64px' }}>
      
      {/* Banner Area */}
      <div style={{ 
        padding: '24px', 
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.03) 100%)', 
        borderRadius: '16px', 
        border: '1px solid rgba(59, 130, 246, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Icons.GitBranch style={{ width: '16px', height: '16px' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>子智能体专有接口配置</h2>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, paddingLeft: '44px', lineHeight: '1.6' }}>
          为 5 个核心开发智能体分别设置独立的 OpenAI 兼容接口（如 Ollama, DeepSeek 等）。您可以为不同岗位的 Agent 指定不同强度的模型以组建异构的顶尖 AI 团队。
        </p>
      </div>

      {/* Agents Grid/List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {agents.map((agent, idx) => (
          <div key={agent.id} className="settings-card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            borderRadius: '16px', 
            overflow: 'hidden', 
            border: '1px solid var(--border-color)',
            flexShrink: 0 /* This prevents the flexbox from slicing the card */
          }}>
            
            {/* Card Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '16px 24px', 
              backgroundColor: 'var(--bg-main)', 
              borderBottom: '1px solid var(--border-color)',
              gap: '12px'
            }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                {agent.icon === 'manager' ? <Icons.Shield style={{ width: '18px', height: '18px' }}/> : <Icons.Code style={{ width: '18px', height: '18px' }}/>}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <input 
                  value={agent.name} 
                  onChange={e => updateAgent(idx, 'name', e.target.value)} 
                  style={{ background: 'transparent', border: 'none', fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', outline: 'none', padding: 0 }}
                  placeholder="Agent Name"
                />
                <input 
                  value={agent.role} 
                  onChange={e => updateAgent(idx, 'role', e.target.value)} 
                  style={{ background: 'transparent', border: 'none', fontSize: '13px', color: 'var(--color-text-muted)', outline: 'none', padding: 0, marginTop: '2px' }}
                  placeholder="Role (e.g. Frontend Engineer)"
                />
              </div>
            </div>

            {/* Card Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'var(--bg-panel)' }}>
              
              {/* Row 1: Provider and URL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>服务商 (Provider)</label>
                  <select 
                    className="modern-select" 
                    value={agent.provider || 'custom'} 
                    onChange={e => handleProviderChange(idx, e.target.value)}
                  >
                    {PROVIDER_PRESETS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>Base URL</label>
                  <input className="modern-input" value={agent.baseUrl} onChange={e => updateAgent(idx, 'baseUrl', e.target.value)} placeholder="https://api.openai.com/v1" />
                </div>
              </div>

              {/* Row 2: API Key */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>API Key (可填入多个以逗号分隔，后端每次调用随机挑选负载均衡)</label>
                <input type="text" className="modern-input" value={agent.apiKey} onChange={e => updateAgent(idx, 'apiKey', e.target.value)} placeholder="sk-..." />
              </div>

              {/* Row 2: Model and Actions */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>模型 (Model)</label>
                  {availableModels[agent.id] && availableModels[agent.id].length > 0 ? (
                    <select className="modern-select" value={agent.model} onChange={e => updateAgent(idx, 'model', e.target.value)}>
                      <option value="">-- 选择模型 --</option>
                      {availableModels[agent.id].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="modern-input" value={agent.model} onChange={e => updateAgent(idx, 'model', e.target.value)} placeholder="gpt-4o" />
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="modern-btn" 
                    onClick={() => handleFetchModels(idx)} 
                    disabled={isFetchingModels[agent.id]}
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--color-text-main)', padding: '0 20px', height: '40px' }}
                  >
                    {isFetchingModels[agent.id] ? '拉取中...' : '拉取可用模型'}
                  </button>
                  <button 
                    className="modern-btn" 
                    onClick={() => handleTestStream(idx)}
                    disabled={isTesting[agent.id]}
                    style={{ backgroundColor: 'var(--color-primary-blue)', color: '#fff', border: 'none', padding: '0 20px', height: '40px' }}
                  >
                    <Icons.Play style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                    {isTesting[agent.id] ? '测试中...' : '连接测试'}
                  </button>
                </div>
              </div>

              {/* Test Log Terminal */}
              {testLog[agent.id] && (
                <div style={{ 
                  marginTop: '4px', 
                  padding: '16px', 
                  backgroundColor: '#0f172a', 
                  borderRadius: '10px', 
                  fontSize: '13px', 
                  fontFamily: 'var(--font-mono)',
                  color: '#e2e8f0',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid #1e293b',
                  lineHeight: '1.5'
                }}>
                  {testLog[agent.id]}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
