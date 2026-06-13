import React, { useState } from 'react';
import { Icons } from './Icons';

export interface McpServer {
  id: string;
  name: string;
  command: string;
  args: string;
}

export const McpConfigPanel: React.FC = () => {
  const [servers, setServers] = useState<McpServer[]>(() => {
    const saved = localStorage.getItem('mimi-mcp-servers');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  const saveServers = (newServers: McpServer[]) => {
    setServers(newServers);
    localStorage.setItem('mimi-mcp-servers', JSON.stringify(newServers));
  };

  const addServer = () => {
    const newServer: McpServer = {
      id: Date.now().toString(),
      name: '',
      command: 'npx',
      args: ''
    };
    saveServers([...servers, newServer]);
  };

  const removeServer = (id: string) => {
    saveServers(servers.filter(s => s.id !== id));
  };

  const updateServer = (id: string, field: keyof McpServer, value: string) => {
    const newServers = servers.map(s => s.id === id ? { ...s, [field]: value } : s);
    saveServers(newServers);
  };

  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icons.Server style={{ width: '24px', height: '24px', color: '#3B82F6' }} />
            MCP Servers (Model Context Protocol)
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
            配置外部 MCP 服务器以为智能体提供文件读取、数据库访问等扩展工具能力。
          </p>
        </div>
        <button 
          className="modern-btn"
          onClick={addServer}
          style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: '#fff', border: 'none', padding: '0 20px', height: '40px', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Icons.Plus style={{ width: '18px', height: '18px' }} /> 添加服务器 (Add Server)
        </button>
      </div>

      {/* Server List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {servers.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <Icons.Server style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>未配置 MCP 服务器</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>点击上方按钮添加一个新的 MCP 服务器。</p>
          </div>
        )}

        {servers.map((server) => (
          <div key={server.id} style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden',
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
              gap: '16px',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 6px 16px rgba(16, 185, 129, 0.3), inset 0 2px 4px rgba(255,255,255,0.4)' }}>
                  <Icons.Database style={{ width: '24px', height: '24px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}/>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input 
                    value={server.name} 
                    onChange={e => updateServer(server.id, 'name', e.target.value)} 
                    style={{ background: 'transparent', border: 'none', fontSize: '18px', fontWeight: 700, color: 'var(--color-text-main)', outline: 'none', padding: 0 }}
                    placeholder="Server Name (e.g. postgres)"
                  />
                  <span style={{ fontSize: '13px', color: '#64748B' }}>MCP Server Configuration</span>
                </div>
              </div>
              <button 
                onClick={() => removeServer(server.id)}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', transition: 'background-color 0.2s' }}
                title="Remove Server"
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Icons.Trash2 style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Card Body */}
            <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#f8fafc' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icons.Terminal style={{ width: '16px', height: '16px', color: '#8B5CF6' }} /> 执行命令 (Command)
                </label>
                <input 
                  className="modern-input" 
                  style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', fontFamily: 'var(--font-mono)' }} 
                  value={server.command} 
                  onChange={e => updateServer(server.id, 'command', e.target.value)} 
                  placeholder="e.g. npx, python, docker" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icons.Code style={{ width: '16px', height: '16px', color: '#F59E0B' }} /> 参数 (Args) <span style={{ fontWeight: 400, color: '#94a3b8' }}>(以空格分隔)</span>
                </label>
                <input 
                  type="text" 
                  className="modern-input" 
                  style={{ fontFamily: 'var(--font-mono)', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} 
                  value={server.args} 
                  onChange={e => updateServer(server.id, 'args', e.target.value)} 
                  placeholder="e.g. -y @modelcontextprotocol/server-postgres postgresql://localhost/mydb" 
                />
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
