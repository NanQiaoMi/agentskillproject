import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Icons } from '../components/Icons';
import { Task, HistoryItem, Comment } from '../types';

const parseLinksOnly = (text: string) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = linkRegex.exec(text)) !== null) {
    const beforeText = text.substring(lastIndex, match.index);
    if (beforeText) {
      parts.push(beforeText);
    }
    const label = match[1];
    const url = match[2];
    parts.push(
      <a 
        key={`link-${match.index}`} 
        href="#" 
        onClick={async (e) => {
          e.preventDefault();
          if (url.startsWith('file:///')) {
            const cleanPath = decodeURIComponent(url.substring(8)); // strip file:///
            await invoke('open_in_explorer', { path: cleanPath });
          }
        }}
        style={{ color: 'var(--color-primary-orange)', textDecoration: 'underline', fontWeight: 500 }}
      >
        {label}
      </a>
    );
    lastIndex = linkRegex.lastIndex;
  }
  
  const afterText = text.substring(lastIndex);
  if (afterText) {
    parts.push(afterText);
  }
  return parts.length > 0 ? parts : text;
};

const parseAnsiWithLinks = (text: string) => {
  const ansiRegex = /\x1b\[([0-9;?]+)m/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  let currentStyles: React.CSSProperties = {};
  
  while ((match = ansiRegex.exec(text)) !== null) {
    const textSegment = text.substring(lastIndex, match.index);
    if (textSegment) {
      parts.push({
        text: textSegment,
        styles: { ...currentStyles }
      });
    }
    
    const codes = match[1].split(';');
    for (const code of codes) {
      const codeNum = parseInt(code, 10);
      if (codeNum === 0) {
        currentStyles = {};
      } else if (codeNum === 1) {
        currentStyles.fontWeight = 'bold';
      } else if (codeNum === 3) {
        currentStyles.fontStyle = 'italic';
      } else if (codeNum === 4) {
        currentStyles.textDecoration = 'underline';
      } else if (codeNum >= 30 && codeNum <= 37) {
        const colors = [
          '#cbd5e1', // 30: gray / dark black
          '#f87171', // 31: red
          '#34d399', // 32: green
          '#fbbf24', // 33: yellow
          '#60a5fa', // 34: blue
          '#ec4899', // 35: magenta
          '#22d3ee', // 36: cyan
          '#f8fafc', // 37: white
        ];
        currentStyles.color = colors[codeNum - 30];
      } else if (codeNum >= 90 && codeNum <= 97) {
        const colors = [
          '#94a3b8', // 90: bright black (gray)
          '#fca5a5', // 91: bright red
          '#6ee7b7', // 92: bright green
          '#fde047', // 93: bright yellow
          '#93c5fd', // 94: bright blue
          '#f9a8d4', // 95: bright magenta
          '#67e8f9', // 96: bright cyan
          '#ffffff', // 97: bright white
        ];
        currentStyles.color = colors[codeNum - 90];
      }
    }
    
    lastIndex = ansiRegex.lastIndex;
  }
  
  const finalSegment = text.substring(lastIndex);
  if (finalSegment) {
    parts.push({
      text: finalSegment,
      styles: { ...currentStyles }
    });
  }
  
  const renderedElements: React.ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  parts.forEach((part, partIdx) => {
    let pLastIndex = 0;
    let pMatch;
    const partText = part.text;
    linkRegex.lastIndex = 0; // Reset RegExp search position for this string segment
    
    while ((pMatch = linkRegex.exec(partText)) !== null) {
      const before = partText.substring(pLastIndex, pMatch.index);
      if (before) {
        renderedElements.push(
          <span key={`p-${partIdx}-b-${pMatch.index}`} style={part.styles}>
            {before}
          </span>
        );
      }
      
      const label = pMatch[1];
      const url = pMatch[2];
      
      renderedElements.push(
        <a 
          key={`p-${partIdx}-l-${pMatch.index}`} 
          href="#" 
          onClick={async (e) => {
            e.preventDefault();
            if (url.startsWith('file:///')) {
              const cleanPath = decodeURIComponent(url.substring(8)); // strip file:///
              await invoke('open_in_explorer', { path: cleanPath });
            }
          }}
          style={{ 
            color: '#f97316', 
            textDecoration: 'underline', 
            fontWeight: 600,
            cursor: 'pointer',
            ...part.styles 
          }}
        >
          {label}
        </a>
      );
      
      pLastIndex = linkRegex.lastIndex;
    }
    
    const after = partText.substring(pLastIndex);
    if (after) {
      renderedElements.push(
        <span key={`p-${partIdx}-a`} style={part.styles}>
          {after}
        </span>
      );
    }
  });
  
  return renderedElements.length > 0 ? renderedElements : [text];
};

const renderCommentContent = (text: string, isCliAgent: boolean) => {
  if (isCliAgent) {
    return (
      <div 
        className="cli-terminal-log" 
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #334155',
          overflowX: 'auto',
          fontSize: '13px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap'
        }}
      >
        {parseAnsiWithLinks(text)}
      </div>
    );
  } else {
    return <div style={{ whiteSpace: 'pre-wrap' }}>{parseLinksOnly(text)}</div>;
  }
};

