import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';
import { Task, HistoryItem, Comment } from '../types';

interface ChatViewProps {
  projectPath: string;
  selectedTask?: Task;
  chatInputText: string;
  setChatInputText: (text: string) => void;
  handleSelectDirectory: () => void;
  fetchTasks?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  projectPath,
  selectedTask,
  chatInputText,
  setChatInputText,
  handleSelectDirectory,
  fetchTasks
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!chatInputText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (selectedTask) {
        // If a task is selected, maybe add a comment (not implemented in backend yet, so just alert)
        alert("Adding comments to an existing task is not yet supported in this demo.");
      } else {
        // Create new task
        await invoke("run_agentflow_cmd", { 
          projectPath, 
          args: ["add", "--title", chatInputText, "--assignee", "antigravity"] 
        });
        setChatInputText('');
        if (fetchTasks) fetchTasks();
        alert("Task created successfully from chat!");
      }
    } catch (e: any) {
      alert("Error: " + e.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="view-container">
      {/* Chat Header */}
      <div className="main-header">
        <div className="header-left">
          <span>New Conversation</span>
          <Icons.ChevronDown style={{ color: 'var(--color-text-muted)' }} />
        </div>
        
        <div className="header-center">
          <span style={{ cursor: 'pointer' }} onClick={handleSelectDirectory}>
            {projectPath.split('\\').pop() || projectPath.split('/').pop() || "Select Project"}
          </span>
          <span className="header-center-divider">|</span>
          <Icons.GitBranch className="header-center-icon" />
          <span>main</span>
          <Icons.ChevronDown className="header-center-icon" />
        </div>
        
        <div className="header-right">
          <button className="header-icon-btn"><Icons.Sun /></button>
          <div className="user-avatar" style={{ backgroundImage: 'url(https://i.pravatar.cc/100?img=12)', backgroundSize: 'cover' }}></div>
        </div>
      </div>

      {/* Chat Content */}
      {!selectedTask ? (
        <div className="chat-welcome">
          <h1 className="welcome-title">你好，我是 <span>MIMIcode</span></h1>
          <p className="welcome-subtitle">你的本地多智能体协同开发伙伴</p>
          <div className="welcome-actions">
            <button className="action-btn" onClick={() => (window as any).setShowInterceptionModal?.(true)}>
              <Icons.Code className="action-btn-icon" /> Test Interception Modal
            </button>
            <button className="action-btn">
              <Icons.Zap className="action-btn-icon" /> Plan tasks
            </button>
            <button className="action-btn">
              <Icons.Shield className="action-btn-icon" /> Run diagnostics
            </button>
          </div>
        </div>
      ) : (
        <div className="chat-scroll-area">
          <div className="chat-welcome" style={{ padding: '0 0 24px 0', borderBottom: '1px solid var(--color-border)' }}>
            <h1 className="welcome-title" style={{ fontSize: '24px' }}>{selectedTask.title}</h1>
            <p className="welcome-subtitle" style={{ marginBottom: '16px' }}>{selectedTask.id}</p>
            <div className="welcome-actions">
              <button className="action-btn"><Icons.Zap className="action-btn-icon" /> Brainstorm</button>
              <button className="action-btn"><Icons.FileText className="action-btn-icon" /> Spec</button>
              <button className="action-btn"><Icons.Code className="action-btn-icon" /> Build</button>
              <button className="action-btn"><Icons.Shield className="action-btn-icon" /> Review</button>
            </div>
          </div>

          {(() => {
            const items = [
              ...(selectedTask.history || []).map(h => ({ type: 'history', time: h.time, data: h })),
              ...(selectedTask.comments || []).map(c => ({ type: 'comment', time: c.time, data: c }))
            ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

            if (items.length === 0) {
              return (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  暂无活动记录
                </div>
              );
            }

            return items.map((item, index) => {
              const dateStr = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
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
                      <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-agent'}`}>
                         {isUser ? 
                           <div className="user-avatar" style={{ backgroundImage: 'url(https://i.pravatar.cc/100?img=12)', backgroundSize: 'cover', width: '28px', height: '28px' }}></div> 
                           : c.author.charAt(0).toUpperCase()}
                      </div>
                      <span className="message-sender">{c.author}</span>
                      <span className="message-time">{dateStr}</span>
                    </div>
                    <div className="message-body" style={{ whiteSpace: 'pre-wrap' }}>
                      {c.comment}
                    </div>
                  </div>
                );
              }
            });
          })()}
        </div>
      )}

      {/* Input Bar */}
      <div className="chat-input-wrapper">
        <div className="chat-input-box">
          <Icons.Plus className="chat-input-icon" style={{ width: '18px', height: '18px' }} />
          <input 
            type="text" 
            className="chat-input-field" 
            placeholder="Ask anything or @agent..." 
            value={chatInputText}
            onChange={(e) => setChatInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
          <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px', marginRight: '12px' }}>@</span>
          <Icons.Send className="chat-input-send" onClick={handleSubmit} style={{ cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }} />
        </div>
      </div>
    </div>
  );
};
