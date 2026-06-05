import React, { useRef, useState } from 'react';
import { Icons } from '../Icons';

export const AVAILABLE_AGENTS = [
  { id: 'hermes', name: 'Hermes Agent', role: 'Planner' },
  { id: 'antigravity', name: 'Antigravity', role: 'Frontend' },
  { id: 'codex', name: 'Codex', role: 'Backend' },
  { id: 'claudecode', name: 'Claude Code', role: 'Auditor' },
  { id: 'opencode', name: 'OpenCode CLI', role: 'Refactorer' },
];

export interface ChatInputProps {
  chatInputText: string;
  setChatInputText: (val: string) => void;
  isThinking: boolean;
  thinkingAgent: string;
  isSubmitting: boolean;
  handleAttachFile: () => void;
  handleCommitInput: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  chatInputText,
  setChatInputText,
  isThinking,
  thinkingAgent,
  isSubmitting,
  handleAttachFile,
  handleCommitInput,
  handleKeyDown
}) => {
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  const handleMentionSelect = (agentName: string) => {
    const match = chatInputText.match(/@\S*$/);
    if (match) {
      setChatInputText(chatInputText.substring(0, match.index) + `@${agentName} `);
    } else {
      const separator = chatInputText && !chatInputText.endsWith(' ') ? ' ' : '';
      setChatInputText(chatInputText + separator + `@${agentName} `);
    }
    setShowMentionMenu(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
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
        <Icons.Send className="chat-input-send" onClick={handleCommitInput} style={{ cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }} />
      </div>
    </div>
  );
};