interface ChatViewProps {
  projectPath: string;
  selectedTask?: Task;
  tasks?: Task[];
  setSelectedTaskId?: (id: string | null) => void;
  chatInputText: string;
  setChatInputText: (text: string) => void;
  handleSelectDirectory: () => void;
  fetchTasks?: () => void;
  onNavigate?: (nav: string) => void;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  comments: Comment[];
}

const AVAILABLE_AGENTS = [
  { id: 'hermes', name: 'Hermes Agent', role: 'Planner' },
  { id: 'antigravity', name: 'Antigravity', role: 'Frontend' },
  { id: 'codex', name: 'Codex', role: 'Backend' },
  { id: 'claudecode', name: 'Claude Code', role: 'Auditor' },
  { id: 'opencode', name: 'OpenCode CLI', role: 'Refactorer' },
];

const parseTime = (timeStr: string) => {
  if (!timeStr) return new Date();
  if (!timeStr.includes('Z') && !timeStr.match(/[\+\-]\d{2}:\d{2}$/)) {
    const parts = timeStr.split(/[-TH:.]/);
    if (parts.length >= 6) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-based
      const day = parseInt(parts[2], 10);
      const hour = parseInt(parts[3], 10);
      const minute = parseInt(parts[4], 10);
      const second = parseInt(parts[5], 10);
      return new Date(year, month, day, hour, minute, second);
    }
  }
  return new Date(timeStr);
};

const getActiveAgent = (inputText: string) => {
  const lowerInput = inputText.toLowerCase();
  
  if (lowerInput.includes('@hermes')) {
    return { name: 'Hermes', file: 'hermes' };
  }
  if (lowerInput.includes('@antigravity')) {
    return { name: 'Antigravity', file: 'antigravity' };
  }
  if (lowerInput.includes('@codex')) {
    return { name: 'Codex', file: 'codex' };
  }
  if (lowerInput.includes('@claudecode') || lowerInput.includes('@claude')) {
    return { name: 'ClaudeCode', file: 'claudecode' };
  }
  if (lowerInput.includes('@opencode')) {
    return { name: 'OpenCode', file: 'opencode' };
  }

  // Always default to MIMIcode if no explicit mention is found
  return { name: 'MIMIcode', file: null };
};

const getAgentAvatarStyle = (author: string) => {
  const authorLower = author.trim().toLowerCase();
  let bgColor = '#4F46E5'; // Default Indigo
  if (authorLower === 'user' || authorLower === 'meaghan') {
    bgColor = 'var(--color-primary-orange)';
  } else if (authorLower === 'hermes') {
    bgColor = '#6366F1'; // Indigo
  } else if (authorLower === 'antigravity') {
    bgColor = '#F97316'; // Coral / Orange
  } else if (authorLower === 'codex') {
    bgColor = '#10B981'; // Emerald
  } else if (authorLower === 'claudecode' || authorLower === 'claude') {
    bgColor = '#F59E0B'; // Amber / Gold
  } else if (authorLower === 'opencode') {
    bgColor = '#8B5CF6'; // Violet / Purple
  } else if (authorLower === 'mimicode') {
    bgColor = '#3B82F6'; // Blue
  }
  return {
    backgroundColor: bgColor,
    color: '#fff'
  };
};

