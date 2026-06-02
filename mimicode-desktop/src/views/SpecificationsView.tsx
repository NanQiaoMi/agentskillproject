import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';

// Custom X icon since it's not defined in components/Icons.tsx
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const TEMPLATES: Record<string, string> = {
  PRD: `# PRD-001: 用户登录与权限系统

## 1. 背景与定位
系统需要一套安全、高效、易扩展的认证与授权系统，作为整个平台的安全基石。

## 2. MVP 核心功能
- [ ] 账号密码注册与登录。
- [ ] 第三方 OAuth2（GitHub/Google）接入。
- [ ] 基于角色的权限控制 (RBAC)。

## 3. 非目标 (Out of Scope)
- [ ] 手机验证码短信登录。
- [ ] 多因子认证 (MFA)。

## 4. 验收标准
- [ ] 用户可以使用邮箱密码注册成功，并在后台数据库中加密保存。`,

  Design: `# UI/UX 视觉设计规范

## 1. 视觉风格与色调
- 主背景色：深灰色 Zinc-950 (\`#09090b\`)
- 板块背景：毛玻璃面板 Zinc-900 (\`#18181b\`, 不透明度 80%)
- 强调/提示色：柔和绿 (\`#10B981\`)，朱红 (\`#EF4444\`)

## 2. 组件样式规范
- 按钮：默认使用 \`.btn\`，主操作使用 \`.btn-primary\`。

## 3. 三态展示 (Three States)
- [ ] 加载状态 (Loading)
- [ ] 空数据状态 (Empty)
- [ ] 网络报错状态 (Error)`,

  'API Contracts': `# API 契约与数据模型约定

## 1. 用户认证 API
- **POST \`/api/auth/login\`**:
  - 请求：\`{ "email": "...", "password": "..." }\`
  - 响应：\`{ "token": "...", "expires_at": "..." }\``,

  Architecture: `# 系统架构设计说明

## 1. 架构与组件
<!-- architecture_diagram -->
设计系统的物理与逻辑拓扑结构。`
};

const parseMarkdown = (md: string): string => {
  if (!md) return '<div class="text-muted" style="padding:20px;text-align:center;">此规范文档目前为空，点击编辑以添加内容。</div>';
  
  // Hide embedded json diagram
  let cleanMd = md.replace(/<!--\s*architecture_diagram[\s\S]*?-->/g, '');
  
  // 1. Escape HTML tags right after stripping out architecture_diagram (XSS Prevention)
  let text = cleanMd.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Normalize windows newlines
  text = text.replace(/\r\n/g, '\n');

  // Prefix salt for code blocks (Regex Placeholder Salting)
  const salt = Math.random().toString(36).substring(2, 9);
  const getPlaceholder = (idx: number) => `__CODE_BLOCK_${salt}_${idx}__`;

  // 2. Extract code blocks
  const codeBlocks: string[] = [];
  text = text.replace(/```(.*?)\n([\s\S]*?)```/g, (_, lang, codeContent) => {
    const placeholder = getPlaceholder(codeBlocks.length);
    // Escape & that are not part of basic entities (like lt, gt, amp, quot, apos) to prevent double-escaping
    const escapedCode = codeContent.replace(/&(?!lt;|gt;|amp;|quot;|apos;)/g, '&amp;');
    
    const html = `<pre style="background-color: var(--bg-terminal); color: #E2E8F0; padding: 16px; border-radius: var(--radius-md); overflow-x: auto; font-family: var(--font-mono); font-size: 13px; margin: 16px 0; border: 1px solid var(--color-border);"><code class="language-${lang || ''}">${escapedCode}</code></pre>`;
    codeBlocks.push(html);
    return `\n\n${placeholder}\n\n`;
  });

  // Preprocess input text to ensure headers and lists are parsed correctly as block elements (Heading/List Spacing Preprocessing)
  text = text.replace(/^(#+ .*?)$/gm, '\n\n$1\n\n');
  text = text.replace(/^(- .*?)$/gm, '\n\n$1\n\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  // 3. Perform other markdown conversions
  let html = text
    .replace(/^# (.*?)$/gm, '<h1 class="markdown-h1" style="font-size: 20px; font-weight: 600; color: var(--color-text-main); margin-bottom: 16px; border-bottom: 1px solid var(--color-border); padding-bottom: 8px; margin-top: 16px;">$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2 class="markdown-h2" style="font-size: 16px; font-weight: 600; color: var(--color-text-main); margin-top: 24px; margin-bottom: 12px;">$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3 class="markdown-h3" style="font-size: 14px; font-weight: 600; color: var(--color-text-main); margin-top: 16px; margin-bottom: 8px;">$1</h3>')
    .replace(/^- \[ \] (.*?)$/gm, '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><input type="checkbox" disabled style="accent-color:var(--color-primary-orange)" /><span>$1</span></div>')
    .replace(/^- \[x\] (.*?)$/gm, '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;opacity:0.6;text-decoration:line-through;"><input type="checkbox" checked disabled style="accent-color:var(--color-primary-orange)" /><span>$1</span></div>')
    .replace(/^- (.*?)$/gm, '<li style="margin-left: 20px; margin-bottom: 6px; color: var(--color-text-secondary);">$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--color-text-main); font-weight: 600;">$1</strong>')
    .replace(/`(.*?)`/g, '<code style="font-family: var(--font-mono); font-size: 12px; background-color: var(--bg-hover); padding: 2px 6px; border-radius: 4px; color: var(--color-primary-orange);">$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, (_, linkText, url) => {
      // Sanitize link URLs to prevent javascript: XSS URIs
      const sanitizedUrl = url.trim().toLowerCase().startsWith('javascript:') ? '#' : url;
      return `<a href="${sanitizedUrl}" target="_blank" style="color: var(--color-primary-orange); text-decoration: none;">${linkText}</a>`;
    });

  // 4. Paragraph wrapping for loose lines
  html = html.split('\n\n').map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<div') || trimmed.startsWith('<li') || trimmed.startsWith('<pre') || trimmed.startsWith('<ul') || trimmed.startsWith(`__CODE_BLOCK_${salt}_`)) {
      return trimmed;
    }
    return `<p style="margin-bottom: 12px; line-height: 1.6; color: var(--color-text-secondary);">${trimmed}</p>`;
  }).join('\n');

  // 5. Restore code blocks
  codeBlocks.forEach((codeHtml, idx) => {
    const placeholder = getPlaceholder(idx);
    html = html.replace(placeholder, codeHtml);
  });

  return html;
};

