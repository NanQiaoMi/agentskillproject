import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Icons } from '../components/Icons';
import { AgentNode } from '../components/AgentNode';
import { FeedbackEdge } from '../components/FeedbackEdge';
import { InputNode } from '../components/nodes/InputNode';
import { ToolNode } from '../components/nodes/ToolNode';
import { RouterNode } from '../components/nodes/RouterNode';
import { invoke } from '@tauri-apps/api/core';
import { compileGraphToCrewAI } from '../utils/agentCompiler';
import { TEAM_TEMPLATES, TeamTemplate } from '../utils/teamTemplates';
import dagre from 'dagre';

interface TeamBuilderCanvasProps {
  projectPath: string;
  onNavigateToTeam?: () => void;
}

const getId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  // Change to LR (Left to Right) for Blender-style node flow
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120 });

  nodes.forEach((node) => {
    // Bounding box for new Blender-style AgentNode cards (240px width, 160px height)
    dagreGraph.setNode(node.id, { width: 240, height: 160 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 120, // Convert center back to top-left (half of 240px)
        y: nodeWithPosition.y - 80,  // Convert center back to top-left (half of 160px)
      },
    };
  });
};

const TeamBuilderCanvasInner: React.FC<TeamBuilderCanvasProps> = ({ projectPath, onNavigateToTeam }) => {
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

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ taskDescription: '', expectedOutput: '', asyncExecution: false });
  
  const [aiPlanModalOpen, setAiPlanModalOpen] = useState(false);
  const [globalGoal, setGlobalGoal] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [isDocScanning, setIsDocScanning] = useState(false);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);

  const nodesRef = useRef(nodes);
  React.useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  React.useEffect(() => {
    const handleEdit = (e: any) => {
      const id = e.detail.id;
      const node = nodesRef.current.find(n => n.id === id);
      if (node) {
        setEditingNodeId(id);
        setTaskForm({
          taskDescription: (node.data.taskDescription as string) || '',
          expectedOutput: (node.data.expectedOutput as string) || '',
          asyncExecution: !!node.data.asyncExecution
        });
      }
    };
    window.addEventListener('edit-agent-node', handleEdit);
    return () => window.removeEventListener('edit-agent-node', handleEdit);
  }, []);

  React.useEffect(() => {
    localStorage.setItem('mimi-team-flow-nodes', JSON.stringify(nodes));
    localStorage.setItem('mimi-team-flow-edges', JSON.stringify(edges));
    window.dispatchEvent(new CustomEvent('mimi-graph-updated'));
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

  const nodeTypes = useMemo(() => ({ 
    agentNode: AgentNode,
    inputNode: InputNode,
    toolNode: ToolNode,
    routerNode: RouterNode
  }), []);
  const edgeTypes = useMemo(() => ({ feedback: FeedbackEdge }), []);

  const onAddSpecialNode = useCallback(
    (type: string) => {
      const offset = nodes.length * 30;
      const position = { x: 100 + offset, y: 100 + offset };
      
      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: {},
      };
      
      setNodes((nds) => nds.concat(newNode));
    },
    [nodes.length, setNodes]
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

  const loadTemplate = (template: TeamTemplate) => {
    const apiKey = '';
    const baseUrl = localStorage.getItem('mimi-openai-base-url') || 'https://api.openai.com/v1';
    const model = localStorage.getItem('mimi-openai-model') || 'gpt-4o';
    const populatedNodes = template.nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        baseUrl: (n.data.baseUrl as string) || baseUrl,
        model: (n.data.model as string) || model,
        apiKey: (n.data.apiKey as string) || apiKey,
      }
    }));
    setNodes(populatedNodes);
    setEdges([...template.edges]);
    setTemplateDropdownOpen(false);
    if ((window as any).showToast) (window as any).showToast(`已加载模板「${template.name}」`, 'success');
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

      (window as any).showToast('编译成功！正在自动跳转并启动多智能体团队任务...', 'success');
      
      // EXPLICITLY save to local storage immediately, bypassing any React useEffect batching delays
      localStorage.setItem('mimi-team-flow-nodes', JSON.stringify(nodes));
      localStorage.setItem('mimi-team-flow-edges', JSON.stringify(edges));
      window.dispatchEvent(new CustomEvent('mimi-graph-updated'));
      
      // Auto-navigate and emit event to trigger start
      if (onNavigateToTeam) {
        onNavigateToTeam();
      }
      localStorage.setItem('mimi-team-auto-run-input', globalGoal || '根据已配置好的子智能体结构和角色，自行规划并执行当前所需完成的任务。');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mimi-team-run-auto'));
      }, 500);
      
    } catch (err: any) {
      (window as any).showToast('编译失败: ' + err.message, 'error');
    }
  };

  const handleSaveTaskConfig = () => {
    if (editingNodeId) {
      setNodes((nds) => 
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                taskDescription: taskForm.taskDescription,
                expectedOutput: taskForm.expectedOutput,
                asyncExecution: taskForm.asyncExecution
              }
            };
          }
          return node;
        })
      );
      setEditingNodeId(null);
    }
  };

  const { fitView } = useReactFlow();

  React.useEffect(() => {
    const el = reactFlowWrapper.current;
    if (!el) return;

    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && lastWidth === 0) {
          setTimeout(() => {
            fitView({ padding: 0.15, duration: 450 });
          }, 50);
        }
        lastWidth = entry.contentRect.width;
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [fitView]);

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    const layoutedNodes = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    
    // Automatically fit view after coordinates are updated
    setTimeout(() => {
      fitView({ padding: 0.15, duration: 450 });
    }, 100);
  }, [nodes, edges, setNodes, fitView]);

  const handleAiPlan = async () => {
    if (!globalGoal.trim()) {
      if ((window as any).showToast) {
        (window as any).showToast('请输入全局目标！', 'error');
      } else {
        alert('请输入全局目标！');
      }
      return;
    }
    
    setIsPlanning(true);
    
    try {
      const apiKey = await invoke('get_credential', { service: 'openai', username: 'default' }).catch(() => null) as string | null;
      let baseUrl = localStorage.getItem('mimi-openai-base-url') || 'https://api.openai.com/v1';
      const model = localStorage.getItem('mimi-openai-model') || 'gpt-4o';
      
      let url = baseUrl.endsWith('/chat/completions') ? baseUrl : (baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`);

      const graphTopology = nodes.map(n => ({
        id: n.id,
        role: n.data.role,
        name: n.data.label,
        dependencies: edges.filter(e => e.target === n.id).map(e => {
            const sourceNode = nodes.find(sn => sn.id === e.source);
            return sourceNode ? sourceNode.data.label : e.source;
        })
      }));

      const systemPrompt = `You are an expert multi-agent workflow architect. The user wants to accomplish this overall goal: "${globalGoal}". 
Here is the topology of the agents (roles):
${JSON.stringify(graphTopology, null, 2)}
Your task is to define the specific 'taskDescription' and 'expectedOutput' for EACH node so they work together seamlessly to achieve the overall goal. The taskDescription should be actionable. The expectedOutput should be clear about what format the next node needs.
Respond ONLY with a valid JSON object in this exact format:
{
  "tasks": [
    {
      "nodeId": "id-of-the-node",
      "taskDescription": "...",
      "expectedOutput": "..."
    }
  ]
}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: systemPrompt }],
          response_format: { type: "json_object" }
        })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) throw new Error('No content from LLM');
      
      const parsed = JSON.parse(content);
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        setNodes(nds => nds.map(n => {
          const matchedTask = parsed.tasks.find((t: any) => t.nodeId === n.id);
          if (matchedTask) {
            return {
              ...n,
              data: {
                ...n.data,
                taskDescription: matchedTask.taskDescription,
                expectedOutput: matchedTask.expectedOutput
              }
            };
          }
          return n;
        }));
        if ((window as any).showToast) (window as any).showToast('AI 任务分配成功！', 'success');
        setAiPlanModalOpen(false);
      } else {
         throw new Error('Invalid JSON format returned from LLM');
      }

    } catch (err: any) {
      console.error(err);
      if ((window as any).showToast) (window as any).showToast('AI 规划失败: ' + err.message, 'error');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleGenerateWorkflowFromDocs = async () => {
    setIsDocScanning(true);
    
    try {
      // 1. Scan for docs
      const filesOutput = await invoke<string>('run_shell_command', { 
        command: 'powershell -Command "Get-ChildItem -Path . -Recurse -Include *.md,*.txt -File | Select-Object -ExpandProperty FullName"', 
        cwd: projectPath 
      });
      
      const filePaths = filesOutput.split('\n').map(p => p.trim()).filter(p => p.length > 0);
      if (filePaths.length === 0) {
        throw new Error('未在项目目录下找到任何 .md 或 .txt 文档。请先编写需求文档！');
      }

      // 2. Read contents
      let combinedContent = '';
      for (const path of filePaths) {
        try {
           const content = await invoke<string | null>('read_file_content', { path });
           if (content) {
             combinedContent += `\n\n--- Document: ${path} ---\n${content}`;
           }
        } catch (e) {
           console.error("Failed to read", path, e);
        }
      }
      
      // Limit to ~20000 chars to avoid token limits
      if (combinedContent.length > 20000) {
        combinedContent = combinedContent.substring(0, 20000) + '\n\n[Content truncated...]';
      }

      // 3. LLM Request
      const apiKey = await invoke('get_credential', { service: 'openai', username: 'default' }).catch(() => null) as string | null;
      let baseUrl = localStorage.getItem('mimi-openai-base-url') || 'https://api.openai.com/v1';
      const model = localStorage.getItem('mimi-openai-model') || 'gpt-4o';
      
      let url = baseUrl.endsWith('/chat/completions') ? baseUrl : (baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`);

      const systemPrompt = `You are a Chief Technology Officer (CTO) expert in Multi-Agent Systems. The user has provided documentation for their project. Your task is to design a complete team of AI agents (roles) and their workflow (dependencies) to accomplish the goals described in the documentation.
      
PROJECT DOCUMENTATION:
${combinedContent}

Based on the above, please define:
1. 'agents': An array of agents. Each agent should have an 'id' (a unique string like "agent_1"), 'role' (e.g., "Architect", "Frontend Developer", "QA Engineer"), 'name' (e.g., "Alice", "Bob"), 'taskDescription' (specific instruction for this agent), and 'expectedOutput' (what they produce).
2. 'dependencies': An array of links where one agent depends on the output of another. Each link has a 'source' (id of upstream agent) and 'target' (id of downstream agent).

Respond ONLY with a valid JSON object in this exact format:
{
  "agents": [
    { "id": "agent_1", "role": "Architect", "name": "Alice", "taskDescription": "...", "expectedOutput": "..." }
  ],
  "dependencies": [
    { "source": "agent_1", "target": "agent_2" }
  ]
}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: systemPrompt }],
          response_format: { type: "json_object" }
        })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) throw new Error('No content from LLM');
      
      const parsed = JSON.parse(content);
      
      if (parsed.agents && Array.isArray(parsed.agents)) {
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        
        // Default agent config templates
        const iconMap: Record<string, string> = {
          'architect': 'Settings',
          'developer': 'GitBranch',
          'engineer': 'GitBranch',
          'qa': 'CheckSquare',
          'manager': 'Users',
          'designer': 'Activity'
        };

        const getIconForRole = (role: string) => {
           const r = role.toLowerCase();
           for (const key in iconMap) {
             if (r.includes(key)) return iconMap[key];
           }
           return 'MessageSquare'; // default
        };

        // Layout algorithm: staggered diagonal
        parsed.agents.forEach((agent: any, index: number) => {
           newNodes.push({
             id: agent.id,
             type: 'agentNode',
             position: { x: 100 + index * 250, y: 100 + index * 100 },
             data: {
               label: agent.name || 'Agent',
               role: agent.role || 'Assistant',
               icon: getIconForRole(agent.role || ''),
               baseUrl: baseUrl.replace('/chat/completions', ''),
               model: model,
               apiKey: apiKey || '',
               taskDescription: agent.taskDescription || '',
               expectedOutput: agent.expectedOutput || ''
             }
           });
        });

        if (parsed.dependencies && Array.isArray(parsed.dependencies)) {
           parsed.dependencies.forEach((dep: any) => {
              newEdges.push({
                 id: `edge_${dep.source}_${dep.target}`,
                 source: dep.source,
                 target: dep.target,
                 sourceHandle: 'source-output',
                 targetHandle: 'target-input',
                 type: 'default', // ReactFlow 'default' is a smooth bezier curve
                 animated: true,
                 style: { stroke: '#A0AEC0', strokeWidth: 3 } // Neutral grey for Blender style
              });
           });
        }
        
        setNodes(newNodes);
        setEdges(newEdges);
        
        if ((window as any).showToast) (window as any).showToast('AI 自动工作流建图成功！', 'success');
      } else {
         throw new Error('Invalid JSON format returned from LLM');
      }
    } catch (err: any) {
      console.error(err);
      if ((window as any).showToast) (window as any).showToast('AI 工作流建图失败: ' + err.message, 'error');
    } finally {
      setIsDocScanning(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', position: 'relative' }}>
      {/* Modal for Task Configuration */}
      {editingNodeId && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', width: '500px', maxWidth: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>智能体任务配置</h2>
              <button onClick={() => setEditingNodeId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                <Icons.X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '60vh' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  具体指令 (Task Description)
                </label>
                <textarea
                  value={taskForm.taskDescription}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, taskDescription: e.target.value }))}
                  placeholder="例如：读取需求文档，输出一个前端架构方案..."
                  style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  预期输出 (Expected Output)
                </label>
                <textarea
                  value={taskForm.expectedOutput}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, expectedOutput: e.target.value }))}
                  placeholder="例如：一份结构清晰的 Markdown 格式文档，包含 API 列表。"
                  style={{ width: '100%', height: '80px', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input 
                  type="checkbox" 
                  id="asyncExecutionToggle"
                  checked={taskForm.asyncExecution}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, asyncExecution: e.target.checked }))}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="asyncExecutionToggle" style={{ fontSize: '14px', fontWeight: 500, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  开启异步执行 (Async Execution)
                  <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 'normal' }}>此节点将非阻塞并行执行。</span>
                </label>
              </div>
            </div>
            <div style={{ padding: '16px 20px', backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setEditingNodeId(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500 }}
              >取消</button>
              <button 
                onClick={handleSaveTaskConfig}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#3B82F6', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
              >保存配置</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for AI Auto Plan */}
      {aiPlanModalOpen && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', width: '400px', maxWidth: '90%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🤖</span>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>AI 一键规划任务</h2>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                请用一句话描述您希望这个多智能体团队完成的**总目标**。AI CTO 将自动分析画布上的拓扑结构，为每个节点精准分配具体指令和预期输出格式。
              </p>
              <textarea
                value={globalGoal}
                onChange={(e) => setGlobalGoal(e.target.value)}
                placeholder="例如：开发一个带登录功能的 React 待办事项应用"
                style={{ width: '100%', height: '80px', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box' }}
                disabled={isPlanning}
              />
            </div>
            <div style={{ padding: '16px 20px', backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setAiPlanModalOpen(false)}
                disabled={isPlanning}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500, opacity: isPlanning ? 0.5 : 1 }}
              >取消</button>
              <button 
                onClick={handleAiPlan}
                disabled={isPlanning}
                style={{ 
                  padding: '8px 16px', borderRadius: '6px', border: 'none', 
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 
                  color: '#fff', cursor: isPlanning ? 'not-allowed' : 'pointer', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '8px', opacity: isPlanning ? 0.8 : 1
                }}
              >
                {isPlanning ? (
                  <>
                    <Icons.Activity style={{ width: '16px', height: '16px', animation: 'spin 2s linear infinite' }} /> 规划中...
                  </>
                ) : '✨ 开始规划'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar for Available Agents */}
      <div style={{ 
        width: '240px', 
        backgroundColor: 'var(--bg-sidebar)', 
        borderRight: '1px solid var(--border-color)', 
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', margin: '0 0 12px 0' }}>内置协作模板</h2>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
                color: 'var(--color-text-main)', cursor: 'pointer',
                fontWeight: 600, fontSize: '13px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icons.Layout style={{ width: '14px', height: '14px', color: '#8B5CF6' }} />
                选择预设模板
              </span>
              <Icons.ChevronDown style={{ width: '14px', height: '14px', color: '#8B5CF6', transform: templateDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {templateDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
                marginTop: '4px', borderRadius: '10px',
                backgroundColor: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
                overflow: 'hidden'
              }}>
                {TEAM_TEMPLATES.map(tpl => (
                  <div
                    key={tpl.id}
                    onClick={() => loadTemplate(tpl)}
                    style={{
                      padding: '12px 14px', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{tpl.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{tpl.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tpl.description}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#8B5CF6', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {tpl.nodes.length} 节点
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 12px 0' }}>流程节点 (Nodes)</h2>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button onClick={() => onAddSpecialNode('inputNode')} style={{ flex: 1, padding: '8px', background: '#DD6B20', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>+ Input</button>
            <button onClick={() => onAddSpecialNode('toolNode')} style={{ flex: 1, padding: '8px', background: '#3182CE', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>+ Tool</button>
            <button onClick={() => onAddSpecialNode('routerNode')} style={{ flex: 1, padding: '8px', background: '#805AD5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>+ Router</button>
          </div>

          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 12px 0' }}>可用智能体</h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingBottom: '20px' }}>
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
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={handleGenerateWorkflowFromDocs}
            disabled={isDocScanning}
            style={{
              width: '100%', padding: '10px', borderRadius: '6px', 
              border: '1px solid #FBCFE8', backgroundColor: '#FFFFFF',
              color: '#EC4899', cursor: isDocScanning ? 'not-allowed' : 'pointer', 
              fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s', opacity: isDocScanning ? 0.7 : 1,
              boxShadow: '0 1px 2px rgba(236, 72, 153, 0.05)'
            }}
            onMouseEnter={(e) => { 
              if (!isDocScanning) {
                e.currentTarget.style.backgroundColor = '#FDF2F8';
                e.currentTarget.style.borderColor = '#F9A8D4';
              }
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#FBCFE8';
            }}
          >
            {isDocScanning ? (
              <><Icons.Activity style={{ width: '14px', height: '14px', animation: 'spin 2s linear infinite' }} /> 正在解析...</>
            ) : (
              <><Icons.FileText style={{ width: '14px', height: '14px' }} /> 依据文档生成工作流</>
            )}
          </button>
          
          <button 
            onClick={() => setAiPlanModalOpen(true)}
            style={{
              width: '100%', padding: '10px', borderRadius: '6px', 
              border: '1px solid #DDD6FE', backgroundColor: '#FFFFFF',
              color: '#8B5CF6', cursor: 'pointer', 
              fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(139, 92, 246, 0.05)'
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.backgroundColor = '#F5F3FF';
              e.currentTarget.style.borderColor = '#C4B5FD';
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#DDD6FE';
            }}
          >
            <span style={{ fontSize: '14px', lineHeight: 1 }}>🤖</span> AI 一键规划任务
          </button>

          <button 
            onClick={handleAutoLayout}
            style={{
              width: '100%', padding: '10px', borderRadius: '6px', 
              border: '1px solid #E0F2FE', backgroundColor: '#FFFFFF',
              color: '#0284C7', cursor: 'pointer', 
              fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(2, 132, 199, 0.05)'
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.backgroundColor = '#F0F9FF';
              e.currentTarget.style.borderColor = '#7DD3FC';
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E0F2FE';
            }}
          >
            <Icons.Sparkles style={{ width: '14px', height: '14px', color: '#0284C7' }} /> 一键美化排版
          </button>
          
          <button 
            onClick={clearCanvas}
            style={{
              width: '100%', padding: '10px', borderRadius: '6px', 
              border: '1px solid #FECACA', backgroundColor: '#FFFFFF',
              color: '#EF4444', cursor: 'pointer', 
              fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(239, 68, 68, 0.05)'
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.backgroundColor = '#FEF2F2';
              e.currentTarget.style.borderColor = '#FCA5A5';
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#FECACA';
            }}
          >
            <Icons.Trash2 style={{ width: '14px', height: '14px' }} />
            清空画板
          </button>

          <button 
            onClick={compileAndRun}
            style={{
              width: '100%', padding: '10px', borderRadius: '6px', 
              border: '1px solid #BFDBFE', backgroundColor: '#FFFFFF',
              color: '#3B82F6', cursor: 'pointer', 
              fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(59, 130, 246, 0.05)'
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.backgroundColor = '#EFF6FF';
              e.currentTarget.style.borderColor = '#93C5FD';
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#BFDBFE';
            }}
          >
            <Icons.Play style={{ width: '14px', height: '14px' }} />
            编译并运行团队
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ 
        flex: 1, 
        height: '100%', 
        background: '#1A1A1A', // Dark Blender background
        position: 'relative'
      }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges.map(e => {
            return {
              ...e,
              // Fallback default edges to bezier curves for standard Blender feeling
              type: e.type || 'default' 
            };
          })}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={(params) => setEdges((eds) => addEdge({ ...params, type: 'default', sourceHandle: params.sourceHandle || 'source-output', targetHandle: params.targetHandle || 'target-input' }, eds))}
          isValidConnection={(connection) => connection.source !== connection.target}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.05}
          maxZoom={2}
          colorMode="dark"
        >
          <Controls style={{ backgroundColor: 'rgba(40, 40, 40, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }} />
          {/* Major Grid Lines */}
          <Background id="bg-major" variant={"lines" as any} gap={120} size={2} color="rgba(255, 255, 255, 0.05)" />
          {/* Minor Grid Lines */}
          <Background id="bg-minor" variant={"lines" as any} gap={24} size={1} color="rgba(255, 255, 255, 0.02)" />
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