const getAgentInitials = (author: string) => {
  const authorLower = author.trim().toLowerCase();
  if (authorLower === 'user' || authorLower === 'meaghan') return 'U';
  if (authorLower === 'hermes') return 'H';
  if (authorLower === 'antigravity') return 'A';
  if (authorLower === 'codex') return 'C';
  if (authorLower === 'claudecode' || authorLower === 'claude') return 'CC';
  if (authorLower === 'opencode') return 'O';
  if (authorLower === 'mimicode') return 'M';
  return author.charAt(0).toUpperCase();
};

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
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingAgent, setThinkingAgent] = useState('MIMIcode');
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [liveLogContent, setLiveLogContent] = useState('');
  const mentionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveTerminalRef = useRef<HTMLDivElement>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

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

  // xterm.js PTY integration for interactive agent session
  useEffect(() => {
    let unlistenData: UnlistenFn | null = null;

    if (isThinking && thinkingAgent !== 'MIMIcode' && liveTerminalRef.current && sessionKey) {
      if (!termRef.current) {
        const term = new Terminal({
          theme: {
            background: '#0f172a',
            foreground: '#f8fafc',
            cursor: '#f97316',
            selectionBackground: 'rgba(249, 115, 22, 0.3)',
          },
          fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
          fontSize: 13,
          cursorBlink: true,
        });
        
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());

        term.open(liveTerminalRef.current);
        fitAddon.fit();

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        term.onData((data) => {
          invoke('write_to_pty', { sessionKey, data }).catch(console.error);
        });

        term.onResize(({ cols, rows }) => {
          invoke('resize_pty', { sessionKey, cols, rows }).catch(console.error);
        });
        
        const handleResize = () => fitAddonRef.current?.fit();
        window.addEventListener('resize', handleResize);
        
        // Give it a moment then fit
        setTimeout(() => fitAddon.fit(), 100);
      }

      listen<{ session_key: string; data: string }>('pty-data', (event) => {
        if (event.payload.session_key === sessionKey && termRef.current) {
          termRef.current.write(event.payload.data);
          // Accumulate for saving when session ends
          setLiveLogContent(prev => prev + event.payload.data);
        }
      }).then((unlisten) => {
        unlistenData = unlisten;
      });

      return () => {
        const handleResize = () => fitAddonRef.current?.fit();
        window.removeEventListener('resize', handleResize);
        if (unlistenData) unlistenData();
      };
    } else if (!isThinking && termRef.current) {
      termRef.current.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    }
  }, [isThinking, thinkingAgent, sessionKey]);

  // Auto scroll live terminal to bottom when content changes
  useEffect(() => {
    if (liveTerminalRef.current) {
      liveTerminalRef.current.scrollTop = liveTerminalRef.current.scrollHeight;
    }
  }, [liveLogContent]);

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

  const handleFinishChatSession = async () => {
    if (!selectedTask || !projectPath) {
      setIsThinking(false);
      setThinkingAgent('MIMIcode');
      return;
    }

    let activeAgentFile = '';
    const taLower = thinkingAgent.toLowerCase();
    if (taLower.includes('hermes')) activeAgentFile = 'hermes';
    else if (taLower.includes('antigravity')) activeAgentFile = 'antigravity';
    else if (taLower.includes('codex')) activeAgentFile = 'codex';
    else if (taLower.includes('claudecode') || taLower.includes('claude')) activeAgentFile = 'claudecode';
    else if (taLower.includes('opencode')) activeAgentFile = 'opencode';

    if (!activeAgentFile) return;

    try {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '_').substring(0, 19);
      const logFileName = `cli_${activeAgentFile}_${timestamp}.log`;
      const separator = projectPath.includes('/') ? '/' : '\\';
      const logsDir = `${projectPath}${separator}.agentflow${separator}logs`;
      const logFilePath = `${logsDir}${separator}${logFileName}`;

      await invoke('run_shell_command', { 
        command: `mkdir "${logsDir}"`, 
        cwd: projectPath 
      }).catch(() => {});

      await invoke('write_file_content', { path: logFilePath, content: liveLogContent });

      const lines = liveLogContent.split('\n');
      let summary = lines.slice(0, 100).join('\n');
      if (lines.length > 100) {
        summary += '\n\n... (终端日志已被部分截断，完整日志请查看下方链接) ...';
      }

      const cleanLogPath = logFilePath.replace(/\\/g, '/');
      const relativeLogLink = `\n\n[查看完整执行终端日志](file:///${cleanLogPath})`;
      const commentContent = summary + relativeLogLink;

      const assistantComment = {
        time: new Date().toISOString(),
        author: thinkingAgent,
        comment: commentContent
      };

      const taskFilePath = `${projectPath}${separator}.agentflow${separator}tasks${separator}${selectedTask.id}.md`;
      const fileContent: string | null = await invoke('read_file_content', { path: taskFilePath });
      if (fileContent) {
        const startIdx = fileContent.indexOf('<!-- agentflow');
        const endIdx = fileContent.indexOf('-->', startIdx);
        if (startIdx !== -1 && endIdx !== -1) {
          const jsonStr = fileContent.substring(startIdx + '<!-- agentflow'.length, endIdx).trim();
          const taskData = JSON.parse(jsonStr);
          if (!taskData.comments) taskData.comments = [];
          taskData.comments.push(assistantComment);

          await invoke('write_file_content', { path: taskFilePath, content: buildMdContent(taskData, selectedTask, taskData.comments) });
          await invoke('run_agentflow_cmd', { projectPath, args: ['sync'] });
          setLocalComments([...taskData.comments]);
        }
      }
      
      if (sessionKey) {
        await invoke('kill_pty', { sessionKey }).catch(() => {});
        setSessionKey(null);
      }
      if (fetchTasks) fetchTasks();
    } catch (err) {
      console.error("Failed to finish chat session:", err);
    } finally {
      setIsThinking(false);
      setThinkingAgent('MIMIcode');
    }
  };

  const handleStopChatSession = async () => {
    let activeAgentFile = '';
    const taLower = thinkingAgent.toLowerCase();
    if (taLower.includes('hermes')) activeAgentFile = 'hermes';
    else if (taLower.includes('antigravity')) activeAgentFile = 'antigravity';
    else if (taLower.includes('codex')) activeAgentFile = 'codex';
    else if (taLower.includes('claudecode') || taLower.includes('claude')) activeAgentFile = 'claudecode';
    else if (taLower.includes('opencode')) activeAgentFile = 'opencode';

    if (activeAgentFile) {
      try {
        if (sessionKey) {
          await invoke('kill_pty', { sessionKey });
          setSessionKey(null);
        }
      } catch (err) {
        console.error("Failed to stop CLI:", err);
      }
    }
    setIsThinking(false);
    setThinkingAgent('MIMIcode');
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setShowMentionMenu(false);
      }
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

        // --- CLI AGENT INTERACTIVE PTY TERMINAL FLOW ---
        (async () => {
          try {
            setLiveLogContent('');
            const newSessionKey = await invoke<string>('spawn_agent_pty', {
              cliName: activeAgent.file,
              projectPath,
              cols: 80,
              rows: 24
            });
            setSessionKey(newSessionKey);

            // Extract prompt, strip mention prefixes like "@claudecode" or "@claude"
            let promptToSend = userMsg.trim();
            const mentionPrefix = `@${activeAgent.name.toLowerCase()}`;
            const altMentionPrefix = `@${activeAgent.file.toLowerCase()}`;
            if (promptToSend.toLowerCase().startsWith(mentionPrefix)) {
              promptToSend = promptToSend.substring(mentionPrefix.length).trim();
            } else if (promptToSend.toLowerCase().startsWith(altMentionPrefix)) {
              promptToSend = promptToSend.substring(altMentionPrefix.length).trim();
            }

            // Send command input to PTY if present
            if (promptToSend) {
              // Wait for PTY initialization
              await new Promise(resolve => setTimeout(resolve, 600));
              await invoke('write_to_pty', {
                sessionKey: newSessionKey,
                data: promptToSend + "\n"
              });
            }
          } catch (err: any) {
            console.error("CLI Daemon initialization failed:", err);
            const errorMsg = typeof err === 'string' ? err : String(err);
            const assistantComment = {
              time: new Date().toISOString(),
              author: activeAgent.name,
              comment: `❌ 执行失败或已被用户中止。\n\n终端输出：\n\`\`\`\n${errorMsg}\n\`\`\``
            };
            taskData.comments.push(assistantComment);
            setLocalComments([...taskData.comments]);
            setIsThinking(false);

            await invoke('write_file_content', { path: taskFilePath, content: buildMdContent(taskData, selectedTask, taskData.comments) });
            await invoke('run_agentflow_cmd', { projectPath, args: ['sync'] });
            if (fetchTasks) fetchTasks();
          }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isThinking && thinkingAgent !== 'MIMIcode') {
        handleSendInteractiveInput();
      } else {
        handleSubmit();
      }
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

  const handleMentionSelect = (agentName: string) => {
    setChatInputText(chatInputText + `@${agentName} `);
    setShowMentionMenu(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
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
                padding: '4px'
              }}
            >
              <div 
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: (!selectedTask && !activeChatId) ? 600 : 400,
                  color: (!selectedTask && !activeChatId) ? 'var(--color-primary-orange)' : 'var(--color-text-main)',
                  backgroundColor: (!selectedTask && !activeChatId) ? 'var(--color-primary-light)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={() => {
                  if (setSelectedTaskId) setSelectedTaskId(null);
                  setActiveChatId(null);
                  setLocalComments([]);
                  setShowHistoryMenu(false);
                }}
              >
                <Icons.Plus style={{ width: 14, height: 14 }} /> 
                + 新建对话
              </div>

              {chatSessions.length > 0 && (
                <>
                  <div style={{ padding: '8px 12px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>历史对话 (Chats)</div>
                  {chatSessions.map(s => (
                    <div 
                      key={s.id}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        backgroundColor: activeChatId === s.id ? 'var(--color-primary-light)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={(e) => {
                        if (activeChatId !== s.id) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (activeChatId !== s.id) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
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
                        style={{
                          padding: '4px',
                          borderRadius: '4px',
                          color: 'var(--color-text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: '8px'
                        }}
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
        
        <div className="header-center">
          <span style={{ cursor: 'pointer' }} onClick={handleSelectDirectory}>
            {projectPath.split('\\').pop() || projectPath.split('/').pop() || "Select Project"}
          </span>
          <span className="header-center-divider">|</span>
          <Icons.GitBranch className="header-center-icon" />
          <span>{currentBranch}</span>
          <Icons.ChevronDown className="header-center-icon" />
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
        <div className="chat-scroll-area" ref={scrollRef}>
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

          {(() => {
            const items = [
              ...(selectedTask?.history || []).map(h => ({ type: 'history', time: h.time, data: h })),
              ...(localComments || []).map(c => ({ type: 'comment', time: c.time, data: c }))
            ].sort((a, b) => parseTime(a.time).getTime() - parseTime(b.time).getTime());

            if (items.length === 0) {
              return (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  暂无活动记录
                </div>
              );
            }

            return items.map((item, index) => {
              const dateStr = parseTime(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              if (item.type === 'history') {
                const h = item.data as HistoryItem;
                return (
                   <div key={`hist-${index}`} className="chat-message">
                    <div className="message-header">
                      <div className="message-avatar avatar-agent"><Icons.Activity style={{width: 14, height:14}}/></div>
                      <span className="message-sender">{h.operator} (System)</span>
                      <span className="message-time">{dateStr}</span>
                    </div>
                    <div className="message-body">
                      <div className="agent-step" style={{ color: 'var(--color-text-main)' }}>
                        <Icons.CheckCircle2 style={{ width: '12px', height: '12px', color: 'var(--color-success)' }}/> 
                        状态变更: [{h.from}] {"->"} [{h.to}]
                      </div>
                      <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{h.message}</p>
                    </div>
                  </div>
                );
              } else {
                const c = item.data as Comment;
                const isUser = c.author === 'user' || c.author === 'meaghan';
                return (
                   <div key={`comm-${index}`} className="chat-message">
                    <div className="message-header">
                      <div 
                        className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-agent'}`}
                        style={getAgentAvatarStyle(c.author)}
                      >
                         {getAgentInitials(c.author)}
                      </div>
                      <span className="message-sender">{c.author}</span>
                      <span className="message-time">{dateStr}</span>
                    </div>
                    <div className="message-body">
                      {renderCommentContent(
                        c.comment,
                        ['hermes', 'antigravity', 'codex', 'claudecode', 'opencode'].includes(c.author.toLowerCase())
                      )}
                    </div>
                  </div>
                );
              }
            });
          })()}
          {isThinking && (
             <div className="chat-message">
              <div className="message-header">
                <div 
                  className="message-avatar avatar-agent" 
                  style={getAgentAvatarStyle(thinkingAgent)}
                >
                  {getAgentInitials(thinkingAgent)}
                </div>
                <span className="message-sender">{thinkingAgent}</span>
                <span className="message-time">{thinkingAgent === 'MIMIcode' ? '思考中...' : '交互会话中...'}</span>
              </div>
              <div className="message-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {thinkingAgent === 'MIMIcode' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      正在生成回答...
                    </span>
                  </div>
                ) : (
                  <>
                    <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                      正在执行 CLI，你可以直接在下方输入框中向智能体发送交互命令：
                    </span>
                    
                    <div className="chat-live-terminal">
                      <div className="chat-live-terminal-header">
                        <div className="chat-live-terminal-title">
                          <Icons.Terminal style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                          {thinkingAgent} 终端交互面板
                        </div>
                        <div className="chat-live-terminal-status">
                          <span className="chat-live-terminal-status-dot" />
                          活动中
                        </div>
                      </div>
                      
                      <div 
                        className="pty-terminal-container" 
                        ref={liveTerminalRef}
                        style={{ height: '350px', backgroundColor: '#0f172a', padding: '8px', overflow: 'hidden' }}
                      >
                      </div>
                      
                      <div className="chat-live-terminal-actions">
                        <button className="btn-terminal-save" onClick={handleFinishChatSession}>
                          结束并保存会话
                        </button>
                        <button className="btn-terminal-stop" onClick={handleStopChatSession}>
                          强制中断
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Bar */}
      {!(isThinking && thinkingAgent !== 'MIMIcode') && (
      <div className="chat-input-wrapper">
        <div className="chat-input-box">
          <span title="附加文件或目录" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Icons.Plus 
              className="chat-input-icon" 
              style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
              onClick={handleAttachFile}
            />
          </span>
          <input 
            type="text" 
            className="chat-input-field" 
            placeholder={isThinking && thinkingAgent !== 'MIMIcode' ? `输入指令给 ${thinkingAgent}...` : "Ask anything or @agent..."}
            value={chatInputText}
            onChange={(e) => {
              const val = e.target.value;
              setChatInputText(val);
              if (val.endsWith('@') || val.match(/\s@$/)) {
                setShowMentionMenu(true);
              } else if (!val.includes('@')) {
                setShowMentionMenu(false);
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting && !(isThinking && thinkingAgent !== 'MIMIcode')}
            ref={inputRef}
          />
          <div style={{ position: 'relative', zIndex: 10 }} ref={mentionRef}>
            <span 
              style={{ 
                color: 'var(--color-text-muted)', 
                fontFamily: 'var(--font-mono)', 
                fontSize: '14px', 
                marginRight: '12px',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '4px',
                backgroundColor: showMentionMenu ? 'var(--bg-hover)' : 'transparent',
                transition: 'background-color 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none'
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMentionMenu(!showMentionMenu);
              }}
              onMouseEnter={(e) => { if (!showMentionMenu) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { if (!showMentionMenu) e.currentTarget.style.backgroundColor = 'transparent'; }}
              title="提及智能体"
            >@</span>
            {showMentionMenu && (
              <div style={{
                position: 'absolute',
                bottom: '36px',
                right: 0,
                width: '220px',
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                zIndex: 100,
                overflow: 'hidden',
                padding: '4px 0',
              }}>
                <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  选择智能体
                </div>
                {AVAILABLE_AGENTS.map(agent => (
                  <div
                    key={agent.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
                      color: 'var(--color-text-main)',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMentionSelect(agent.name);
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-panel)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span style={{ fontWeight: 500 }}>{agent.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>({agent.role})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Icons.Send className="chat-input-send" onClick={handleSubmit} style={{ cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }} />
        </div>
      </div>
      )}
    </div>
  );
};
