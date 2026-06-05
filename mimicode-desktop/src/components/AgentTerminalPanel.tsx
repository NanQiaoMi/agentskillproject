import React, { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { CanvasAddon } from '@xterm/addon-canvas';
import { Rnd } from 'react-rnd';
import '@xterm/xterm/css/xterm.css';
import { Icons } from './Icons';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.2);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.25);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.error('Audio play error:', e);
  }
};

import { dispatchAppNotification } from './NotificationsPanel';

const showNotification = (title: string, body: string, type: 'agent' | 'system' = 'system', osNotify: boolean = true) => {
  if (typeof window.dispatchEvent === 'function') {
    dispatchAppNotification({
      type,
      title,
      desc: body
    });
  }

  if (!osNotify) return;

  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') new Notification(title, { body });
    });
  }
};

interface AgentTerminalPanelProps {
  projectPath: string;
}

interface SessionInfo {
  sessionKey: string;
}

const AGENTS = [
  { 
    id: 'claudecode', name: 'Claude Code', icon: <Icons.Shield style={{ width: '16px', height: '16px' }} />, color: '#f97316', 
    prompt: '你是 Claude Code，首席代码与产品构建专家。\n\n## 核心能力与工具箱\n作为编程专家，你必须主动使用以下专属技能提升代码质量。使用方法：在终端运行 `npx @smithery/cli@latest skill add [技能名称]` 安装。\n1. `git-master`：处理复杂Git操作、变基和合并。在需要提交代码或梳理历史时使用。\n2. `code-review`：深度代码审查，找出逻辑漏洞和坏味道。在合并前或排查代码时使用。\n3. `refactor`：智能重构，优化代码内部结构。在发现代码臃肿或需优化架构时使用。\n4. `testing-expert`：自动生成单元测试与集成测试。在新功能开发完毕或修Bug后补充用例时使用。\n5. `security-audit`：扫描SQL注入等安全漏洞。在涉及鉴权和数据存储的代码完成后使用。\n6. `performance-optimization`：分析并提供内存泄漏、慢查询等性能优化方案。在系统卡顿或发现低效循环时使用。' 
  },
  { 
    id: 'antigravity', name: 'Gemini (Antigravity)', icon: <Icons.Zap style={{ width: '16px', height: '16px' }} />, color: '#10b981', 
    prompt: '你是 Antigravity (Gemini)，整个系统的高级架构师和智能体调度中枢。\n\n## 核心能力与工具箱\n你拥有最底层的Agent基础能力。使用方法：在终端运行 `npx @smithery/cli@latest skill add [技能名称]`。\n1. `find-skills`：从海量库中精准检索所需技能。当现有技能无法解决生僻需求时使用。\n2. `skill-creator`：将成功经验打包成全新可复用技能。当需要固化极好的工作流时使用。\n3. `using-superpowers`：最大化利用自身高级能力。在开启复杂大型项目前激活最强状态。\n4. `subagent-driven-development`：拆解复杂任务并生成子智能体并行工作。在需要多线开发庞大工程时使用。\n5. `agent-tools`：为Agent提供基础拓展工具。在受基础API限制需要辅助操作时使用。\n6. `systematic-debugging`：提供科学的系统性Bug排查框架。在遇到长报错、原因不明的顽固Bug时使用。' 
  },
  { 
    id: 'opencode', name: 'OpenCode', icon: <Icons.Terminal style={{ width: '16px', height: '16px' }} />, color: '#3b82f6', 
    prompt: '你是 OpenCode，前端视觉设计和浏览器自动化的专家。\n\n## 核心能力与工具箱\n你拥有化腐朽为神奇的视觉重构能力。使用方法：运行专属指令 `load_skill [技能名称]`（或npx命令）加载。\n1. `web-design-guidelines`：审查网页可用性和易用性。在用户让你优化网页设计时使用。\n2. `frontend-ui-ux`：将设计理念转化为现代响应式代码。在从零开发或美化现有界面时使用。\n3. `playwright`：浏览器自动化测试和表单填写。在编写UI自动化用例或验证交互逻辑时使用。\n4. `code-yeongyu/dev-browser`：自动化浏览提取网页信息。在抓取线上数据填充测试页面时使用。\n5. `web-design-audit`：深挖设计缺陷如对比度和无障碍标准。在项目上线前UI验收时使用。\n6. `image-generator`：利用AI生成配图素材。在缺乏高质量图片或需要高大上海报时使用。' 
  },
  { 
    id: 'codex', name: 'Codex', icon: <Icons.Code style={{ width: '16px', height: '16px' }} />, color: '#8b5cf6', 
    prompt: '你是 Codex，极具商业嗅觉的增长黑客与数据分析师。\n\n## 核心能力与工具箱\n除了生成代码，你还擅长营销和数据驱动。使用方法：运行 `npx @smithery/cli@latest skill add [技能名称]` 安装。\n1. `davila7/seo-optimizer`：分析并提供SEO提升建议及代码修改。在需要提升网站搜索排名时使用。\n2. `growth-hacking`：策划低成本用户增长和A/B测试方案。在需要设计拉新裂变活动时使用。\n3. `data-analyst`：清洗分析业务数据并生成图表代码。在面对海量数据需要总结规律或绘制图表时使用。\n4. `user-research`：设计调研问卷并生成人物画像。在立项初期分析目标群体痛点时使用。\n5. `competitor-analysis`：分析竞品优劣势和策略。在用户需要对比别人家怎么做功能时使用。' 
  },
  { 
    id: 'hermes', name: 'Hermes', icon: <Icons.Box style={{ width: '16px', height: '16px' }} />, color: '#ec4899', 
    prompt: '你是 Hermes，专注于项目规划与任务拆解的专家。\n\n## 核心能力与工具箱\n你专注于完整的任务卡片流程创建。使用方法：运行 `npx @smithery/cli@latest skill add [技能名称]`。\n1. `brainstorm`：必须在进行任何任务创建前，使用该技能完成头脑风暴，探索用户意图、需求和设计方案。\n2. `copywriting`：全能高质量文案输出。\n3. `content-strategy`：规划选题和内容发布日历。\n4. `marketing-ideas`：发散营销活动创意点子。\n5. `social-content`：定制小红书、朋友圈等平台网感爆款文案。\n6. `document-formatter`：自动整理排版精美的Markdown文档。\n7. `meeting-notes`：快速提炼会议摘要和待办事项。\n\n请在创建任务时，务必使用brainstorm功能，并输出完整、结构清晰的流程卡片。特别注意：如果在规划过程中涉及到前后端接口交互，必须显式地规划并生成 API Contracts (接口契约) 文件，确保其他Agent接手时有明确的接口标准。' 
  },
];

