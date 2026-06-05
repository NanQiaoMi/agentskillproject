import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

import '@xterm/xterm/css/xterm.css';
import { Icons } from '../components/Icons';
import { Task, Comment, ChatSession } from '../types';
import { ChatInput } from '../components/chat/ChatInput';
import { MessageList } from '../components/chat/MessageList';

import {
  getActiveAgent
} from '../utils/chatUtils';

const buildMdContent = (taskData: any, selectedTask: any, commentsList: any[]) => {
  const updatedTaskData = { ...taskData, comments: commentsList };
  const metadataStr = JSON.stringify(updatedTaskData, null, 2);
  
  let mdContent = `<!-- agentflow\n${metadataStr}\n-->\n\n# ${updatedTaskData.id}: ${updatedTaskData.title}\n\n## 任务描述\n${selectedTask.description || ''}\n\n## 涉及文件\n`;
  if (updatedTaskData.affected_files && updatedTaskData.affected_files.length > 0) {
    updatedTaskData.affected_files.forEach((f: string) => {
      mdContent += `- \`${f}\`\n`;
    });
  } else {
    mdContent += "无\n";
  }
  
  mdContent += "\n## 审查意见与修复记录\n";
  if (updatedTaskData.comments && updatedTaskData.comments.length > 0) {
    updatedTaskData.comments.forEach((c: any) => {
      const commentClean = c.comment.replace(/\n/g, '\n    ');
      mdContent += `- **${c.author}** (${c.time.substring(0, 16)}):\n    ${commentClean}\n`;
    });
  } else {
    mdContent += "无\n";
  }
  
  mdContent += "\n## 状态变更历史\n";
  if (updatedTaskData.history) {
    updatedTaskData.history.forEach((h: any) => {
      mdContent += `- \`${h.time.substring(0, 16)}\` | **${h.operator}** | 将状态从 \`[${h.from}]\` 变更为 \`[${h.to}]\` | 备注: ${h.message || '无'}\n`;
    });
  }
  return mdContent;
};

