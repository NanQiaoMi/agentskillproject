import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Icons } from '../components/Icons';
import ReactMarkdown from 'react-markdown';
import { Highlight, themes } from 'prism-react-renderer';
import { TeamWorkflowGraph } from '../components/TeamWorkflowGraph';
import { ArtifactViewer, Artifact } from '../components/ArtifactViewer';

class ErrorBoundary extends React.Component<{children: React.ReactNode, fallback: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode, fallback: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("TeamView Rendering Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface TeamViewProps {
  projectPath: string;
}

import { AgentEvent, TeamSession, Task } from '../types';

export const TeamView: React.FC<TeamViewProps> = ({ projectPath }) => {
  const [agentFlowTasks, setAgentFlowTasks] = useState<Task[]>([]);
  const agentFlowTasksRef = useRef<Task[]>([]);
  
  useEffect(() => {
    agentFlowTasksRef.current = agentFlowTasks;
  }, [agentFlowTasks]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [traceFilter, setTraceFilter] = useState<'key' | 'all'>('key');
  const [teamSessions, setTeamSessions] = useState<TeamSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [permissions, setPermissions] = useState({ executeCommand: 'ask', writeFile: 'ask', useGitSandbox: false });
  const [pendingApproval, setPendingApproval] = useState<{ agent: string, message: string } | null>(null);
  const [interceptionInput, setInterceptionInput] = useState('');
  const [isSandboxActionLoading, setIsSandboxActionLoading] = useState(false);
  const [sandboxActionCompleted, setSandboxActionCompleted] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [costMetrics, setCostMetrics] = useState({ totalTokens: 0, promptTokens: 0, completionTokens: 0, cost: 0 });
  const [activeArtifacts, setActiveArtifacts] = useState<Artifact[]>([]);
  const [taskBoardTasks, setTaskBoardTasks] = useState<{title: string, assigned: string}[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('mimi-team-sessions');
    if (saved) {
      try {
        setTeamSessions(JSON.parse(saved));
      } catch(e){}
    }
    const permsRaw = localStorage.getItem('mimi-team-permissions');
    if (permsRaw) {
      try {
        setPermissions(JSON.parse(permsRaw));
      } catch(e){}
    }
  }, []);

  const fetchTasks = () => {
    if (projectPath) {
      invoke('run_agentflow_cmd', { projectPath, args: ['json-list'] })
        .then((res: unknown) => {
          try {
            const parsed = JSON.parse(res as string);
            setAgentFlowTasks(Array.isArray(parsed) ? parsed : []);
          } catch(e) {
            console.error("Failed to parse agentflow tasks", e);
          }
        })
        .catch(console.error);
    }
  };

  // Fetch AgentFlow Tasks initially
  useEffect(() => {
    fetchTasks();
  }, [projectPath]);


  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [events]);

