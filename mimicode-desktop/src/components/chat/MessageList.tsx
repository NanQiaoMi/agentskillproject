import React from 'react';
import { Icons } from '../Icons';
import { Task, HistoryItem, Comment } from '../../types';
import {
  parseTime,
  getAgentAvatarStyle,
  getAgentInitials,
  renderCommentContent,
  formatRelativeTime
} from '../../utils/chatUtils';

export interface MessageListProps {
  selectedTask?: Task | null;
  localComments: Comment[];
  isThinking: boolean;
  thinkingAgent: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  selectedTask,
  localComments,
  isThinking,
  thinkingAgent
}) => {
  const items = [
    ...(selectedTask?.history || []).map(h => ({ type: 'history', time: h.time, data: h })),
    ...(localComments || []).map(c => ({ type: 'comment', time: c.time, data: c }))
  ].sort((a, b) => parseTime(a.time).getTime() - parseTime(b.time).getTime());

  if (items.length === 0 && !isThinking) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        暂无活动记录
      </div>
    );
  }

  return (
    <>
      {items.map((item, index) => {
        const dateStr = formatRelativeTime(item.time);
        
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
      })}

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
            {thinkingAgent === 'MIMIcode' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  正在生成回答...
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