interface SpecificationsViewProps {
  projectPath: string;
}

export const SpecificationsView: React.FC<SpecificationsViewProps> = ({ projectPath }) => {
  const [activeTab, setActiveTab] = useState('Architecture'); // PRD, Design, Architecture, API Contracts
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File path mapping
  const getFilePath = (tab: string) => {
    const filename = tab === 'API Contracts' ? 'API_CONTRACTS.md' : `${tab.toUpperCase()}.md`;
    return `${projectPath}/docs/${filename}`;
  };

  useEffect(() => {
    let active = true;

    const loadContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const filePath = getFilePath(activeTab);
        const res: string | null = await invoke('read_file_content', { path: filePath });
        if (!active) return;
        if (res === null || res === 'FILE_NOT_FOUND') {
          setContent('');
        } else {
          setContent(res);
        }
      } catch (err) {
        if (active) {
          console.error("Failed to load specifications", err);
          setError(`Failed to load file: ${err instanceof Error ? err.message : String(err)}`);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadContent();
    setIsEditing(false);

    return () => {
      active = false;
    };
  }, [activeTab, projectPath]);

  const handleEditClick = () => {
    setIsEditing(true);
    setError(null); // Clear errors when editing begins
    if (!content || content.trim() === '') {
      setEditContent(TEMPLATES[activeTab] || '');
    } else {
      setEditContent(content);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filePath = getFilePath(activeTab);
      await invoke('write_file_content', { path: filePath, content: editContent });
      setContent(editContent);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save specification content", err);
      setError(`Failed to save file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditContent('');
    setIsEditing(false);
    setError(null);
  };

  const showSidebar = activeTab === 'Architecture';

  return (
    <div className="view-container bg-main" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div className="animate-spin" style={{
            width: '24px',
            height: '24px',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-primary-orange)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#EF4444',
          padding: '10px 16px',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icons.AlertTriangle style={{ width: '14px', height: '14px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError(null)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'inherit', 
              cursor: 'pointer', 
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
          >
            <XIcon style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      )}

      <div className="view-header" style={{ paddingBottom: '0' }}>
        <div className="view-title-row" style={{ paddingBottom: '16px' }}>
          <div>
            <h1 className="view-title">Specifications</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="header-right-users" style={{ display: 'flex' }}>
              <div className="user-avatar" style={{ backgroundColor: '#FDE68A' }}></div>
              <div className="user-avatar" style={{ backgroundColor: '#FECACA', marginLeft: '-8px' }}></div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              {isEditing ? (
                <>
                  <button className="btn btn-primary" onClick={handleSave} style={{ padding: '6px 12px', fontSize: '12px' }}>
                    <Icons.Check style={{ width: '12px', height: '12px', marginRight: '6px' }} />
                    Save
                  </button>
                  <button className="btn btn-ghost" onClick={handleCancel} style={{ padding: '6px 12px', fontSize: '12px' }}>
                    <XIcon style={{ width: '12px', height: '12px', marginRight: '6px' }} />
                    Cancel
                  </button>
                </>
              ) : (
                <button className="btn btn-ghost" onClick={handleEditClick} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  <Icons.Edit2 style={{ width: '12px', height: '12px', marginRight: '6px' }} />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="view-tabs" style={{ gap: '32px' }}>
          {['PRD', 'Design', 'Architecture', 'API Contracts'].map(tab => (
            <div 
              key={tab} 
              className={`view-tab ${activeTab === tab ? 'active' : ''} ${isEditing ? 'disabled' : ''}`}
              onClick={() => !isEditing && setActiveTab(tab)}
              style={{ 
                paddingBottom: '12px',
                cursor: isEditing ? 'not-allowed' : 'pointer',
                opacity: isEditing && activeTab !== tab ? 0.5 : 1
              }}
            >
              {tab}
            </div>
          ))}
        </div>
      </div>

      <div className="view-content" style={{ display: 'flex', flex: 1, overflow: isEditing ? 'hidden' : 'auto' }}>
        {isEditing ? (
          <div style={{ display: 'flex', flex: 1, gap: '24px', padding: '24px', overflow: 'hidden' }}>
            {/* Left Column: Textarea Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  flex: 1,
                  width: '100%',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  padding: '16px',
                  backgroundColor: 'var(--bg-panel)',
                  color: 'var(--color-text-main)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  resize: 'none',
                  outline: 'none',
                }}
                placeholder="Start writing standard Markdown here..."
              />
            </div>

            {/* Right Column: Live Preview */}
            <div className="spec-card" style={{ 
              flex: 1, 
              overflowY: 'auto', 
              height: '100%', 
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-soft)'
            }}>
              <div dangerouslySetInnerHTML={{ __html: parseMarkdown(editContent) }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            {showSidebar && (
              <div className="spec-sidebar">
                <div className="spec-nav-item active">
                  <div className="spec-nav-title">系统架构总览</div>
                  <div className="spec-nav-subtitle">System Overview</div>
                </div>
                <div className="spec-nav-item">
                  <div className="spec-nav-title">模块设计</div>
                  <div className="spec-nav-subtitle">Modules</div>
                </div>
                <div className="spec-nav-item">
                  <div className="spec-nav-title">数据模型</div>
                  <div className="spec-nav-subtitle">Data Models</div>
                </div>
                <div className="spec-nav-item">
                  <div className="spec-nav-title">技术栈</div>
                  <div className="spec-nav-subtitle">Tech Stack</div>
                </div>
                <div className="spec-nav-item">
                  <div className="spec-nav-title">部署架构</div>
                  <div className="spec-nav-subtitle">Deployment</div>
                </div>
              </div>
            )}
            
            <div className="spec-content" style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {!content ? (
                <div style={{
                  margin: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  color: 'var(--color-text-muted)',
                  fontSize: '14px'
                }}>
                  <Icons.FileText style={{ width: '48px', height: '48px', opacity: 0.5 }} />
                  <span>文档未创建或为空。点击编辑即可使用模版开始编写。</span>
                  <button className="btn btn-primary" onClick={handleEditClick} style={{ padding: '8px 20px', fontSize: '13px' }}>
                    <Icons.Plus style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                    使用模版创建
                  </button>
                </div>
              ) : (
                <div 
                  className={activeTab !== 'Architecture' ? 'spec-card' : ''} 
                  style={activeTab !== 'Architecture' ? {
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '32px',
                    boxShadow: 'var(--shadow-soft)',
                    maxWidth: '900px',
                    width: '100%',
                    margin: '0 auto'
                  } : {
                    maxWidth: '900px',
                    width: '100%'
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