const AgentTerminalInstance: React.FC<{
  agentId: string,
  projectPath: string,
  isActive: boolean,
  isExpanded: boolean,
  onSessionReady?: (agentId: string, sessionKey: string) => void
}> = ({ agentId, projectPath, isActive, isExpanded, onSessionReady }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionKeyRef = useRef<string | null>(null);
  
  const lastDataTimeRef = useRef<number>(Date.now());
  const pendingInputRef = useRef<string | null>(null);

  const simulateTyping = async (text: string, sessionKey: string) => {
    for (const char of text) {
      await invoke('write_to_pty', { sessionKey, data: char });
      await new Promise(r => setTimeout(r, 30)); // 30ms per char
    }
    await new Promise(r => setTimeout(r, 300)); // wait before enter
    
    // Send ANSI Focus In (\x1b[I) to trick the TUI into thinking the terminal is focused
    await invoke('write_to_pty', { sessionKey, data: '\x1b[I' });
    await new Promise(r => setTimeout(r, 50));
    
    // Send the actual Carriage Return
    await invoke('write_to_pty', { sessionKey, data: '\r' });
  };

  useEffect(() => {
    const handleSendInput = (e: any) => {
      if (e.detail.agentId === agentId) {
        const timeSinceLastData = Date.now() - lastDataTimeRef.current;
        if (timeSinceLastData > 1500 && sessionKeyRef.current) {
          // Agent has been silent for >1.5s, send immediately
          simulateTyping(e.detail.data, sessionKeyRef.current).catch(console.error);
        } else {
          // Agent is busy or booting, queue it for later flush
          pendingInputRef.current = e.detail.data;
        }
      }
    };
    window.addEventListener('agent-tui-send-input', handleSendInput);
    
    const handleForceRedraw = (e: any) => {
      if (e.detail.agentId === agentId && sessionKeyRef.current && fitAddonRef.current) {
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims) {
          // 1. Ensure backend is synced to the absolute correct dimensions
          invoke('resize_pty', { sessionKey: sessionKeyRef.current, cols: dims.cols, rows: dims.rows }).catch(console.error);
          
          // 2. Send Ctrl+L (\x0C) to natively tell the TUI app (Claude Code/Ink/Bash) to completely clear the screen and redraw itself
          invoke('write_to_pty', { sessionKey: sessionKeyRef.current, data: '\x0C' }).catch(console.error);
        }
      }
    };
    window.addEventListener('agent-tui-force-redraw', handleForceRedraw);
    
    return () => {
      window.removeEventListener('agent-tui-send-input', handleSendInput);
      window.removeEventListener('agent-tui-force-redraw', handleForceRedraw);
    };
  }, [agentId]);

  useEffect(() => {
    if (!terminalContainerRef.current) return;

    // 1. Create and open terminal
    const term = new Terminal({
      allowProposedApi: true,
      theme: {
        background: '#15161e',
        foreground: '#c0caf5',
        cursor: '#f97316',
        cursorAccent: '#1a1b26',
        selectionBackground: 'rgba(249, 115, 22, 0.3)',
      },
      fontFamily: '"Cascadia Mono", "Cascadia Code", "Fira Code", Consolas, "Courier New", monospace',
      fontSize: 15,
      lineHeight: 1.2,
      letterSpacing: 0,
      customGlyphs: true,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    const unicode11Addon = new Unicode11Addon();
    term.loadAddon(unicode11Addon);
    term.unicode.activeVersion = '11';
    term.open(terminalContainerRef.current);
    try {
      const canvasAddon = new CanvasAddon();
      term.loadAddon(canvasAddon);
    } catch (e) {
      console.warn('Canvas addon failed to load:', e);
    }

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // 2. Set up keyboard input → PTY (uses ref so always current)
    const dataDisposable = term.onData(async (data: string) => {
      if (!sessionKeyRef.current) return;
      try {
        await invoke('write_to_pty', { sessionKey: sessionKeyRef.current, data });
      } catch (e) {
        console.error('Failed to write to pty:', e);
      }
    });

    // Handle Copy/Paste natively
    term.attachCustomKeyEventHandler((arg) => {
      if (arg.ctrlKey && arg.type === 'keydown') {
        if (arg.code === 'KeyC') {
          const selection = term.getSelection();
          if (selection) {
            arg.preventDefault();
            navigator.clipboard.writeText(selection);
            return false;
          }
        }
        if (arg.code === 'KeyV') {
          arg.preventDefault();
          navigator.clipboard.readText().then(text => {
            // Use xterm's native paste so it handles Bracketed Paste sequences
            // and newline conversions properly, firing onData which handles the PTY invoke.
            term.paste(text);
          });
          return false;
        }
      }
      return true;
    });

    // 3. Set up resize → PTY with strict debounce to prevent conpty corruption
    let lastCols = 0;
    let lastRows = 0;
    let ptyResizeTimeout: number | null = null;
    
    const resizeDisposable = term.onResize(async (size) => {
      if (!sessionKeyRef.current) return;
      if (size.cols === lastCols && size.rows === lastRows) return;
      lastCols = size.cols;
      lastRows = size.rows;
      
      if (ptyResizeTimeout) window.clearTimeout(ptyResizeTimeout);
      ptyResizeTimeout = window.setTimeout(async () => {
        try {
          await invoke('resize_pty', { sessionKey: sessionKeyRef.current, cols: size.cols, rows: size.rows });
          // Auto-trigger a clean redraw 150ms after the resize is applied to conpty
          setTimeout(() => {
            if (sessionKeyRef.current) {
              invoke('write_to_pty', { sessionKey: sessionKeyRef.current, data: '\x0C' }).catch(() => {});
            }
          }, 150);
        } catch (e) {
          console.error('Failed to resize pty:', e);
        }
      }, 300); // 300ms debounce prevents conpty tearing during window drags
    });

    // 4. Set up pty-data listener BEFORE spawning (critical: avoids race condition)
    let unlistenTauri: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;
    let dataBuffer = "";
    
    // Helper to trigger notifications
    const checkAndNotify = (isExit: boolean = false) => {
      const isFocused = document.hasFocus();

      const taskCompleteNotif = localStorage.getItem('mimi-notif-task-complete') !== 'false';
      const agentInterceptNotif = localStorage.getItem('mimi-notif-agent-intercept') !== 'false';
      const soundNotif = localStorage.getItem('mimi-notif-sound') !== 'false';

      const str = dataBuffer.trimEnd();
      const isPrompt = str.endsWith('>') || str.endsWith('❯') || str.endsWith('$') || str.endsWith('?');
      const isIntercept = dataBuffer.includes('Please review') || !!dataBuffer.match(/\([yY]\/[nN]\)/) || !!dataBuffer.match(/\[[yY]\/[nN]\]/) || dataBuffer.includes('人工确认') || dataBuffer.includes('Confirm') || dataBuffer.includes('Continue?');

      if (agentInterceptNotif && isIntercept) {
        if (soundNotif && !isFocused) playNotificationSound();
        showNotification('Mimicode Agent', '智能体需要你的审核或输入。', 'agent', !isFocused);
      } else if (taskCompleteNotif && (isExit || isPrompt || dataBuffer.includes('任务完成') || dataBuffer.includes('Task Complete') || dataBuffer.includes('✨ Done'))) {
        if (soundNotif && !isFocused) playNotificationSound();
        showNotification('Mimicode Agent', isExit ? '智能体已退出或完成任务。' : '智能体已处理完毕。', 'agent', !isFocused);
      }
      dataBuffer = ""; // Reset buffer after notification
    };

    listen<{ session_key: string; data: string }>('pty-data', (event) => {
      if (event.payload.session_key === sessionKeyRef.current && event.payload.data) {
        lastDataTimeRef.current = Date.now();
        term.write(event.payload.data);

        // Parse Agent Outputs for Notifications
        dataBuffer += event.payload.data;
        if (dataBuffer.length > 2048) {
          dataBuffer = dataBuffer.slice(-2048);
        }

        if ((window as any).agentNotifTimeout) clearTimeout((window as any).agentNotifTimeout);
        (window as any).agentNotifTimeout = setTimeout(() => {
          checkAndNotify(false);
          
          if (pendingInputRef.current && sessionKeyRef.current) {
            const data = pendingInputRef.current;
            pendingInputRef.current = null;
            simulateTyping(data, sessionKeyRef.current).catch(console.error);
          }
        }, 1500); // 1.5s of silence implies agent is waiting for input
      }
    }).then(fn => { unlistenTauri = fn; });

    listen<{ session_key: string; data: string }>('pty-exit', (event) => {
      if (event.payload.session_key === sessionKeyRef.current) {
        checkAndNotify(true);
      }
    }).then(fn => { unlistenExit = fn; });

    // 5. Set up ResizeObserver for auto-fit with debounce
    let resizeObserver: ResizeObserver | null = null;
    let fitTimeout: number | null = null;
    
    if (terminalContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (terminalContainerRef.current?.offsetParent !== null && fitAddonRef.current) {
          if (fitTimeout) window.clearTimeout(fitTimeout);
          fitTimeout = window.setTimeout(() => {
            try { fitAddonRef.current?.fit(); } catch (_) {}
          }, 50); // 50ms frontend debounce
        }
      });
      resizeObserver.observe(terminalContainerRef.current);
    }

    // 6. Now spawn PTY (after listener is ready)
    const spawn = async () => {
      try {
        // Small delay to let the DOM lay out so we can measure real dimensions
        await new Promise(r => setTimeout(r, 80));
        try { fitAddon.fit(); } catch (_) {}

        const dims = fitAddon.proposeDimensions();
        const cols = dims?.cols || 80;
        const rows = dims?.rows || 24;

        const sk: string = await invoke('spawn_agent_pty', {
          cliName: agentId,
          projectPath,
          cols,
          rows,
        });
        sessionKeyRef.current = sk;
        if (onSessionReady) onSessionReady(agentId, sk);
      } catch (e) {
        console.error('Failed to start agent PTY:', e);
        term.write(`\r\n\x1b[31m  Error: Failed to start ${agentId}\x1b[0m\r\n`);
        term.write(`\x1b[90m  ${String(e)}\x1b[0m\r\n`);
      }
    };
    spawn();

    // Cleanup
    return () => {
      dataDisposable.dispose();
      resizeDisposable.dispose();
      if (resizeObserver) resizeObserver.disconnect();
      if (unlistenTauri) unlistenTauri();
      if (unlistenExit) unlistenExit();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      sessionKeyRef.current = null;
    };
  }, [agentId, projectPath]);

  // Re-fit when tab becomes active or expanded
  useEffect(() => {
    if (isActive && isExpanded && fitAddonRef.current && terminalContainerRef.current?.offsetParent !== null) {
      setTimeout(() => {
        try { fitAddonRef.current?.fit(); } catch (_) {}
      }, 50);
    }
  }, [isActive, isExpanded]);

  return (
    <div
      className="pty-terminal-container"
      ref={terminalContainerRef}
      style={{
        visibility: isActive ? 'visible' : 'hidden',
        opacity: isActive ? 1 : 0,
        pointerEvents: isActive ? 'auto' : 'none',
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%',
        zIndex: isActive ? 1 : 0,
      }}
    />
  );
};