export interface ChatViewProps {
  projectPath: string;
  selectedTask: Task | null;
  tasks?: Task[];
  setSelectedTaskId: (id: string | null) => void;
  chatInputText: string;
  setChatInputText: (text: string) => void;
  handleSelectDirectory: () => void;
  fetchTasks: () => void;
  onNavigate: (viewId: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  projectPath,
  selectedTask,
  tasks = [],
  setSelectedTaskId,
  chatInputText,
  setChatInputText,
  handleSelectDirectory,
  fetchTasks,
  onNavigate
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [branches, setBranches] = useState<string[]>([]);
  const [showBranchMenu, setShowBranchMenu] = useState(false);

  const fetchBranches = async () => {
    if (!projectPath) return;
    try {
      const res: any = await invoke("get_git_branches", { repoPath: projectPath });
      setCurrentBranch(res.current);
      setBranches(res.all);
    } catch (e) {
      console.error("Failed to fetch branches:", e);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [projectPath]);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingAgent, setThinkingAgent] = useState('MIMIcode');
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [hasActivePty, setHasActivePty] = useState(false);
  const cliScrollRef = useRef<HTMLDivElement>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Load chat sessions from local storage
  useEffect(() => {
    const saved = localStorage.getItem('mimi-chat-sessions');
    if (saved) {
      try {
        setChatSessions(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Sync localComments when selectedTask or activeChatId changes
  useEffect(() => {
    if (selectedTask) {
      setLocalComments(selectedTask.comments || []);
    } else if (activeChatId) {
      const session = chatSessions.find(s => s.id === activeChatId);
      setLocalComments(session ? session.comments : []);
    } else {
      setLocalComments([]);
    }
  }, [selectedTask, activeChatId, chatSessions]);

  // Listen to PTY status changes from AgentTerminalPanel
  useEffect(() => {
    const handleStatus = (e: any) => {
      setHasActivePty(e.detail.hasActiveSessions);
    };
    window.addEventListener('agent-tui-status', handleStatus);
    return () => window.removeEventListener('agent-tui-status', handleStatus);
  }, []);

  const handleSendPtyInput = () => {
    if (!chatInputText.trim()) return;

    try {
      const cmd = chatInputText;
      window.dispatchEvent(new CustomEvent('send-pty-input', {
        detail: { data: cmd }
      }));
      setChatInputText('');
    } catch (err) {
      console.error("Failed to write to pty from chat input:", err);
    }
  };

  const handleSendInteractiveInput = async () => {
    const cmd = chatInputText.trim();
    if (!cmd) return;

    setChatInputText('');

    let activeAgentFile = '';
    const taLower = thinkingAgent.toLowerCase();
    if (taLower.includes('hermes')) activeAgentFile = 'hermes';
    else if (taLower.includes('antigravity')) activeAgentFile = 'antigravity';
    else if (taLower.includes('codex')) activeAgentFile = 'codex';
    else if (taLower.includes('claudecode') || taLower.includes('claude')) activeAgentFile = 'claudecode';
    else if (taLower.includes('opencode')) activeAgentFile = 'opencode';

    if (!activeAgentFile) return;

    try {
      await invoke('send_agent_chat_stdin', {
        cliName: activeAgentFile,
        projectPath,
        taskId: selectedTask ? selectedTask.id : null,
        input: cmd
      });
    } catch (err) {
      console.error("Failed to send interactive stdin:", err);
    }
  };



  // Auto scroll to bottom
  const scrollToBottom = () => {
    if (cliScrollRef.current) {
      cliScrollRef.current.scrollTop = cliScrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [localComments, isThinking]);

  // Detect current git branch
  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const status: string = await invoke('get_git_status', { repoPath: projectPath });
        // Parse branch from git status output: "## branch...tracking"
        const branchMatch = status.match(/^## (\S+?)(?:\.\.\.|$)/m);
        if (branchMatch) {
          setCurrentBranch(branchMatch[1]);
        }
      } catch {
        setCurrentBranch('main');
      }
    };
    if (projectPath) fetchBranch();
  }, [projectPath]);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('mimi-theme') || 'dark';
    setIsDarkTheme(savedTheme === 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Close mention menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Handle history menu click outside
      const target = e.target as HTMLElement;
      if (!target.closest('.header-left-container')) {
        setShowHistoryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async () => {
    if (!chatInputText.trim() || isSubmitting) return;
    
    if (chatInputText.trim().toLowerCase() === '/clear') {
      setChatInputText('');
      if (selectedTask) {
        try {
          const separator = projectPath.includes('/') ? '/' : '\\';
          const taskFilePath = `${projectPath}${separator}.agentflow${separator}tasks${separator}${selectedTask.id}.md`;
          const fileContent: string | null = await invoke('read_file_content', { path: taskFilePath });
          if (fileContent) {
            const startIdx = fileContent.indexOf('<!-- agentflow');
            const endIdx = fileContent.indexOf('-->', startIdx);
            if (startIdx !== -1 && endIdx !== -1) {
              const jsonStr = fileContent.substring(startIdx + '<!-- agentflow'.length, endIdx).trim();
              const taskData = JSON.parse(jsonStr);
              taskData.comments = [];
              setLocalComments([]);
              await invoke('write_file_content', { path: taskFilePath, content: buildMdContent(taskData, selectedTask, []) });
              await invoke('run_agentflow_cmd', { projectPath, args: ['sync'] });
              if (fetchTasks) fetchTasks();
            }
          }
        } catch (err) {
          console.error('Failed to clear task chat:', err);
        }
      } else {
        setLocalComments([]);
        if (activeChatId) {
          const newSessions = [...chatSessions];
          const idx = newSessions.findIndex(s => s.id === activeChatId);
          if (idx !== -1) {
            newSessions[idx].comments = [];
            setChatSessions(newSessions);
            localStorage.setItem('mimi-chat-sessions', JSON.stringify(newSessions));
          }
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedTask) {
        const separator = projectPath.includes('/') ? '/' : '\\';
        const taskFilePath = `${projectPath}${separator}.agentflow${separator}tasks${separator}${selectedTask.id}.md`;
        
        // Read file content
        const fileContent: string | null = await invoke('read_file_content', { path: taskFilePath });
        if (!fileContent) {
          throw new Error('Task file not found: ' + taskFilePath);
        }
        
        // Parse metadata
        const startIdx = fileContent.indexOf('<!-- agentflow');
        const endIdx = fileContent.indexOf('-->', startIdx);
        if (startIdx === -1 || endIdx === -1) {
          throw new Error('Task file format invalid: missing metadata block');
        }
        
        const jsonStr = fileContent.substring(startIdx + '<!-- agentflow'.length, endIdx).trim();
        const taskData = JSON.parse(jsonStr);
        
        // Append new comment
        const userMsg = chatInputText;
        const newComment = {
          time: new Date().toISOString(),
          author: 'user',
          comment: userMsg
        };
        
        if (!taskData.comments) taskData.comments = [];
        taskData.comments.push(newComment);
        
        // Optimistic UI Update: update local state instantly
        setLocalComments([...taskData.comments]);
        setChatInputText('');

        // Trigger background write & sync for user comment
        invoke('write_file_content', { path: taskFilePath, content: buildMdContent(taskData, selectedTask, taskData.comments) })
          .then(() => invoke('run_agentflow_cmd', { projectPath, args: ['sync'] }))
          .then(() => { if (fetchTasks) fetchTasks(); })
          .catch(err => console.error("Background sync error (user comment):", err));
        let activeAgent = getActiveAgent(chatInputText);
        if (!activeAgent.file) {
          activeAgent = { name: 'Antigravity', file: 'antigravity' };
        }
        
        // Automatic backend task state & git worktree transitions based on chat context
        if (selectedTask.status === 'todo' && activeAgent.name !== 'MIMIcode') {
          (async () => {
            try {
              console.log(`[Backend] Auto-starting task ${selectedTask.id} for agent ${activeAgent.name}`);
              await invoke("run_agentflow_cmd", { projectPath, args: ["start", selectedTask.id] });
              const wtPath = await invoke("manage_git_worktree", { projectPath, op: "add", taskId: selectedTask.id });
              await invoke("start_agent_task", { 
                projectPath, 
                taskId: selectedTask.id, 
                worktreePath: wtPath as string, 
                commandArgs: ["show", selectedTask.id] 
              });
              if (fetchTasks) fetchTasks();
            } catch (err) {
              console.error("Failed to auto-start backend task:", err);
            }
          })();
        } else if (selectedTask.status === 'in_progress' && activeAgent.name === 'ClaudeCode') {
          (async () => {
            try {
              console.log(`[Backend] Auto-submitting task ${selectedTask.id} for review`);
              await invoke("run_agentflow_cmd", { projectPath, args: ["submit", selectedTask.id] });
              if (fetchTasks) fetchTasks();
            } catch (err) {
              console.error("Failed to auto-submit backend task:", err);
            }
          })();
        } else if (selectedTask.status === 'review' && activeAgent.name === 'ClaudeCode') {
          const lowerMsg = userMsg.toLowerCase();
          const approve = lowerMsg.includes('approve') || lowerMsg.includes('通过') || lowerMsg.includes('批准');
          const reject = lowerMsg.includes('reject') || lowerMsg.includes('打回') || lowerMsg.includes('拒绝');
          
          if (approve || reject) {
            (async () => {
              try {
                const action = approve ? '--approve' : '--reject';
                console.log(`[Backend] Auto-reviewing task ${selectedTask.id} with action ${action}`);
                await invoke("run_agentflow_cmd", { 
                  projectPath, 
                  args: ["review", selectedTask.id, action, "--comment", userMsg] 
                });
                if (fetchTasks) fetchTasks();
              } catch (err) {
                console.error("Failed to run backend review command:", err);
              }
            })();
          }
        }

        // Trigger AI response inside the chat pane for the active agent
        setThinkingAgent(activeAgent.name);
        setIsThinking(true);

        // --- DELEGATE TO GLOBAL AGENT TUI ---
        (async () => {
          let promptToSend = userMsg.trim();
          
          // Strip any leading @mention (e.g. @Claude Code, @hermes) before sending to TUI
          const mentionRegex = /^@[a-zA-Z0-9\s]+(?:\s|$)/i;
          const match = promptToSend.match(mentionRegex);
          if (match) {
            promptToSend = promptToSend.substring(match[0].length).trim();
          }

          window.dispatchEvent(new CustomEvent('spawn-agent-tui', {
            detail: {
              agentId: activeAgent.file,
              prompt: promptToSend
            }
          }));

          const assistantComment = {
            time: new Date().toISOString(),
            author: activeAgent.name,
            comment: `🚀 已经为您在右下角 AgentTUI 面板中启动了 \`${activeAgent.name}\` 终端进程！\n\n您可以随时在面板中监控执行进度、干预流程，或者利用多标签页同时启动多个智能体并进行对比操作。`
          };
          taskData.comments.push(assistantComment);
          setLocalComments([...taskData.comments]);
          setIsThinking(false);

          await invoke('write_file_content', { path: taskFilePath, content: buildMdContent(taskData, selectedTask, taskData.comments) });
          await invoke('run_agentflow_cmd', { projectPath, args: ['sync'] });
          if (fetchTasks) fetchTasks();
        })();
      } else {
        // DO NOT create task in empty state (Welcome Screen)
        const userInput = chatInputText;
        setChatInputText('');
        
        const userComment = {
          time: new Date().toISOString(),
          author: 'user',
          comment: userInput
        };
        const newComments = [...localComments, userComment];

        let newSessions = [...chatSessions];
        let currentChatId = activeChatId;
        if (!currentChatId) {
          currentChatId = 'chat_' + Date.now();
          const newSession: ChatSession = {
            id: currentChatId,
            title: userInput.substring(0, 20) + (userInput.length > 20 ? '...' : ''),
            updatedAt: new Date().toISOString(),
            comments: newComments
          };
          newSessions.unshift(newSession);
          setActiveChatId(currentChatId);
        } else {
          const idx = newSessions.findIndex(s => s.id === currentChatId);
          if (idx !== -1) {
            newSessions[idx].comments = newComments;
            newSessions[idx].updatedAt = new Date().toISOString();
            const [session] = newSessions.splice(idx, 1);
            newSessions.unshift(session);
          }
        }
        setChatSessions(newSessions);
        localStorage.setItem('mimi-chat-sessions', JSON.stringify(newSessions));
        setLocalComments(newComments);

        const activeAgent = getActiveAgent(userInput);
        if (activeAgent.file) {
          const agentWarning = {
            time: new Date().toISOString(),
            author: 'MIMIcode',
            comment: `(此为临时会话，内容已保存在本地历史对话中)\n\n⚠️ 你刚刚 @ 了 **${activeAgent.name}**，但在非任务上下文中，部分需要读取仓库或修改文件的智能体可能受限。\n\n👉 **如需完整功能，请在左侧栏新建一个任务，然后再唤起它！**`
          };
          const warnComments = [...newComments, agentWarning];
          
          if (currentChatId) {
            const idx = newSessions.findIndex(s => s.id === currentChatId);
            if (idx !== -1) {
              newSessions[idx].comments = warnComments;
              setChatSessions([...newSessions]);
              localStorage.setItem('mimi-chat-sessions', JSON.stringify(newSessions));
            }
          }
          
          setLocalComments(warnComments);
          setIsSubmitting(false);
          return;
        }

        setThinkingAgent('MIMIcode');
        setIsThinking(true);

        (async () => {
          try {
            // Find configured API Key
            let activeProvider = '';
            let activeKey = '';
            
            for (const service of ['deepseek', 'openai', 'anthropic']) {
              try {
                const key: string = await invoke<string>('get_credential', { service, username: 'default' });
                if (key && key.trim()) {
                  activeProvider = service;
                  activeKey = key.trim();
                  break;
                }
              } catch (e) {
                // Ignore and check next
              }
            }

            let reply = '';
            if (activeProvider && activeKey) {
              // We have a configured API key! Let's request it
              let url = '';
              let requestBody = {};
              
              if (activeProvider === 'deepseek') {
                url = 'https://api.deepseek.com/chat/completions';
                requestBody = {
                  model: 'deepseek-chat',
                  messages: [
                    { role: 'system', content: 'You are MIMIcode, a helpful AI coding assistant in MimiCode Studio. Keep your response helpful, friendly, and relatively concise in Chinese.' },
                    { role: 'user', content: userInput }
                  ]
                };
              } else if (activeProvider === 'openai') {
                const baseUrl = localStorage.getItem('mimi-openai-base-url') || 'https://api.openai.com/v1';
                const configuredModel = localStorage.getItem('mimi-openai-model') || 'gpt-4o-mini';
                const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
                url = sanitizedBaseUrl.endsWith('/chat/completions') ? sanitizedBaseUrl : `${sanitizedBaseUrl}/chat/completions`;
                
                requestBody = {
                  model: configuredModel,
                  messages: [
                    { role: 'system', content: 'You are MIMIcode, a helpful AI coding assistant in MimiCode Studio. Keep your response helpful, friendly, and relatively concise in Chinese.' },
                    { role: 'user', content: userInput }
                  ]
                };
              } else if (activeProvider === 'anthropic') {
                url = 'https://api.anthropic.com/v1/messages';
                requestBody = {
                  model: 'claude-3-5-haiku-20241022',
                  max_tokens: 1024,
                  system: 'You are MIMIcode, a helpful AI coding assistant in MimiCode Studio. Keep your response helpful, friendly, and relatively concise in Chinese.',
                  messages: [
                    { role: 'user', content: userInput }
                  ]
                };
              }

              if (url) {
                try {
                  const resStr = await invoke<string>('proxy_post_request', {
                    url,
                    apiKey: activeKey,
                    body: JSON.stringify(requestBody)
                  });
                  const resJson = JSON.parse(resStr);
                  if (activeProvider === 'deepseek' || activeProvider === 'openai') {
                    reply = resJson.choices?.[0]?.message?.content || '收到空回复';
                  } else if (activeProvider === 'anthropic') {
                    reply = resJson.content?.[0]?.text || '收到空回复';
                  }
                } catch (apiErr: any) {
                  console.error('API request failed:', apiErr);
                  reply = `⚠️ 调用 ${activeProvider} API 失败，请检查您的 API Key 是否有效或网络连接是否正常。\n\n具体错误信息：\n\`\`\`\n${String(apiErr)}\n\`\`\``;
                }
              }
            }

            if (!reply) {
              reply = `你好！我是 **MIMIcode AI 助手**。🤖\n\n目前你处于**无任务状态下的临时会话**中。由于您还没有在 **Settings (设置)** 页面配置 API Key，所以我现在还无法连接到大模型为您提供智能问答服务。\n\n**如何开启智能对话：**\n1. 点击左侧导航栏最下方的 **Settings** ⚙️；\n2. 在 **API Keys** 配置区，填入您的 **DeepSeek**、**OpenAI** 或 **Anthropic** API Key 并保存；\n3. 回到这里即可和我进行无限制的自由对话！\n\n**我能为您做什么：**\n* **新建任务**：点击左侧 **Tasks** 栏新建任务，我会作为专属智能体（如 Claude Code/Gemini）辅助您在工作区自动编写代码并测试。\n* **解答技术疑问**：配置 API Key 后，随时可以在这里向我咨询代码设计、Bug 调试或技术方案。`;
            }

            const finalComments = [...newComments, {
              time: new Date().toISOString(),
              author: 'MIMIcode',
              comment: `(此为无任务状态下的临时会话，关闭后可在顶部菜单再次找回)\n\n${reply}`
            }];
            
            if (currentChatId) {
              const idx = newSessions.findIndex(s => s.id === currentChatId);
              if (idx !== -1) {
                newSessions[idx].comments = finalComments;
                newSessions[idx].updatedAt = new Date().toISOString();
                setChatSessions([...newSessions]);
                localStorage.setItem('mimi-chat-sessions', JSON.stringify(newSessions));
              }
            }
            setLocalComments(finalComments);
          } catch (err: any) {
            console.error(err);
          } finally {
            setIsThinking(false);
          }
        })();
      }
    } catch (e: any) {
      alert("Error: " + e.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommitInput = () => {
    const hasMention = chatInputText.trim().startsWith('@');
    
    if (hasMention) {
      // If explicitly mentioning an agent, always use handleSubmit to route correctly
      handleSubmit();
    } else if (hasActivePty) {
      // If a global PTY session is active, route input directly to the current TUI tab
      handleSendPtyInput();
    } else if (isThinking && thinkingAgent !== 'MIMIcode') {
      handleSendInteractiveInput();
    } else {
      handleSubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitInput();
    }
  };

  const handleThemeToggle = () => {
    const newTheme = isDarkTheme ? 'light' : 'dark';
    setIsDarkTheme(!isDarkTheme);
    localStorage.setItem('mimi-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleNavigate = (nav: string) => {
    if (onNavigate) onNavigate(nav);
  };

  const handleFillInput = (text: string) => {
    setChatInputText(text);
  };

  const handleAttachFile = async () => {
    try {
      const selected: string = await invoke('select_directory');
      setChatInputText(chatInputText + ` [attached: ${selected}]`);
    } catch {
      // User cancelled selection
    }
  };

  return (
    <div className="view-container">
      {/* Chat Header */}
      <div className="main-header">
        <div className="header-left-container" style={{ position: 'relative' }}>
          <div 
            className="header-left" 
            style={{ cursor: 'pointer' }}
            onClick={() => setShowHistoryMenu(!showHistoryMenu)}
          >
            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedTask 
                ? selectedTask.title 
                : (activeChatId 
                   ? chatSessions.find(s => s.id === activeChatId)?.title 
                   : 'New Conversation')}
            </span>
            <Icons.ChevronDown style={{ color: 'var(--color-text-muted)' }} />
          </div>
          {showHistoryMenu && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '8px',
                width: '300px',
                maxHeight: '400px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                padding: '4px',
                animation: 'dropdownPop var(--duration-fast) var(--ease-spring) both',
                transformOrigin: 'top left'
              }}
            >
              <div 
                className={`dropdown-item ${(!selectedTask && !activeChatId) ? 'active' : ''}`}
                style={{ fontSize: '13px', gap: '8px' }}
                onClick={() => {
                  if (setSelectedTaskId) setSelectedTaskId(null);
                  setActiveChatId(null);
                  setLocalComments([]);
                  setShowHistoryMenu(false);
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Icons.Plus style={{ width: 14, height: 14 }} /> 
                  新建对话
                </div>
              </div>

              {chatSessions.length > 0 && (
                <>
                  <div style={{ padding: '8px 12px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>历史对话 (Chats)</div>
                  {chatSessions.map((s, idx) => (
                    <div 
                      key={s.id}
                      className={`dropdown-item ${activeChatId === s.id ? 'active' : ''}`}
                      style={{ animationDelay: `${idx * 20}ms` }}
                      onClick={() => {
                        if (setSelectedTaskId) setSelectedTaskId(null);
                        setActiveChatId(s.id);
                        setShowHistoryMenu(false);
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                        <span style={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          fontSize: '13px',
                          fontWeight: activeChatId === s.id ? 600 : 400,
                          color: activeChatId === s.id ? 'var(--color-primary-orange)' : 'var(--color-text-main)'
                        }}>{s.title}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{new Date(s.updatedAt).toLocaleDateString()} {new Date(s.updatedAt).toLocaleTimeString()}</span>
                      </div>
                      <div 
                        className="dropdown-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newSessions = chatSessions.filter(chat => chat.id !== s.id);
                          setChatSessions(newSessions);
                          localStorage.setItem('mimi-chat-sessions', JSON.stringify(newSessions));
                          if (activeChatId === s.id) {
                            setActiveChatId(null);
                            setLocalComments([]);
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--color-text-muted)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="删除该对话"
                      >
                        <Icons.Trash2 style={{ width: 14, height: 14 }} />
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {tasks.length > 0 && (
                <>
                  <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '8px 0 4px 0' }} />
                  <div style={{ padding: '8px 12px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>开发任务 (Tasks)</div>
                  {tasks.map(t => (
                    <div 
                      key={t.id}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: selectedTask?.id === t.id ? 600 : 400,
                        color: selectedTask?.id === t.id ? 'var(--color-primary-orange)' : 'var(--color-text-main)',
                        backgroundColor: selectedTask?.id === t.id ? 'var(--color-primary-light)' : 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                      onClick={() => {
                        if (setSelectedTaskId) setSelectedTaskId(t.id);
                        setActiveChatId(null);
                        setShowHistoryMenu(false);
                      }}
                      onMouseEnter={(e) => {
                        if (selectedTask?.id !== t.id) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedTask?.id !== t.id) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{t.id}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="header-center" style={{ position: 'relative' }}>
          <span style={{ cursor: 'pointer' }} onClick={handleSelectDirectory}>
            {projectPath.split('\\').pop() || projectPath.split('/').pop() || "Select Project"}
          </span>
          <span className="header-center-divider">|</span>
          <div 
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px' }}
            onClick={() => setShowBranchMenu(!showBranchMenu)}
          >
            <Icons.GitBranch className="header-center-icon" style={{ margin: 0 }} />
            <span>{currentBranch}</span>
            <Icons.ChevronDown className="header-center-icon" style={{ margin: 0 }} />
          </div>
          
          {showBranchMenu && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                marginTop: '8px',
                width: '200px',
                maxHeight: '300px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                padding: '4px',
                animation: 'dropdownPop var(--duration-fast) var(--ease-spring) both',
                transformOrigin: 'top center'
              }}
            >
              <div style={{ padding: '8px 12px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>分支列表 (Branches)</div>
              {branches.map((b) => (
                <div 
                  key={b}
                  className={`dropdown-item ${currentBranch === b ? 'active' : ''}`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setShowBranchMenu(false);
                    if (b !== currentBranch) {
                      try {
                        await invoke("checkout_git_branch", { repoPath: projectPath, branch: b });
                        (window as any).showToast?.(`已切换到分支 ${b}`, "success");
                        fetchBranches();
                      } catch (err: any) {
                        (window as any).showToast?.(`切换分支失败: ${err}`, "error");
                      }
                    }
                  }}
                >
                  <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    fontSize: '13px',
                    fontWeight: currentBranch === b ? 600 : 400,
                    color: currentBranch === b ? 'var(--color-primary-orange)' : 'var(--color-text-main)'
                  }}>{b}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="header-right">
          <button className="header-icon-btn" onClick={handleThemeToggle} title={isDarkTheme ? '切换到浅色主题' : '切换到深色主题'}>
            {isDarkTheme ? <Icons.Sun /> : <Icons.Moon />}
          </button>
          <div className="user-avatar" style={{ 
            backgroundColor: 'var(--color-primary-orange)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 600, color: '#fff'
          }}>U</div>
        </div>
      </div>

      {/* Chat Content */}
      {!selectedTask && localComments.length === 0 ? (
        <div className="chat-welcome">
          <h1 className="welcome-title">你好，我是 <span>MIMIcode</span></h1>
          <p className="welcome-subtitle">你的本地多智能体协同开发伙伴</p>
          <div className="welcome-actions">
            <button className="action-btn" onClick={() => (window as any).setShowInterceptionModal?.(true)}>
              <Icons.Code className="action-btn-icon" /> Test Interception Modal
            </button>
            <button className="action-btn" onClick={() => handleNavigate('Tasks')}>
              <Icons.Zap className="action-btn-icon" /> Plan tasks
            </button>
            <button className="action-btn" onClick={() => handleNavigate('Diagnostics')}>
              <Icons.Shield className="action-btn-icon" /> Run diagnostics
            </button>
          </div>
        </div>
      ) : (
        <div className="chat-scroll-area" ref={cliScrollRef}>
          {selectedTask ? (
            <div className="chat-welcome" style={{ padding: '0 0 24px 0', borderBottom: '1px solid var(--color-border)' }}>
              <h1 className="welcome-title" style={{ fontSize: '24px' }}>{selectedTask.title}</h1>
              <p className="welcome-subtitle" style={{ marginBottom: '16px' }}>{selectedTask.id}</p>
              <div className="welcome-actions">
                <button className="action-btn" onClick={() => handleFillInput(`@Hermes 帮我头脑风暴一下: ${selectedTask.title}`)}>
                  <Icons.Zap className="action-btn-icon" /> Brainstorm
                </button>
                <button className="action-btn" onClick={() => handleNavigate('Specifications')}>
                  <Icons.FileText className="action-btn-icon" /> Spec
                </button>
                <button className="action-btn" onClick={() => handleFillInput(`@Antigravity 前端设计: ${selectedTask.title}`)}>
                  <Icons.Layout className="action-btn-icon" /> Design
                </button>
                <button className="action-btn" onClick={() => handleFillInput(`@Codex 开始构建: ${selectedTask.title}`)}>
                  <Icons.Code className="action-btn-icon" /> Build
                </button>
                <button className="action-btn" onClick={() => handleFillInput(`@OpenCode 重构代码: ${selectedTask.title}`)}>
                  <Icons.RefreshCw className="action-btn-icon" /> Refactor
                </button>
                <button className="action-btn" onClick={() => handleFillInput(`@ClaudeCode 审查代码: ${selectedTask.title}`)}>
                  <Icons.Shield className="action-btn-icon" /> Review
                </button>
              </div>
            </div>
          ) : (
            <div className="chat-welcome" style={{ padding: '0 0 24px 0', borderBottom: '1px solid var(--color-border)' }}>
              <h1 className="welcome-title" style={{ fontSize: '24px' }}>临时全局会话</h1>
              <p className="welcome-subtitle" style={{ marginBottom: '16px' }}>(当前未选择任务，记录不会被持久化保存)</p>
            </div>
          )}

          <MessageList 
            selectedTask={selectedTask || null}
            localComments={localComments}
            isThinking={isThinking}
            thinkingAgent={thinkingAgent}
          />
        </div>
      )}

      <ChatInput 
        chatInputText={chatInputText}
        setChatInputText={setChatInputText}
        isThinking={isThinking}
        thinkingAgent={thinkingAgent}
        isSubmitting={isSubmitting}
        handleAttachFile={handleAttachFile}
        handleCommitInput={handleCommitInput}
        handleKeyDown={handleKeyDown}
      />
    </div>
  );
};