  useEffect(() => {
    if (activeSessionId && events.length > 0) {
      setTeamSessions(prev => {
        const idx = prev.findIndex(s => s.id === activeSessionId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], events, updatedAt: new Date().toISOString() };
          localStorage.setItem('mimi-team-sessions', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  }, [events, activeSessionId]);

  useEffect(() => {
    const unlisten = listen<string>('agent-event', (e) => {
      try {
        const parsed = JSON.parse(e.payload) as any;
        
        if (parsed.type === 'cost_tracking') {
          setCostMetrics(prev => ({
            totalTokens: prev.totalTokens + (parsed.total_tokens || 0),
            promptTokens: prev.promptTokens + (parsed.prompt_tokens || 0),
            completionTokens: prev.completionTokens + (parsed.completion_tokens || 0),
            cost: prev.cost + (parsed.total_cost || parsed.cost || 0),
          }));
          return;
        }

        if (parsed.type === 'artifact' || parsed.event === 'artifact') {
          try {
            const artifactData = parsed.type === 'artifact' ? parsed : (typeof parsed.message === 'string' ? JSON.parse(parsed.message) : parsed.message);
            if (artifactData && artifactData.name) {
               setActiveArtifacts(prev => {
                 const updated = [...prev];
                 const idx = updated.findIndex(a => a.name === artifactData.name);
                 if (idx >= 0) updated[idx] = { name: artifactData.name, content: artifactData.content };
                 else updated.push({ name: artifactData.name, content: artifactData.content });
                 return updated;
               });
            }
          } catch(e) {
             console.error("Failed to parse artifact data:", e);
          }
          return;
        }

        if (parsed.event === 'task_posted') {
          try {
            const taskData = typeof parsed.message === 'string' ? JSON.parse(parsed.message) : parsed.message;
            setTaskBoardTasks(prev => [...prev, taskData]);
          } catch(e) { console.error('Failed to parse task_posted', e); }
          return;
        }

        // Ignore standalone agent events to prevent graph and chat pollution
        if (!parsed.is_team && parsed.event !== 'system' && parsed.agent !== 'System') {
          return;
        }
        setEvents(prev => {
          if (parsed.event === 'system' || parsed.agent === 'System') {
            const last = prev[prev.length - 1];
            if (last && last.event === parsed.event && last.agent === parsed.agent) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                message: last.message + '\n' + (parsed.message || '')
              };
              return updated;
            }
          }
          return [...prev, parsed];
        });
        if (parsed.event === 'success' || parsed.event === 'error') {
          setIsRunning(false);
        }
        if (parsed.event === 'ask_human') {
          setPendingApproval({ agent: parsed.agent, message: parsed.message || '需要确认以继续。' });
          setInterceptionInput('');
        }
      } catch (err) {
        // Fallback for non-JSON logs
        // Strip ANSI color codes
        const cleanMessage = e.payload.replace(/\x1B\[[0-9;]*[mK]/g, '').trim();
        if (cleanMessage) {
          setEvents(prev => {
            const last = prev[prev.length - 1];
            if (last && last.event === 'system' && last.agent === 'System') {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                message: last.message + '\n' + cleanMessage
              };
              return updated;
            }
            return [...prev, { event: 'system', agent: 'System', message: cleanMessage }];
          });
        }
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  useEffect(() => {
    const savedInput = localStorage.getItem('mimi-team-auto-run-input');
    if (savedInput) {
      localStorage.removeItem('mimi-team-auto-run-input');
      setTaskInput(savedInput);
      setTimeout(() => {
        handleStartTask(savedInput);
      }, 300);
    }

    const handleAutoRun = () => {
      const input = localStorage.getItem('mimi-team-auto-run-input');
      if (input) {
        localStorage.removeItem('mimi-team-auto-run-input');
        // Check if the input is actually a Task ID
        const taskMatch = agentFlowTasksRef.current.find(t => t.id === input);
        if (taskMatch) {
          setSelectedTaskId(taskMatch.id);
          setTaskInput(taskMatch.description || taskMatch.title || '');
          handleStartTask(taskMatch.description || taskMatch.title || '', taskMatch.id);
        } else {
          setTaskInput(input);
          handleStartTask(input);
        }
      }
    };
    window.addEventListener('mimi-team-run-auto', handleAutoRun);
    return () => window.removeEventListener('mimi-team-run-auto', handleAutoRun);
  }, []); // Remove projectPath dependency so it only runs on mount and stable listener

  const handleStopTask = async () => {
    try {
      await invoke('stop_native_team_task');
      setIsRunning(false);
      setIsInitializing(false);
      setEvents(prev => [...prev, { event: 'error', agent: 'System', message: '任务已被用户强制中断。' }]);
    } catch (err: any) {
      console.error("Failed to stop task", err);
      setIsRunning(false);
      setIsInitializing(false);
      setEvents(prev => [...prev, { event: 'error', agent: 'System', message: '中断任务: ' + err }]);
    }
  };

  const handleStartTask = async (overrideInput?: string | React.MouseEvent, overrideTaskId?: string | null) => {
    setSandboxActionCompleted(false);
    if (!projectPath) {
      alert('请先选择项目目录');
      return;
    }
    const targetTaskId = overrideTaskId !== undefined ? overrideTaskId : selectedTaskId;
    
    const inputToUse = (typeof overrideInput === 'string' ? overrideInput : taskInput) || '';
    
    // If a task is selected, we combine title and description for the prompt if it's not overridden
    let fullInputContext = inputToUse;
    if (targetTaskId && !overrideInput) {
       const taskObj = agentFlowTasksRef.current.find(t => t.id === targetTaskId);
       if (taskObj) {
          fullInputContext = `Task: ${taskObj.title}\n\nDescription:\n${taskObj.description || inputToUse}`;
       }
    }
    
    if (!fullInputContext.trim()) return;

    setIsRunning(true);
    setEvents([]);
    setActiveArtifacts([]);
    setTaskBoardTasks([]);
    setCostMetrics({ totalTokens: 0, promptTokens: 0, completionTokens: 0, cost: 0 });

    try {
      setIsInitializing(true);
      const newSessionId = targetTaskId || Date.now().toString();
      setActiveSessionId(newSessionId);
      
      // Integrate with AgentFlow state: auto-start the task in the database
      const permsRaw = localStorage.getItem('mimi-team-permissions');
      const perms = permsRaw ? JSON.parse(permsRaw) : { executeCommand: 'ask', writeFile: 'ask', useGitSandbox: false };
      
      if (targetTaskId) {
         try {
             const args = ['start', targetTaskId];
             if (perms.useGitSandbox) args.push('--no-checkout');
             await invoke('run_agentflow_cmd', { projectPath, args });
         } catch(e) {
             console.error("Failed to start agentflow task state:", e);
         }
      }
      
      const initialEvents: AgentEvent[] = [
        { event: 'user_input', agent: 'User', message: fullInputContext },
        { event: 'system', agent: 'System', message: '正在初始化原生多智能体环境 (LangGraph)...' }
      ];
      setEvents(initialEvents);

      const newSession: TeamSession = {
        id: newSessionId,
        title: targetTaskId ? `[${targetTaskId}] ${inputToUse.substring(0, 30) || 'Task'}` : (inputToUse.substring(0, 50) || 'New Task'),
        events: initialEvents,
        updatedAt: new Date().toISOString()
      };
      
      setTeamSessions(prev => {
        const updated = [newSession, ...prev];
        localStorage.setItem('mimi-team-sessions', JSON.stringify(updated));
        return updated;
      });

      await invoke('init_native_agentflow', { projectPath });
      
      // Crucial Fix: Compile the actual Visual Graph to overwrite the default template
      const savedNodes = localStorage.getItem('mimi-team-flow-nodes');
      const savedEdges = localStorage.getItem('mimi-team-flow-edges');
      if (savedNodes) {
          const parsedNodes = JSON.parse(savedNodes);
          const parsedEdges = savedEdges ? JSON.parse(savedEdges) : [];
          if (parsedNodes.length > 0) {
              const { compileGraphToLangGraph } = await import('../utils/agentCompiler');
              const permsRaw = localStorage.getItem('mimi-team-permissions');
              const perms = permsRaw ? JSON.parse(permsRaw) : { executeCommand: 'ask', writeFile: 'ask', useGitSandbox: false };
              const pythonCode = compileGraphToLangGraph(parsedNodes, parsedEdges, perms);
              const targetPath = `${projectPath}/.agentflow/native/agentflow_native.py`;
              await invoke('write_file_content', {
                 path: targetPath,
                 content: pythonCode 
              });
          }
      }
      setIsInitializing(false);

      setEvents(prev => [...prev, { event: 'system', agent: 'System', message: '环境就绪，启动图谱编排任务...' }]);
      
      // Try all configured providers for API key
      let apiKey: string | null = null;
      const providers = ['openai', 'deepseek', 'lyclaude', 'anthropic'];
      for (const provider of providers) {
        try {
          const key = await invoke<string>('get_credential', { service: provider, username: 'default' });
          if (key && key.trim()) {
            apiKey = key;
            break;
          }
        } catch {}
      }
      
      let hasSubagentKeys = false;
      try {
        const saved = localStorage.getItem('mimi-subagent-configs');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.some(c => c.apiKey && c.apiKey.trim())) {
            hasSubagentKeys = true;
          }
        }
      } catch {}
      
      const baseUrl = localStorage.getItem('mimi-openai-base-url') || undefined;
      const model = localStorage.getItem('mimi-openai-model') || undefined;
      
      if (!apiKey && !hasSubagentKeys) {
        setEvents(prev => [...prev, { event: 'error', agent: 'System', message: '未找到任何已配置的 API Key。请前往「设置」页面配置全球 API Key 或在「子智能体接口」中配置对应岗位的密钥。' }]);
        setIsRunning(false);
        return;
      }
      
      setEvents(prev => [...prev, { event: 'system', agent: 'System', message: `环境配置完毕，已注入子智能体 API 接口。如果子节点未指定模型，将回退使用全局默认配置。` }]);
      setTaskInput('');
      setInterceptionInput('');

      // Add worktree isolation logic if enabled
      let worktreePath = projectPath;
      if (perms.useGitSandbox) {
         try {
            await invoke('manage_git_worktree', { projectPath, op: 'add', taskId: newSessionId });
            setEvents(prev => [...prev, { event: 'system', agent: 'System', message: `✅ Git Sandbox created: feature/${newSessionId}` }]);
            
            // Adjust the worktree path (assuming it resolves to projectPath/../mimicode_worktrees/NEW_SESSION_ID)
            const parentDir = projectPath.substring(0, projectPath.lastIndexOf('/')) || projectPath.substring(0, projectPath.lastIndexOf('\\'));
            worktreePath = `${parentDir}/mimicode_worktrees/${newSessionId.toUpperCase()}`;
         } catch (e: any) {
            setEvents(prev => [...prev, { event: 'error', agent: 'System', message: `Failed to create Git Sandbox: ${e}` }]);
         }
      }
      
      await invoke('start_native_team_task', { 
        projectPath, 
        workingDir: worktreePath,
        taskDescription: fullInputContext,
        openaiApiKey: apiKey || '',
        openaiBaseUrl: baseUrl,
        openaiModel: model
      });
      
      setTaskInput('');
    } catch (err: any) {
      setIsRunning(false);
      setIsInitializing(false);
      setEvents(prev => [...prev, { event: 'error', agent: 'System', message: '中断任务: ' + err }]);
    }
  };

  const chatEvents = events.filter(ev => ev.event === 'user_input' || ev.event === 'agent_finished' || ev.event === 'success' || ev.event === 'agent_action' || ev.event === 'agent_started' || ev.event.startsWith('subagent_'));
  const traceEvents = events.filter(ev => ev.event !== 'user_input');
  
  const hasUnfinishedTrace = events.length > 0 && !['success', 'error'].includes(events[events.length - 1].event);
  const isEffectivelyRunning = isRunning || hasUnfinishedTrace;

  const cleanAgentMessage = (msg: string | undefined, isChatView: boolean = false): string | null => {
    if (!msg) return null;
    let cleaned = msg;
    
    if (isChatView) {
      if (cleaned === "Started thinking...") {
        return "> 🧠 *正在思考与分析中...*";
      }

      // If the message contains CrewAI/ReAct intermediate steps, extract only the Final Answer
      if (cleaned.match(/Thought:|Action:|Action Input:/i)) {
        const match = cleaned.match(/Final Answer:([\s\S]*)/i);
        if (match) {
          cleaned = match[1].trim();
        } else {
          const actionMatch = cleaned.match(/Action:\s*([^\n]+)/i);
          if (actionMatch) {
            return `> 🛠️ *准备调用工具*: \`${actionMatch[1]}\` ...`;
          }
          return "> 🧠 *正在梳理逻辑与执行动作...*";
        }
      }
      
      // If it's a raw LLM observation string without Final Answer
      if (cleaned.startsWith('Observe:') || cleaned.startsWith('Observation:')) {
        return "> 👁️ *正在观察工具执行结果...*";
      }
      if (cleaned.startsWith('Using tool:')) {
        return `> 🛠️ *${cleaned}*`;
      }

      cleaned = cleaned.replace(/```[\s\S]*?```/g, '\n\n> 📦 **[代码片段已折叠]** 完整代码请在右侧 Trace 面板的“全部事件”中查看。\n\n');
      
      // If no backticks are present but the message is long and looks like raw JS/HTML code, wrap it so it gets highlighted
      if (!cleaned.includes('```') && cleaned.length > 150 && (cleaned.includes('function ') || cleaned.includes('const ') || cleaned.includes('import ') || cleaned.includes('document.'))) {
        cleaned = `> 📦 **[代码输出已折叠]** 包含大量原始代码，请在右侧面板查看。\n\n\`\`\`javascript\n${cleaned.substring(0, 300)}${cleaned.length > 300 ? '\n... (代码过长已省略)' : ''}\n\`\`\``;
      }
      
      if (!cleaned.trim()) return null;
      return cleaned.trim();
    }

    // Trace View logic: just strip headers but keep the content
    cleaned = cleaned
      .replace(/Thought:[\s\S]*?(?=Action:|Final Answer:|$)/gi, '')
      .replace(/Action:[\s\S]*?(?=Action Input:|Final Answer:|$)/gi, '')
      .replace(/Action Input:[\s\S]*?(?=Final Answer:|$)/gi, '')
      .replace(/Final Answer:/gi, '')
      .trim();

    return cleaned || '*思考中...*';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', padding: '20px', backgroundColor: '#F3F4F6', height: '100%', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Left Column: Workflow Graph */}
      <div style={{ flex: '0 0 28%', backgroundColor: '#FFFFFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icons.GitBranch style={{ width: '18px', height: '18px', color: '#111827' }} /> Workflow Graph
          </div>
          <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '1px', fontWeight: 700 }}>VISUAL</span>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <TeamWorkflowGraph events={events} />
        </div>
        
        {/* Cost Tracker Panel */}
        <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, letterSpacing: '0.5px' }}>TOTAL TOKENS</div>
            <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 700, marginTop: '2px' }}>{costMetrics.totalTokens.toLocaleString()}</div>
          </div>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#E2E8F0' }}></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, letterSpacing: '0.5px' }}>PROMPT</div>
            <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 700, marginTop: '2px' }}>{costMetrics.promptTokens.toLocaleString()}</div>
          </div>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#E2E8F0' }}></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, letterSpacing: '0.5px' }}>COMPLETION</div>
            <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 700, marginTop: '2px' }}>{costMetrics.completionTokens.toLocaleString()}</div>
          </div>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#E2E8F0' }}></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 600, letterSpacing: '0.5px' }}>EST. COST</div>
            <div style={{ fontSize: '16px', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>${costMetrics.cost.toFixed(4)}</div>
          </div>
        </div>
      </div>

      {/* Middle Column: Chat Timeline */}
      <div style={{ flex: '1 1 44%', backgroundColor: '#FFFFFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '6px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <Icons.Play style={{ width: '16px', height: '16px', color: '#10B981' }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: '15px' }}>运行</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>当前方案: 计划</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
            <span 
              style={{ fontSize: '13px', color: '#6B7280', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }} 
              onClick={() => setShowRiskModal(true)}
            >
              <Icons.Shield style={{ width: '14px', height: '14px' }} /> 沙盒与权限
            </span>
            <span 
              style={{ fontSize: '13px', color: showHistory ? '#3B82F6' : '#6B7280', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }} 
              onClick={() => setShowHistory(!showHistory)}
            >
              <Icons.Clock style={{ width: '14px', height: '14px' }} /> 历史记录
            </span>
            <span style={{ fontSize: '13px', color: '#6B7280', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setEvents([]); setActiveSessionId(null); }}>清空</span>
            <Icons.Copy style={{ width: '14px', height: '14px', color: '#6B7280', cursor: 'pointer' }} />
            
            {showHistory && (
              <div style={{
                position: 'absolute', top: '30px', right: '0', width: '300px', maxHeight: '400px', overflowY: 'auto',
                backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 100, padding: '8px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', padding: '8px 12px', marginBottom: '4px', borderBottom: '1px solid #F3F4F6' }}>运行记录 ({teamSessions.length})</div>
                {teamSessions.length === 0 && <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>暂无历史记录</div>}
                {teamSessions.map(session => (
                  <div 
                    key={session.id}
                    onClick={() => {
                      setEvents(session.events || []);
                      setActiveSessionId(session.id);
                      setShowHistory(false);
                    }}
                    style={{
                      padding: '12px', borderRadius: '8px', cursor: 'pointer',
                      backgroundColor: activeSessionId === session.id ? '#EFF6FF' : 'transparent',
                      border: activeSessionId === session.id ? '1px solid #BFDBFE' : '1px solid transparent',
                      marginBottom: '4px', transition: 'all 0.2s ease',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                    }}
                    onMouseEnter={(e) => { if(activeSessionId !== session.id) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                    onMouseLeave={(e) => { if(activeSessionId !== session.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.title}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{new Date(session.updatedAt).toLocaleString()}</div>
                    </div>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSessions = teamSessions.filter(s => s.id !== session.id);
                        setTeamSessions(newSessions);
                        localStorage.setItem('mimi-team-sessions', JSON.stringify(newSessions));
                        if (activeSessionId === session.id) {
                          setEvents([]);
                          setActiveSessionId(null);
                        }
                      }}
                      style={{ padding: '4px', borderRadius: '4px', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                      title="删除记录"
                    >
                      <Icons.Trash2 style={{ width: '14px', height: '14px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div ref={timelineRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#FFFFFF' }}>
          {chatEvents.length === 0 && !isEffectivelyRunning && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#9CA3AF' }}>
              <Icons.MessageSquare style={{ width: '48px', height: '48px', marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ maxWidth: '400px', textAlign: 'center', fontSize: '13px', marginTop: '8px' }}>
                在这里与智能团队交互。他们会自动分工协作完成您的指令。
              </p>
            </div>
          )}

          {chatEvents.map((ev, i) => {
            if (ev.event.startsWith('subagent_')) {
              return (
                <div key={i} style={{ flexShrink: 0, display: 'flex', gap: '12px', animation: 'viewFadeIn 0.3s ease', paddingLeft: '48px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '24px', top: '0', bottom: '0', width: '2px', backgroundColor: '#E5E7EB' }}></div>
                  <div style={{ position: 'absolute', left: '21px', top: '16px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9CA3AF', border: '2px solid #FFFFFF' }}></div>
                  <div style={{ 
                    backgroundColor: '#F9FAFB', padding: '10px 14px', 
                    borderRadius: '8px', fontSize: '13px', lineHeight: '1.5',
                    border: '1px dashed #D1D5DB', color: '#4B5563', maxWidth: '85%',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <span style={{ fontWeight: 600, color: '#374151', marginRight: '6px' }}>
                      <Icons.Bot style={{ width: '12px', height: '12px', display: 'inline-block', verticalAlign: 'middle', marginRight: '4px', color: '#6B7280' }} />
                      {ev.agent} <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 'normal' }}>({ev.event.replace('subagent_', '')})</span>
                    </span>
                    <div style={{ marginTop: '4px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {ev.message}
                    </div>
                  </div>
                </div>
              );
            }

            let finalMarkdown = ev.event === 'user_input' ? ev.message : cleanAgentMessage(ev.message, true);
            if (!finalMarkdown) return null;

            let extractedRoute = null;
            if (ev.event !== 'user_input' && finalMarkdown) {
              const routeMatch = finalMarkdown.match(/<ROUTE>([\s\S]*?)<\/ROUTE>/i);
              if (routeMatch) {
                extractedRoute = routeMatch[1].trim();
                finalMarkdown = finalMarkdown.replace(/<ROUTE>[\s\S]*?<\/ROUTE>/gi, '');
              }
            }

            if (ev.agent === 'User') {
              return (
                <div key={i} style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', animation: 'viewFadeIn 0.3s ease' }}>
                  <div style={{ 
                    backgroundColor: '#111827', color: '#FFFFFF', padding: '16px 20px', 
                    borderRadius: '20px 20px 4px 20px', maxWidth: '80%', fontSize: '15px', lineHeight: '1.6',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}>
                    {ev.message}
                  </div>
                </div>
              );
            }

            return (
              <div key={i} style={{ flexShrink: 0, display: 'flex', gap: '16px', animation: 'viewFadeIn 0.3s ease', position: 'relative' }}>
                {/* External Agent Label (Screenshot 1 Style) */}
                <div style={{ position: 'absolute', right: '-120px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '1px', backgroundColor: '#E5E7EB' }}></div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '12px' }}>{ev.agent}</div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF' }}>Engineer</div>
                  </div>
                </div>

                <div className="chat-bubble-container" style={{ 
                  backgroundColor: '#FFFFFF', padding: '16px 20px', 
                  borderRadius: '20px 20px 20px 4px', maxWidth: '85%', fontSize: '14px', lineHeight: '1.6',
                  border: '1px solid #E5E7EB', color: '#374151',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden'
                }}>
                  {finalMarkdown && (
                    <ErrorBoundary fallback={<div style={{color: 'red'}}>Failed to render markdown.</div>}>
                      <ReactMarkdown
                        components={{
                          code(props) {
                            const {children, className, node, ...rest} = props;
                            const match = /language-(\w+)/.exec(className || '');
                            return match ? (
                              <Highlight theme={themes.vsDark} code={String(children).replace(/\n$/, '')} language={match[1]}>
                                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                                  <pre className={className} style={{...style, padding: '12px', borderRadius: '8px', fontSize: '13px', overflowX: 'auto', margin: '8px 0'}}>
                                    {tokens.map((line, i) => (
                                      <div key={i} {...getLineProps({ line })}>
                                        {line.map((token, key) => (
                                          <span key={key} {...getTokenProps({ token })} />
                                        ))}
                                      </div>
                                    ))}
                                  </pre>
                                )}
                              </Highlight>
                            ) : (
                              <code {...rest} className={className} style={{ background: '#F3F4F6', color: '#EF4444', padding: '2px 4px', borderRadius: '4px', fontSize: '13px' }}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {finalMarkdown}
                      </ReactMarkdown>
                    </ErrorBoundary>
                  )}
                  {extractedRoute && (
                    <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', color: '#1E3A8A', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🚀 Routing to: {extractedRoute}
                    </div>
                  )}
                  {ev.task && <div style={{ fontStyle: 'italic', color: '#6B7280', padding: '8px', background: '#F9FAFB', borderRadius: '8px', marginTop: '8px' }}>Task: {ev.task}</div>}
                  {ev.tool && <div style={{ marginTop: '8px' }}><kbd style={{ background: '#F3F4F6', color: '#111827', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '12px' }}>{ev.tool}</kbd> {ev.file && <span style={{color: '#6B7280', fontSize: '12px'}}>on {ev.file}</span>}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div style={{ padding: '20px', flexShrink: 0, backgroundColor: '#FFFFFF' }}>
          <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
             <select
                value={selectedTaskId || ''}
                onChange={(e) => setSelectedTaskId(e.target.value || null)}
                onFocus={fetchTasks}
                disabled={isRunning}
                style={{ 
                  padding: '6px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', 
                  backgroundColor: '#F9FAFB', fontSize: '13px', color: '#374151', cursor: isRunning ? 'not-allowed' : 'pointer',
                  outline: 'none', maxWidth: '300px'
                }}
             >
                <option value="">临时任务 (不追踪分支状态)</option>
                {agentFlowTasks.map(t => (
                   <option key={t.id} value={t.id}>{t.id}: {t.title}</option>
                ))}
             </select>
             {selectedTaskId && (
               <span style={{ fontSize: '12px', color: '#6B7280' }}>
                 选中任务后，自动生成并追踪 <b>feature/{selectedTaskId.toLowerCase()}</b> 分支。
               </span>
             )}
          </div>
          <div style={{ 
            display: 'flex', alignItems: 'center', backgroundColor: '#F3F4F6', 
            borderRadius: '24px', padding: '8px 8px 8px 20px', border: '1px solid #E5E7EB'
          }}>
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              disabled={isRunning}
              placeholder={isRunning ? "团队正在全速运转中..." : "输入测试问题..."}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#111827', fontSize: '15px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleStartTask();
                }
              }}
            />
            {isEffectivelyRunning ? (
              <button
                onClick={handleStopTask}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                  backgroundColor: '#EF4444',
                  color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background-color 0.2s ease',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                }}
                title="强制中断当前任务"
              >
                <Icons.Square style={{ width: '16px', height: '16px', fill: 'currentColor' }} />
              </button>
            ) : (
              <button
                onClick={() => { setSandboxActionCompleted(false); handleStartTask(); }}
                disabled={(!taskInput.trim() && !selectedTaskId) || isInitializing}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                  backgroundColor: (!taskInput.trim() && !selectedTaskId) ? '#D1D5DB' : '#111827',
                  color: 'white', cursor: (!taskInput.trim() && !selectedTaskId) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background-color 0.2s ease'
                }}
              >
                {isInitializing ? (
                  <Icons.RefreshCw style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Icons.Send style={{ width: '18px', height: '18px', marginLeft: '2px' }} />
                )}
              </button>
            )}
          </div>
          
          {!sandboxActionCompleted && !isRunning && permissions.useGitSandbox && activeSessionId && events.some(e => e.event === 'success' || e.event === 'error') && (
             <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                   <Icons.GitBranch style={{ width: '16px', height: '16px' }} />
                   沙盒分支 (feature/{activeSessionId}) 执行结束
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                   {activeSessionId.startsWith('TASK-') && (
                      <button 
                        onClick={async () => {
                           try {
                             await invoke('run_agentflow_cmd', { projectPath, args: ['submit', activeSessionId] });
                             setEvents(prev => [...prev, { event: 'system', agent: 'System', message: '已提交任务进行 Code Review！' }]);
                           } catch (e: any) {
                             setEvents(prev => [...prev, { event: 'error', agent: 'System', message: `提交失败: ${e}` }]);
                           }
                        }}
                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #E5E7EB', backgroundColor: '#FFF', color: '#374151', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFF'}
                      >发起 Code Review</button>
                   )}
                   <button 
                     onClick={async () => {
                        setIsSandboxActionLoading(true);
                        try {
                          await invoke('manage_git_worktree', { projectPath, op: 'merge', taskId: activeSessionId });
                          await invoke('manage_git_worktree', { projectPath, op: 'remove', taskId: activeSessionId });
                          let msg = '已成功将沙盒代码合并到当前分支，并清理了临时环境！';
                          if (activeSessionId.startsWith('TASK-')) {
                             await invoke('run_agentflow_cmd', { projectPath, args: ['review', activeSessionId, '--approve'] });
                             msg += ' 任务已标记为完成。';
                          }
                          setEvents(prev => [...prev, { event: 'system', agent: 'System', message: msg }]);
                          setSandboxActionCompleted(true);
                        } catch (e: any) {
                          setEvents(prev => [...prev, { event: 'error', agent: 'System', message: `合并失败: ${e}` }]);
                        } finally {
                          setIsSandboxActionLoading(false);
                        }
                     }}
                     disabled={isSandboxActionLoading}
                     style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #10B981', backgroundColor: '#10B981', color: '#FFF', cursor: isSandboxActionLoading ? 'not-allowed' : 'pointer', fontWeight: 600, transition: 'all 0.2s ease', opacity: isSandboxActionLoading ? 0.7 : 1 }}
                     onMouseEnter={(e) => { if(!isSandboxActionLoading) e.currentTarget.style.backgroundColor = '#059669' }}
                     onMouseLeave={(e) => { if(!isSandboxActionLoading) e.currentTarget.style.backgroundColor = '#10B981' }}
                   >
                     {isSandboxActionLoading ? <Icons.RefreshCw style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite', display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> : null}
                     合并代码并完成
                   </button>
                   <button 
                     onClick={async () => {
                        setIsSandboxActionLoading(true);
                        try {
                          await invoke('manage_git_worktree', { projectPath, op: 'remove', taskId: activeSessionId });
                          setEvents(prev => [...prev, { event: 'system', agent: 'System', message: '已彻底放弃修改并撤销了沙盒工作区，代码已恢复至原状。' }]);
                          setSandboxActionCompleted(true);
                        } catch (e: any) {
                          setEvents(prev => [...prev, { event: 'error', agent: 'System', message: `撤销失败: ${e}` }]);
                        } finally {
                          setIsSandboxActionLoading(false);
                        }
                     }}
                     disabled={isSandboxActionLoading}
                     style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #EF4444', backgroundColor: '#FFF', color: '#EF4444', cursor: isSandboxActionLoading ? 'not-allowed' : 'pointer', fontWeight: 600, transition: 'all 0.2s ease', opacity: isSandboxActionLoading ? 0.7 : 1 }}
                     onMouseEnter={(e) => { if(!isSandboxActionLoading) e.currentTarget.style.backgroundColor = '#FEE2E2' }}
                     onMouseLeave={(e) => { if(!isSandboxActionLoading) e.currentTarget.style.backgroundColor = '#FFF' }}
                   >
                     {isSandboxActionLoading ? <Icons.RefreshCw style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite', display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> : null}
                     放弃并撤销所有修改
                   </button>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Right Column Container: Artifact Viewer & Trace */}
      <div style={{ flex: '0 0 28%', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
        
        {/* Cost Tracker */}
        {(costMetrics.totalTokens > 0 || costMetrics.cost > 0) && (
          <div style={{ flex: '0 0 auto', backgroundColor: '#FFFFFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center' }}>
              <Icons.Activity style={{ width: '16px', height: '16px', marginRight: '8px', color: '#10B981' }} /> 资源消耗 (Cost Tracker)
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase' }}>Total Tokens</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{costMetrics.totalTokens.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase' }}>Total Cost</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#10B981' }}>${costMetrics.cost.toFixed(4)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase' }}>Prompt Tokens</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4B5563' }}>{costMetrics.promptTokens.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase' }}>Completion Tokens</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4B5563' }}>{costMetrics.completionTokens.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Task Board */}
        {taskBoardTasks.length > 0 && (
          <div style={{ flex: '0 0 auto', maxHeight: '30%', backgroundColor: '#FFFFFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #E5E7EB' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center' }}>
              <Icons.CheckSquare style={{ width: '16px', height: '16px', marginRight: '8px', color: '#3B82F6' }} /> Sub-Tasks
            </div>
            <div style={{ padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {taskBoardTasks.map((task, i) => (
                <div key={i} style={{ padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#F9FAFB', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontWeight: 600, fontSize: '12px', color: '#111827' }}>{task.title}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icons.Users style={{ width: '10px', height: '10px' }} /> {task.assigned}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Artifact Viewer (Top Half) */}
        {activeArtifacts.length > 0 && (
          <div style={{ flex: 1, backgroundColor: '#0D1117', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #30363D' }}>
            <ArtifactViewer artifacts={activeArtifacts} />
          </div>
        )}

        {/* System Trace Cards (Bottom Half or Full) */}
        <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#111827' }}>
            <Icons.Terminal style={{ width: '18px', height: '18px' }} /> Trace
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '16px' }}>
              <span 
                onClick={() => setTraceFilter('key')}
                style={{ cursor: 'pointer', fontSize: '12px', color: traceFilter === 'key' ? '#FFFFFF' : '#6B7280', fontWeight: 500, padding: '4px 12px', borderRadius: '12px', background: traceFilter === 'key' ? '#111827' : 'transparent', transition: 'all 0.2s ease' }}
              >仅关键</span>
              <span 
                onClick={() => setTraceFilter('all')}
                style={{ cursor: 'pointer', fontSize: '12px', color: traceFilter === 'all' ? '#111827' : '#6B7280', fontWeight: 500, padding: '4px 12px', borderRadius: '12px', background: traceFilter === 'all' ? '#FFFFFF' : 'transparent', transition: 'all 0.2s ease', boxShadow: traceFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
              >全部事件</span>
            </div>
            <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, padding: '4px 8px', background: '#DEF7EC', borderRadius: '12px' }}>{isEffectivelyRunning ? '运行中' : '回放中'}</span>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 24px 32px', backgroundColor: '#F9FAFB', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
          {/* Vertical Timeline Line */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '20px', width: '2px', backgroundColor: '#E5E7EB' }}></div>
          
          {traceEvents.length === 0 && (
            <div style={{ color: '#9CA3AF', fontSize: '12px', textAlign: 'center', marginTop: '20px', position: 'relative', zIndex: 1 }}>Waiting for system events...</div>
          )}
          
          {traceEvents.map((ev, i) => {
            let displayMessage = ev.message || '';
            if (traceFilter === 'key') {
              displayMessage = displayMessage.replace(/```[\s\S]*?```/g, '[代码块]').replace(/\\n/g, ' ').trim();
              if (displayMessage.length > 70) {
                displayMessage = displayMessage.substring(0, 70) + ' ...';
              }
            }

            let cardTitle = 'SYSTEM TRACE';
            let cardIcon = <Icons.Activity style={{ width: '16px', height: '16px' }} />;
            if (['agent_action', 'agent_started', 'agent_finished'].includes(ev.event)) {
              cardTitle = 'AGENT TRACE CARD';
              cardIcon = <Icons.Bot style={{ width: '16px', height: '16px' }} />;
            }

            let eventLabel = 'EXECUTION LOG';
            if (ev.event === 'error') eventLabel = 'ERROR ENCOUNTERED';
            else if (ev.event === 'agent_action') eventLabel = 'WORKER DELEGATED';
            else if (ev.event === 'success') eventLabel = 'EXECUTION SUCCESS';
            else if (ev.event === 'agent_finished') eventLabel = 'WORKER FINISHED';
            else if (ev.event === 'agent_started') eventLabel = 'WORKER STARTED';

            return (
              <div key={i} style={{ 
                flexShrink: 0,
                backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden',
                position: 'relative', marginLeft: '12px',
                animation: 'viewFadeIn 0.3s ease'
              }}>
                {/* Timeline Dot */}
                <div style={{ position: 'absolute', left: '-29px', top: '24px', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #3B82F6', backgroundColor: '#F9FAFB', zIndex: 2 }}></div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {cardIcon}
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827', letterSpacing: '0.5px' }}>
                        {ev.agent.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>{cardTitle}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#111827' }}>1 STEPS</div>
                </div>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: '#111827' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '2px solid #3B82F6' }}></div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{eventLabel}</span>
                        {ev.tool && <span style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>TARGET: {ev.tool}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF' }}>实时</div>
                  </div>
                  
                  
                  {displayMessage && (
                    <div style={{ 
                      backgroundColor: traceFilter === 'key' ? '#F9FAFB' : '#111827', 
                      color: traceFilter === 'key' ? '#6B7280' : '#F3F4F6', 
                      padding: traceFilter === 'key' ? '12px' : '16px', 
                      borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px', 
                      lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      boxShadow: traceFilter === 'key' ? 'none' : 'inset 0 2px 4px rgba(0,0,0,0.5)',
                      border: traceFilter === 'key' ? '1px solid #E5E7EB' : 'none',
                      marginTop: '8px'
                    }}>
                      {displayMessage}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

      {/* Interception Modal */}
      {pendingApproval && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#F59E0B' }}>
              <Icons.AlertTriangle style={{ width: '24px', height: '24px' }} />
              <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>权限请求: {pendingApproval.agent}</h3>
            </div>
            <div style={{ fontSize: '14px', color: '#4B5563', marginBottom: '20px', whiteSpace: 'pre-wrap', backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              {pendingApproval.message}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <input 
                type="text" 
                value={interceptionInput}
                onChange={e => setInterceptionInput(e.target.value)}
                placeholder="同意请直接点击允许，或在此输入修改意见、拒绝理由..." 
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => {
                  invoke('answer_native_team_task', { answer: interceptionInput.trim() || 'No' });
                  setPendingApproval(null);
                }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFF', color: '#374151', cursor: 'pointer', fontWeight: 500 }}
              >
                拒绝 / 提供意见
              </button>
              <button 
                onClick={() => {
                  invoke('answer_native_team_task', { answer: 'y' });
                  setPendingApproval(null);
                }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#FFF', cursor: 'pointer', fontWeight: 500 }}
              >
                允许执行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Control Settings Modal */}
      {showRiskModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '480px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <Icons.Shield style={{ width: '24px', height: '24px', color: '#3B82F6' }} />
              <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>沙盒与权限配置 (Risk Control)</h3>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>终端命令执行权限 (Execute Command)</div>
              <select 
                value={permissions.executeCommand} 
                onChange={e => setPermissions(p => ({ ...p, executeCommand: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
              >
                <option value="ask">每次拦截询问 (Ask Human in the Loop)</option>
                <option value="allow">始终允许执行 (Always Allow)</option>
              </select>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>控制智能体执行 \`subprocess.run\` 时的拦截策略。</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>文件读写权限 (Write File)</div>
              <select 
                value={permissions.writeFile} 
                onChange={e => setPermissions(p => ({ ...p, writeFile: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
              >
                <option value="ask">每次拦截询问 (Ask Human in the Loop)</option>
                <option value="allow">始终允许执行 (Always Allow)</option>
              </select>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>控制智能体创建或覆盖文件时的拦截策略。</div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <input 
                  type="checkbox" 
                  id="sandboxToggle"
                  checked={permissions.useGitSandbox}
                  onChange={e => setPermissions(p => ({ ...p, useGitSandbox: e.target.checked }))}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="sandboxToggle" style={{ fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>启用 Git 工作树隔离沙盒 (Git Worktree Sandbox)</label>
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', paddingLeft: '24px' }}>
                开启后，智能体操作的所有文件将被隔离在一个临时的 Git 分支目录中，不会污染当前主工作区。你需要在此次运行结束后手动合并该分支。
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setShowRiskModal(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFF', color: '#374151', cursor: 'pointer', fontWeight: 500 }}
              >
                取消
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('mimi-team-permissions', JSON.stringify(permissions));
                  setShowRiskModal(false);
                }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#3B82F6', color: '#FFF', cursor: 'pointer', fontWeight: 500 }}
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