export const AgentTerminalPanel: React.FC<AgentTerminalPanelProps> = ({ projectPath }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'tabs' | 'grid'>('tabs');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const [selectedAgent, setSelectedAgent] = useState('claudecode');
  const [activeTab, setActiveTab] = useState('claudecode');
  const [sessions, setSessions] = useState<Record<string, SessionInfo>>({});
  
  const [startingAgent, setStartingAgent] = useState<string | null>(null);
  const [dynamicPrompts, setDynamicPrompts] = useState<Record<string, string>>({});
  const [position, setPosition] = useState({ x: window.innerWidth - 620, y: 60 });
  const [size, setSize] = useState({ width: 600, height: 480 });
  const [preMaxState, setPreMaxState] = useState<{ position: { x: number, y: number }, size: { width: number, height: number } } | null>(null);
  const [collapsedPos, setCollapsedPos] = useState({ x: window.innerWidth - 180, y: 60 });
  const activeTabRef = useRef(activeTab);
  const sessionsRef = useRef(sessions);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    sessionsRef.current = sessions;
    window.dispatchEvent(new CustomEvent('agent-tui-status', {
      detail: { hasActiveSessions: Object.keys(sessions).length > 0 }
    }));
  }, [sessions]);

  useEffect(() => {
    const handleSpawn = (e: any) => {
      const { agentId, prompt } = e.detail;
      setIsExpanded(true);
      setSessions(prev => {
        if (!prev[agentId]) {
          return { ...prev, [agentId]: { sessionKey: '' } };
        }
        return prev;
      });
      setActiveTab(agentId);
      setSelectedAgent(agentId);
      
      if (prompt) {
        // Wait for React to mount the new AgentTerminalInstance before dispatching
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('agent-tui-send-input', {
            detail: { agentId, data: prompt }
          }));
        }, 100);
      }
    };

    const handleInput = (e: any) => {
      const { data } = e.detail;
      const currentTab = activeTabRef.current;
      if (currentTab) {
        window.dispatchEvent(new CustomEvent('agent-tui-send-input', {
          detail: { agentId: currentTab, data }
        }));
      }
    };

    window.addEventListener('spawn-agent-tui', handleSpawn);
    window.addEventListener('send-pty-input', handleInput);
    
    return () => {
      window.removeEventListener('spawn-agent-tui', handleSpawn);
      window.removeEventListener('send-pty-input', handleInput);
    };
  }, []);

  useEffect(() => {
    if (!startingAgent || !projectPath) return;
    const separator = projectPath.includes('/') ? '/' : '\\';
    
    const promptFiles: Record<string, string> = {
      claudecode: 'claudecode.md',
      antigravity: 'antigravity.md',
      opencode: 'opencode.md',
      codex: 'codex.md',
      hermes: 'hermes.md'
    };

    const filename = promptFiles[startingAgent];
    if (!filename) return;

    const loadPrompt = async () => {
      try {
        const path = `${projectPath}${separator}.agentflow${separator}prompts${separator}${filename}`;
        const content = await invoke<string | null>('read_file_content', { path });
        if (content) {
          setDynamicPrompts(prev => ({ ...prev, [startingAgent]: content }));
        }
      } catch (err) {
        console.error(`Failed to reload prompt for ${startingAgent}:`, err);
      }
    };

    loadPrompt();
  }, [startingAgent, projectPath]);

  const confirmStartAgent = async (agentId: string) => {
    if (sessions[agentId]) return;
    
    setSessions(prev => ({
      ...prev,
      [agentId]: { sessionKey: '' } // placeholder, updated by onSessionReady
    }));
    setActiveTab(agentId);
    setStartingAgent(null);
  };

  const handleStop = async (agentId: string) => {
    const session = sessions[agentId];
    if (!session) return;
    
    try {
      await invoke('kill_pty', { sessionKey: session.sessionKey });
      setSessions(prev => {
        const next = { ...prev };
        delete next[agentId];
        return next;
      });
      
      if (activeTab === agentId) {
        const remainingAgents = Object.keys(sessions).filter(a => a !== agentId);
        if (remainingAgents.length > 0) {
          setActiveTab(remainingAgents[0]);
          setSelectedAgent(remainingAgents[0]);
        }
      }
    } catch (err) {
      console.error("Failed to stop agent PTY:", err);
    }
  };

  const togglePanel = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  const toggleMaximize = () => {
    if (!isMaximized) {
      setPreMaxState({ position, size });
      setSize({
        width: window.innerWidth - 320,
        height: window.innerHeight - 80
      });
      setPosition({
        x: 300,
        y: 60
      });
    } else {
      if (preMaxState) {
        setSize(preMaxState.size);
        setPosition(preMaxState.position);
      } else {
        setSize({ width: 600, height: 480 });
        setPosition({ x: window.innerWidth - 620, y: 60 });
      }
    }
    setIsMaximized(!isMaximized);
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
    if (sessions[agentId]) {
      setActiveTab(agentId);
    }
  };

  const activeSessionCount = Object.keys(sessions).length;
  const isSelectedRunning = !!sessions[selectedAgent];
  const selectedAgentData = AGENTS.find(a => a.id === selectedAgent);
  const startingAgentData = AGENTS.find(a => a.id === startingAgent);

  return (
    <>
      <Rnd
        size={isExpanded ? size : { width: 'auto', height: 'auto' }}
        position={isExpanded ? position : collapsedPos}
        onDragStop={(_e, d) => {
          if (isExpanded) {
            setPosition({ x: d.x, y: d.y });
          } else {
            setCollapsedPos({ x: d.x, y: d.y });
          }
        }}
        onResizeStop={(_e, _direction, ref, _delta, pos) => {
          if (isExpanded) {
            setSize({ width: ref.offsetWidth, height: ref.offsetHeight });
            setPosition(pos);
          }
        }}
        minWidth={isExpanded ? 400 : undefined}
        minHeight={isExpanded ? 300 : undefined}
        enableResizing={isExpanded && !isMaximized}
        bounds="window"
        dragHandleClassName="drag-handle"
        style={{ zIndex: 9999, display: 'block' }}
      >
        <div 
          className={`pty-panel-collapsed drag-handle ${activeSessionCount > 0 ? 'pty-panel-running-glow' : ''}`}
          onClick={togglePanel}
          style={{
            display: isExpanded ? 'none' : 'flex'
          }}
        >
          <Icons.Terminal className="pty-icon" />
          <span className="pty-panel-collapsed-text">Agent TUI</span>
          {activeSessionCount > 0 && <span className="pty-running-dot"></span>}
        </div>

        <div className={`pty-panel-expanded ${isMaximized ? 'pty-panel-maximized' : ''}`} style={{ display: isExpanded ? 'flex' : 'none', width: '100%', height: '100%' }}>
          {/* Header */}
          <div className="pty-panel-header drag-handle" style={{ cursor: isMaximized ? 'default' : 'grab' }}>
            <div className="pty-panel-controls">
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <div 
                  className="pty-agent-select"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '4px 12px', background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px',
                    cursor: 'pointer', fontSize: '13px', color: '#c0caf5',
                    userSelect: 'none', height: '28px', width: '180px', justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', color: AGENTS.find(a => a.id === selectedAgent)?.color }}>
                      {AGENTS.find(a => a.id === selectedAgent)?.icon}
                    </span>
                    <span>{AGENTS.find(a => a.id === selectedAgent)?.name}</span>
                  </div>
                  <Icons.ChevronDown style={{ width: '14px', height: '14px', opacity: 0.5, transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                </div>
                
                {isDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                    background: '#1a1b26', border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px', padding: '4px', width: '100%',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', flexDirection: 'column', gap: '2px'
                  }}>
                    {AGENTS.map(agent => (
                      <div 
                        key={agent.id}
                        onClick={() => {
                          handleAgentSelect(agent.id);
                          setIsDropdownOpen(false);
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '6px 8px', borderRadius: '4px', cursor: 'pointer',
                          fontSize: '13px', color: '#c0caf5', transition: 'background 0.2s'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', color: agent.color }}>
                          {agent.icon}
                        </span>
                        <span>{agent.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {!isSelectedRunning ? (
                <button className="pty-btn pty-btn-start" onClick={() => setStartingAgent(selectedAgent)}>
                  <Icons.Play className="w-3 h-3" /> 启动
                </button>
              ) : (
                <button className="pty-btn pty-btn-stop" onClick={() => handleStop(selectedAgent)}>
                  <Icons.Square className="w-3 h-3" /> 中断
                </button>
              )}
              
              <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)', margin: '0 8px' }}></div>
              
              <button 
                className="pty-btn-close" 
                title={layoutMode === 'tabs' ? "Switch to Grid View" : "Switch to Tabs View"}
                onClick={() => setLayoutMode(layoutMode === 'tabs' ? 'grid' : 'tabs')}
                style={{ color: layoutMode === 'grid' ? '#10b981' : 'var(--color-text-muted)' }}
              >
                <Icons.Grid className="w-4 h-4" />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="pty-btn-close" 
                title="强制重绘 (修复显示错乱)"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('agent-tui-force-redraw', { detail: { agentId: activeTabRef.current } }));
                }}
              >
                <Icons.RefreshCw className="w-4 h-4" />
              </button>
              <button className="pty-btn-close" onClick={toggleMaximize} title={isMaximized ? "Restore" : "Maximize"}>
                {isMaximized ? <Icons.Minimize2 className="w-4 h-4" /> : <Icons.Maximize2 className="w-4 h-4" />}
              </button>
              <button className="pty-btn-close" onClick={togglePanel} title="Close">
                <Icons.ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Body */}
          <div className="pty-panel-body">
            {activeSessionCount > 0 ? (
              <>
                {layoutMode === 'tabs' && (
                  <div className="pty-tabs-container">
                    {Object.keys(sessions).map(agentId => {
                      const agentData = AGENTS.find(a => a.id === agentId);
                      if (!agentData) return null;
                      const isActive = activeTab === agentId;
                      return (
                        <div 
                          key={agentId} 
                          className={`pty-tab ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            setActiveTab(agentId);
                            setSelectedAgent(agentId);
                          }}
                        >
                          <span style={{ color: agentData.color }}>{agentData.icon}</span>
                          <span>{agentData.name}</span>
                          <Icons.X 
                            className="w-3 h-3 pty-tab-close" 
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleStop(agentId);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div 
                  className={layoutMode === 'grid' ? 'pty-grid-container' : ''}
                  style={layoutMode === 'grid' ? {
                    gridTemplateColumns: activeSessionCount > 1 ? '1fr 1fr' : '1fr',
                    gridTemplateRows: activeSessionCount > 2 ? '1fr 1fr' : '1fr',
                  } : { flex: 1, position: 'relative' }}
                >
                  {Object.keys(sessions).map(agentId => {
                    const agentData = AGENTS.find(a => a.id === agentId);
                    const isActive = activeTab === agentId;
                    const isVisible = layoutMode === 'grid' || isActive;
                    
                    return (
                      <div 
                        key={agentId} 
                        className={layoutMode === 'grid' ? 'pty-grid-cell' : ''}
                        style={layoutMode === 'tabs' ? {
                          position: 'absolute', inset: 0, display: isActive ? 'flex' : 'none', flexDirection: 'column'
                        } : {}}
                      >
                        {layoutMode === 'grid' && (
                          <div className="pty-tile-header">
                            <div className="pty-tile-title">
                              <span style={{ color: agentData?.color }}>{agentData?.icon}</span>
                              {agentData?.name}
                            </div>
                            <div className="pty-tile-actions">
                              <button 
                                className="pty-btn-close" 
                                style={{ width: '20px', height: '20px', marginRight: '4px' }}
                                title="强制重绘 (修复显示错乱)"
                                onClick={() => {
                                  window.dispatchEvent(new CustomEvent('agent-tui-force-redraw', { detail: { agentId } }));
                                }}
                              >
                                <Icons.RefreshCw className="w-3 h-3" />
                              </button>
                              <button 
                                className="pty-btn-close" 
                                style={{ width: '20px', height: '20px' }}
                                onClick={() => handleStop(agentId)}
                              >
                                <Icons.X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        <div style={{ flex: 1, position: 'relative' }}>
                          <AgentTerminalInstance 
                            agentId={agentId}
                            projectPath={projectPath}
                            isActive={isVisible}
                            isExpanded={isExpanded}
                            onSessionReady={(aid, sk) => {
                              setSessions(prev => ({
                                ...prev,
                                [aid]: { ...prev[aid], sessionKey: sk }
                              }));
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="pty-empty-state">
                <div className="pty-empty-icon" style={{ color: selectedAgentData?.color }}>
                  {selectedAgentData?.icon}
                </div>
                <h3>{selectedAgentData?.name}</h3>
                <p>点击「启动」运行原生 TUI 交互界面，支持多 CLI 会话同时运行与平铺分屏排布。</p>
              </div>
            )}
          </div>

        {/* Startup prompt modal */}
        {startingAgent && startingAgentData && (
          <div className="modal-overlay" style={{ zIndex: 10000, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-card" style={{ width: '400px', backgroundColor: 'var(--bg-main)' }}>
              <div className="modal-header">
                <div className="modal-title font-bold">初始提示词 (Initial Prompt)</div>
                <button className="btn-icon-ghost" onClick={() => setStartingAgent(null)}><Icons.X /></button>
              </div>
              <div className="modal-body" style={{ padding: '16px 24px' }}>
                <div className="text-sm text-muted mb-4">
                  你可以复制以下专用于 <strong>{startingAgentData.name}</strong> 的系统提示词，以便在 TUI 启动后粘贴使用。
                </div>
                <textarea 
                  readOnly
                  className="intercept-input bg-panel" 
                  rows={8} 
                  style={{ width: '100%', marginBottom: '16px', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)' }}
                  value={dynamicPrompts[startingAgent || ''] || startingAgentData.prompt}
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => {
                    navigator.clipboard.writeText(dynamicPrompts[startingAgent || ''] || startingAgentData.prompt);
                    if ((window as any).showToast) {
                      (window as any).showToast('提示词已复制到剪贴板！', 'success');
                    } else {
                      alert('提示词已复制到剪贴板！');
                    }
                  }}>
                    <Icons.FileText className="w-4 h-4 mr-2" /> 复制
                  </button>
                  <button className="btn btn-primary" onClick={() => confirmStartAgent(startingAgent)}>
                    <Icons.Play className="w-4 h-4 mr-2" /> 确认启动
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Rnd>
    </>
  );
};
