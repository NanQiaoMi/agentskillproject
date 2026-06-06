import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Icons } from '../components/Icons';
import { AgentNode } from '../components/AgentNode';
import { invoke } from '@tauri-apps/api/core';
import { compileGraphToCrewAI } from '../utils/agentCompiler';

interface TeamBuilderCanvasProps {
  projectPath: string;
}

const getId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

const TeamBuilderCanvasInner: React.FC<TeamBuilderCanvasProps> = ({ projectPath }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const initialNodes = useMemo(() => {
    try {
      const saved = localStorage.getItem('mimi-team-flow-nodes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }, []);

  const initialEdges = useMemo(() => {
    try {
      const saved = localStorage.getItem('mimi-team-flow-edges');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  React.useEffect(() => {
    localStorage.setItem('mimi-team-flow-nodes', JSON.stringify(nodes));
    localStorage.setItem('mimi-team-flow-edges', JSON.stringify(edges));
  }, [nodes, edges]);

  const [availableAgents, setAvailableAgents] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('mimi-subagent-configs');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: '1', name: 'Hermes', role: 'Manager / Leader', icon: 'manager', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', apiKey: '' },
      { id: '2', name: 'Antigravity', role: 'Frontend Engineer', icon: 'coder', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', apiKey: '' },
      { id: '3', name: 'Codex', role: 'Backend Engineer', icon: 'coder', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', apiKey: '' }
    ];
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem('mimi-subagent-configs');
        if (stored) setAvailableAgents(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener('mimi-subagent-configs-updated', handleUpdate);
    return () => window.removeEventListener('mimi-subagent-configs-updated', handleUpdate);
  }, []);

  const nodeTypes = useMemo(() => ({ agentNode: AgentNode }), []);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onAddAgent = useCallback(
    (agentData: any) => {
      // Calculate a nice staggered position based on existing nodes count
      const offset = nodes.length * 30;
      const position = {
        x: 100 + offset,
        y: 100 + offset,
      };

      const newNode: Node = {
        id: getId(),
        type: 'agentNode',
        position,
        data: { 
          label: agentData.name, 
          role: agentData.role, 
          icon: agentData.icon,
          baseUrl: agentData.baseUrl,
          model: agentData.model,
          apiKey: agentData.apiKey,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [nodes.length, setNodes],
  );

  const clearCanvas = () => {
    if (window.confirm('确定要清空整块画板吗？所有节点和连线都会被删除。')) {
      setNodes([]);
      setEdges([]);
    }
  };

  const compileAndRun = async () => {
    if (nodes.length === 0) {
      alert('请先在画布上拖入并连接智能体！');
      return;
    }
    
    try {
      const pythonCode = compileGraphToCrewAI(nodes, edges);
      
      const targetDir = `${projectPath}/.agentflow/native`;
      
      const b64 = btoa(unescape(encodeURIComponent(pythonCode)));
      await invoke('run_shell_command', {
         command: `powershell -Command "New-Item -ItemType Directory -Force -Path '${targetDir}'; [IO.File]::WriteAllText('${targetDir}/agentflow_native.py', [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64}')))"`,
         cwd: projectPath 
      });

      alert('编译成功！已成功将图形化结构转换为原生的 Python CrewAI 代码并保存。您现在可以切换到【团队协作】模式启动任务了。');
    } catch (err: any) {
      alert('编译失败: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Sidebar for Available Agents */}
      <div style={{ 
        width: '240px', 
        borderRight: '1px solid var(--border-color)', 
        backgroundColor: 'var(--bg-panel)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto'
      }}>
        <h3 style={{ fontSize: '14px', color: 'var(--color-text-main)', marginBottom: '8px' }}>可用智能体(Agents)</h3>
        
        {availableAgents.map((agent: any) => (
          <div 
            key={agent.id}
            onClick={() => onAddAgent(agent)} 
            style={{ 
              padding: '14px', 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              border: '1px solid var(--border-color)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)';
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-main)' }}>
              {agent.name}
              <div style={{ padding: '2px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px' }}>
                <Icons.Plus style={{ width: '12px', height: '12px', color: '#3B82F6' }} />
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{agent.role}</div>
          </div>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={clearCanvas}
            style={{
              width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)',
              backgroundColor: 'transparent', color: 'var(--color-danger)', cursor: 'pointer',
              fontWeight: 500, fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Icons.Trash2 style={{ width: '14px', height: '14px' }} />
            清空画板
          </button>
          <button 
            onClick={compileAndRun}
            style={{
              width: '100%', padding: '10px', borderRadius: '6px', border: 'none',
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', 
              color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px'
            }}
          >
            <Icons.Play style={{ width: '14px', height: '14px' }} />
            编译并运行团队
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ flex: 1, height: '100%' }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={(connection) => connection.source !== connection.target}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
        >
          <Controls />
          <MiniMap />
          <Background variant={"dots" as any} gap={12} size={1} color="var(--color-text-muted)" />
        </ReactFlow>
      </div>
    </div>
  );
};

export const TeamBuilderCanvas: React.FC<TeamBuilderCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <TeamBuilderCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
