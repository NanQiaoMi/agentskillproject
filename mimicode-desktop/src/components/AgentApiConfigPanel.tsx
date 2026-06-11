import React, { useState } from 'react';
import { Icons } from './Icons';

const getAgentAvatar = (name: string, role: string) => {
  const n = name.toLowerCase();
  const r = role.toLowerCase();
  if (n.includes('hermes') || r.includes('manager')) return { Icon: Icons.Shield, bg: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)', shadow: 'rgba(245, 158, 11, 0.3)' };
  if (n.includes('antigravity') || r.includes('frontend')) return { Icon: Icons.Monitor, bg: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', shadow: 'rgba(59, 130, 246, 0.3)' };
  if (n.includes('codex') || r.includes('backend')) return { Icon: Icons.Database, bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', shadow: 'rgba(16, 185, 129, 0.3)' };
  if (n.includes('qa') || r.includes('tester')) return { Icon: Icons.TestTube, bg: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)', shadow: 'rgba(244, 63, 94, 0.3)' };
  if (n.includes('devops') || r.includes('devops')) return { Icon: Icons.Server, bg: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', shadow: 'rgba(139, 92, 246, 0.3)' };
  return { Icon: Icons.Code, bg: 'linear-gradient(135deg, #64748B 0%, #475569 100%)', shadow: 'rgba(100, 116, 139, 0.3)' };
};

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
        padding: '28px 32px', 
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(139, 92, 246, 0.06) 100%)', 
        borderRadius: '20px', 
        border: '1px solid rgba(59, 130, 246, 0.1)',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 2px 4px rgba(255,255,255,0.4)' }}>
            <Icons.GitBranch style={{ width: '20px', height: '20px', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-main)', margin: 0, letterSpacing: '-0.3px' }}>子智能体专有接口配置</h2>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, paddingLeft: '54px', lineHeight: '1.6' }}>
          为核心开发智能体分别设置独立的接口模型。您可以为不同岗位的 Agent 指定不同强度的模型，组建异构的顶尖 AI 团队。
        </p>
      </div>

      {/* Agents Grid/List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {agents.map((agent, idx) => {
          const avatar = getAgentAvatar(agent.name, agent.role);
          const IconComp = avatar.Icon;
          
          return (
          <div key={agent.id} className="settings-card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            borderRadius: '20px', 
            overflow: 'hidden', 
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.06), 0 4px 6px -2px rgba(0,0,0,0.03)',
            flexShrink: 0
          }}>
            
            {/* Card Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '20px 24px', 
              backgroundColor: '#ffffff', 
              borderBottom: '1px solid rgba(0,0,0,0.04)',
              gap: '16px'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: avatar.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 6px 16px ${avatar.shadow}, inset 0 2px 4px rgba(255,255,255,0.4)` }}>
                <IconComp style={{ width: '24px', height: '24px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}/>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input 
                  value={agent.name} 
                  onChange={e => updateAgent(idx, 'name', e.target.value)} 
                  style={{ background: 'transparent', border: 'none', fontSize: '18px', fontWeight: 700, color: 'var(--color-text-main)', outline: 'none', padding: 0 }}
                  placeholder="Agent Name"
                />
                <input 
                  value={agent.role} 
                  onChange={e => updateAgent(idx, 'role', e.target.value)} 
                  style={{ background: 'transparent', border: 'none', fontSize: '14px', color: 'var(--color-text-muted)', outline: 'none', padding: 0 }}
                  placeholder="Role (e.g. Frontend Engineer)"
                />
              </div>
            </div>

            {/* Card Body */}
            <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#f8fafc' }}>
              
              {/* Row 1: Provider and URL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.Cloud style={{ width: '16px', height: '16px', color: '#3B82F6' }} /> 服务商 (Provider)
                  </label>
                  <select 
                    className="modern-select" 
                    style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                    value={agent.provider || 'custom'} 
                    onChange={e => handleProviderChange(idx, e.target.value)}
                  >
                    {PROVIDER_PRESETS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.Globe style={{ width: '16px', height: '16px', color: '#10B981' }} /> Base URL
                  </label>
                  <input className="modern-input" style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} value={agent.baseUrl} onChange={e => updateAgent(idx, 'baseUrl', e.target.value)} placeholder="https://api.openai.com/v1" />
                </div>
              </div>

              {/* Row 2: API Key */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icons.Key style={{ width: '16px', height: '16px', color: '#F59E0B' }} /> API Key <span style={{ fontWeight: 400, color: '#94a3b8' }}>(多 Key 请用逗号分隔，支持自动负载均衡)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Icons.Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94a3b8' }} />
                  <input type="text" className="modern-input" style={{ paddingLeft: '40px', fontFamily: 'var(--font-mono)', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} value={agent.apiKey} onChange={e => updateAgent(idx, 'apiKey', e.target.value)} placeholder="sk-..." />
                </div>
              </div>

              {/* Row 3: Model and Actions */}
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.Box style={{ width: '16px', height: '16px', color: '#8B5CF6' }} /> 模型 (Model)
                  </label>
                  {availableModels[agent.id] && availableModels[agent.id].length > 0 ? (
                    <select className="modern-select" style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} value={agent.model} onChange={e => updateAgent(idx, 'model', e.target.value)}>
                      <option value="">-- 选择模型 --</option>
                      {availableModels[agent.id].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="modern-input" style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} value={agent.model} onChange={e => updateAgent(idx, 'model', e.target.value)} placeholder="gpt-4o" />
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="modern-btn" 
                    onClick={() => handleFetchModels(idx)} 
                    disabled={isFetchingModels[agent.id]}
                    style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', color: '#475569', padding: '0 24px', height: '42px', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                  >
                    {isFetchingModels[agent.id] ? '拉取中...' : '拉取可用模型'}
                  </button>
                  <button 
                    className="modern-btn" 
                    onClick={() => handleTestStream(idx)}
                    disabled={isTesting[agent.id]}
                    style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: '#fff', border: 'none', padding: '0 24px', height: '42px', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
                  >
                    <Icons.Play style={{ width: '16px', height: '16px', marginRight: '6px' }} />
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
          );
        })}
      </div>
    </div>
  );
};
