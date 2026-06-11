import React from 'react';
import { invoke } from '@tauri-apps/api/core';

export const parseLinksOnly = (text: string) => {
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

export const parseAnsiWithLinks = (text: string) => {
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

export const renderCommentContent = (text: string, isCliAgent: boolean) => {
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

export const parseTime = (timeStr: string) => {
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

export const formatRelativeTime = (timeStr: string | Date) => {
  const date = typeof timeStr === 'string' ? parseTime(timeStr) : timeStr;
  if (isNaN(date.getTime())) return String(timeStr);

  const now = new Date();
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();

  const timePart = date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return timePart;
  } else if (isYesterday) {
    return `昨天 ${timePart}`;
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${timePart}`;
  }
};

export const getActiveAgent = (inputText: string) => {
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

export const getAgentAvatarStyle = (author: string) => {
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

export const getAgentInitials = (author: string) => {
  const authorLower = author.trim().toLowerCase();
  if (authorLower === 'user' || authorLower === 'meaghan') return 'U';
  if (authorLower === 'hermes') return 'H';
  if (authorLower === 'antigravity') return 'A';
  if (authorLower === 'codex') return 'C';
  if (authorLower === 'claudecode' || authorLower === 'claude') return 'CC';
  if (authorLower === 'opencode') return 'O';
  if (authorLower === 'mimicode') return 'M';
  return String(author).substring(0, 2).toUpperCase();
};
