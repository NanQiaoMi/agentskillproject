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

export interface ArchNode {
  id: string;
  title: string;
  subtitle: string;
  type: 'frontend' | 'gateway' | 'backend' | 'database' | 'cache' | 'storage';
}

const defaultNodes: ArchNode[] = [
  { id: 'frontend', title: 'Frontend', subtitle: 'React / TypeScript', type: 'frontend' },
  { id: 'gateway', title: 'API Gateway', subtitle: 'Tauri Router', type: 'gateway' },
  { id: 'backend', title: 'Backend', subtitle: 'Rust / Actix-web', type: 'backend' },
  { id: 'database', title: 'PostgreSQL', subtitle: 'Relational DB', type: 'database' },
  { id: 'cache', title: 'Redis', subtitle: 'Session & Cache', type: 'cache' },
  { id: 'storage', title: 'MinIO', subtitle: 'Object Storage', type: 'storage' }
];

const parseArchNodes = (markdown: string): ArchNode[] | null => {
  const match = markdown.match(/<!--\s*architecture_diagram\s+([\s\S]*?)\s*-->/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return null;
    } catch (e) {
      console.error("Failed to parse architecture diagram nodes json", e);
      return null;
    }
  }
  return defaultNodes;
};

const saveNodesToDoc = (currentContent: string, currentNodes: ArchNode[]) => {
  const jsonStr = JSON.stringify(currentNodes);
  const commentStr = `<!-- architecture_diagram ${jsonStr} -->`;
  
  let updatedContent = currentContent;
  const regex = /<!--\s*architecture_diagram[\s\S]*?-->/;
  if (regex.test(updatedContent)) {
    updatedContent = updatedContent.replace(regex, commentStr);
  } else {
    updatedContent = updatedContent.trim() + '\n\n' + commentStr;
  }
  return updatedContent;
};

const ArrowRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
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

## 系统架构总览 System Overview
<!-- architecture_diagram -->
设计系统的物理与逻辑拓扑结构。

## 模块设计 Modules
主要模块及其职责定义。

## 数据模型 Data Models
核心数据结构与实体模型设计。

## 技术栈 Tech Stack
项目所采用的编程语言、框架及中间件。

## 部署架构 Deployment
系统部署拓扑及生产环境要求。`
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
      // Escape quotes to prevent HTML injection and XSS
      const escapedUrl = url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      // Sanitize link URLs to prevent javascript: XSS URIs
      const sanitizedUrl = escapedUrl.trim().toLowerCase().startsWith('javascript:') ? '#' : escapedUrl;
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

const SECTIONS = [
  { title: '系统架构总览', subtitle: 'System Overview' },
  { title: '模块设计', subtitle: 'Modules' },
  { title: '数据模型', subtitle: 'Data Models' },
  { title: '技术栈', subtitle: 'Tech Stack' },
  { title: '部署架构', subtitle: 'Deployment' },
];

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
  const [nodes, setNodes] = useState<ArchNode[]>(defaultNodes);
  const [editingNode, setEditingNode] = useState<ArchNode | null>(null);
  const [hasJsonError, setHasJsonError] = useState(false);
  const [activeSection, setActiveSection] = useState('系统架构总览');

  const handleSectionClick = (title: string) => {
    setActiveSection(title);

    const container = document.querySelector('.spec-content');
    if (!container) return;

    const headings = Array.from(container.querySelectorAll('h1, h2, h3'));
    const targetHeading = headings.find(h => {
      const text = h.textContent || '';
      return text.includes(title);
    });

    if (targetHeading) {
      // Disable scroll spy during smooth scroll
      (window as any).specManualScrolling = true;
      targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Re-enable scroll spy after smooth scroll finishes (roughly 800ms)
      setTimeout(() => {
        (window as any).specManualScrolling = false;
      }, 800);
    }
  };

  // Scroll event handler for Scroll Spy
  useEffect(() => {
    if (activeTab !== 'Architecture' || isEditing || !content) return;

    const container = document.querySelector('.spec-content');
    if (!container) return;

    const handleScroll = () => {
      if ((window as any).specManualScrolling) return;

      const headings = Array.from(container.querySelectorAll('h1, h2, h3'));
      const containerRect = container.getBoundingClientRect();

      let activeSec = '系统架构总览';
      let minDistance = Infinity;

      for (const heading of headings) {
        const text = heading.textContent || '';
        const section = SECTIONS.find(sec => text.includes(sec.title));
        if (!section) continue;

        const headingRect = heading.getBoundingClientRect();
        const distance = headingRect.top - containerRect.top;

        if (distance >= -50 && distance < 200) {
          if (distance < minDistance) {
            minDistance = distance;
            activeSec = section.title;
          }
        } else if (distance < -50) {
          activeSec = section.title;
        }
      }

      setActiveSection(activeSec);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on load/render
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab, isEditing, content]);


  // Modal local states
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');
  const [modalType, setModalType] = useState<'frontend' | 'gateway' | 'backend' | 'database' | 'cache' | 'storage'>('frontend');

  useEffect(() => {
    if (editingNode) {
      setModalTitle(editingNode.title);
      setModalSubtitle(editingNode.subtitle);
      setModalType(editingNode.type);
    }
  }, [editingNode]);

  useEffect(() => {
    if (!editingNode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingNode]);
  
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
        if (res === null) {
          setContent('');
          if (activeTab === 'Architecture') {
            setNodes(defaultNodes);
            setHasJsonError(false);
          }
        } else {
          setContent(res);
          if (activeTab === 'Architecture') {
            const parsed = parseArchNodes(res);
            if (parsed === null) {
              setHasJsonError(true);
            } else {
              setNodes(parsed);
              setHasJsonError(false);
            }
          }
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
      let contentToSave = editContent;
      if (activeTab === 'Architecture') {
        const parsed = parseArchNodes(editContent);
        if (parsed === null) {
          setHasJsonError(true);
        } else {
          setNodes(parsed);
          setHasJsonError(false);
          contentToSave = saveNodesToDoc(editContent, parsed);
        }
      }
      await invoke('write_file_content', { path: filePath, content: contentToSave });
      setContent(contentToSave);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save specification content", err);
      setError(`Failed to save file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (editContent !== content) {
      const confirmCancel = window.confirm('您有未保存的修改，确定要放弃吗？');
      if (!confirmCancel) {
        return;
      }
    }
    setEditContent('');
    setIsEditing(false);
    setError(null);
  };

  const syncNodesToDisk = async (updatedNodes: ArchNode[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const filePath = getFilePath('Architecture');
      const currentContent = content || TEMPLATES['Architecture'] || '';
      const newContent = saveNodesToDoc(currentContent, updatedNodes);
      await invoke('write_file_content', { path: filePath, content: newContent });
      setContent(newContent);
    } catch (err) {
      console.error("Failed to sync diagram nodes to disk", err);
      setError(`Failed to sync diagram: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNode = () => {
    const newId = `node_${Date.now()}`;
    const newNode: ArchNode = {
      id: newId,
      title: 'New Node',
      subtitle: 'Description',
      type: 'frontend'
    };
    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    syncNodesToDisk(updatedNodes);
  };

  const handleConfirmEdit = (updatedNode: ArchNode) => {
    const updatedNodes = nodes.map(n => n.id === updatedNode.id ? updatedNode : n);
    setNodes(updatedNodes);
    setEditingNode(null);
    syncNodesToDisk(updatedNodes);
  };

  const handleDeleteNode = (nodeId: string) => {
    const updatedNodes = nodes.filter(n => n.id !== nodeId);
    setNodes(updatedNodes);
    setEditingNode(null);
    syncNodesToDisk(updatedNodes);
  };

  const showSidebar = activeTab === 'Architecture';

  const frontendNodes = nodes.filter(n => n.type === 'frontend');
  const gatewayNodes = nodes.filter(n => n.type === 'gateway');
  const backendNodes = nodes.filter(n => n.type === 'backend');
  const resourceNodes = nodes.filter(n => ['database', 'cache', 'storage'].includes(n.type));

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
                {SECTIONS.map(sec => (
                  <div 
                    key={sec.title} 
                    className={`spec-nav-item ${activeSection === sec.title ? 'active' : ''}`}
                    onClick={() => handleSectionClick(sec.title)}
                  >
                    <div className="spec-nav-title">{sec.title}</div>
                    <div className="spec-nav-subtitle">{sec.subtitle}</div>
                  </div>
                ))}
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

                  {activeTab === 'Architecture' && (
                    <div className="arch-diagram-container" style={{ marginTop: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', width: '100%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <h3 style={{ fontSize: '15px', color: 'var(--color-text-main)', fontWeight: 600, margin: 0 }}>交互式系统架构拓扑 (Interactive Topology)</h3>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>点击节点卡片编辑属性，或在此处添加新节点</span>
                        </div>
                        <button 
                          className="btn btn-primary" 
                          onClick={handleAddNode} 
                          disabled={hasJsonError}
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '12px',
                            opacity: hasJsonError ? 0.5 : 1,
                            cursor: hasJsonError ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <Icons.Plus style={{ width: '12px', height: '12px', marginRight: '6px' }} />
                          Add Node
                        </button>
                      </div>

                      {hasJsonError && (
                        <div style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 16px',
                          color: '#EF4444',
                          fontSize: '13px',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <Icons.AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                          <span>架构配置文件格式错误，请检查 ARCHITECTURE.md 尾部的 JSON 数据。已禁用架构图编辑以防数据覆盖。</span>
                        </div>
                      )}

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr',
                        alignItems: 'center',
                        gap: '16px',
                        width: '100%',
                        padding: '24px',
                        backgroundColor: 'var(--bg-main)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)'
                      }}>
                        {/* Column 1: Frontend */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Frontend</div>
                          {frontendNodes.map(node => (
                            <div 
                              key={node.id} 
                              className={`arch-node ${node.type}`} 
                              onClick={() => !hasJsonError && setEditingNode(node)} 
                              style={{ 
                                cursor: hasJsonError ? 'not-allowed' : 'pointer', 
                                opacity: hasJsonError ? 0.8 : 1 
                              }}
                            >
                              <div className="arch-node-title" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{node.title}</div>
                              <div className="arch-node-subtitle" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{node.subtitle}</div>
                            </div>
                          ))}
                          {frontendNodes.length === 0 && <div className="text-muted" style={{ fontSize: '12px', fontStyle: 'italic' }}>Empty</div>}
                        </div>

                        <ArrowRight style={{ color: 'var(--color-text-muted)' }} />

                        {/* Column 2: Gateway */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Gateway</div>
                          {gatewayNodes.map(node => (
                            <div 
                              key={node.id} 
                              className={`arch-node ${node.type}`} 
                              onClick={() => !hasJsonError && setEditingNode(node)} 
                              style={{ 
                                cursor: hasJsonError ? 'not-allowed' : 'pointer', 
                                opacity: hasJsonError ? 0.8 : 1 
                              }}
                            >
                              <div className="arch-node-title" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{node.title}</div>
                              <div className="arch-node-subtitle" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{node.subtitle}</div>
                            </div>
                          ))}
                          {gatewayNodes.length === 0 && <div className="text-muted" style={{ fontSize: '12px', fontStyle: 'italic' }}>Empty</div>}
                        </div>

                        <ArrowRight style={{ color: 'var(--color-text-muted)' }} />

                        {/* Column 3: Backend */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Backend</div>
                          {backendNodes.map(node => (
                            <div 
                              key={node.id} 
                              className={`arch-node ${node.type}`} 
                              onClick={() => !hasJsonError && setEditingNode(node)} 
                              style={{ 
                                cursor: hasJsonError ? 'not-allowed' : 'pointer', 
                                opacity: hasJsonError ? 0.8 : 1 
                              }}
                            >
                              <div className="arch-node-title" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{node.title}</div>
                              <div className="arch-node-subtitle" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{node.subtitle}</div>
                            </div>
                          ))}
                          {backendNodes.length === 0 && <div className="text-muted" style={{ fontSize: '12px', fontStyle: 'italic' }}>Empty</div>}
                        </div>

                        <ArrowRight style={{ color: 'var(--color-text-muted)' }} />

                        {/* Column 4: Resources */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Resources</div>
                          {resourceNodes.map(node => (
                            <div 
                              key={node.id} 
                              className={`arch-node ${node.type}`} 
                              onClick={() => !hasJsonError && setEditingNode(node)} 
                              style={{ 
                                cursor: hasJsonError ? 'not-allowed' : 'pointer', 
                                opacity: hasJsonError ? 0.8 : 1 
                              }}
                            >
                              <div className="arch-node-title" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{node.title}</div>
                              <div className="arch-node-subtitle" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{node.subtitle}</div>
                            </div>
                          ))}
                          {resourceNodes.length === 0 && <div className="text-muted" style={{ fontSize: '12px', fontStyle: 'italic' }}>Empty</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Editor */}
      {editingNode && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingNode(null); }}>
          <div className="modal-card" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Node</h3>
              <button 
                onClick={() => setEditingNode(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                <XIcon style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Node Name (Title)</label>
                <input 
                  type="text" 
                  className="intercept-input" 
                  value={modalTitle} 
                  onChange={(e) => setModalTitle(e.target.value)} 
                  placeholder="e.g. Frontend, PostgreSQL"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Technology Details (Subtitle)</label>
                <input 
                  type="text" 
                  className="intercept-input" 
                  value={modalSubtitle} 
                  onChange={(e) => setModalSubtitle(e.target.value)} 
                  placeholder="e.g. React / TypeScript, Relational DB"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Node Type</label>
                <select 
                  className="form-select" 
                  value={modalType} 
                  onChange={(e) => setModalType(e.target.value as any)}
                >
                  <option value="frontend">Frontend</option>
                  <option value="gateway">API Gateway</option>
                  <option value="backend">Backend</option>
                  <option value="database">Database</option>
                  <option value="cache">Cache</option>
                  <option value="storage">Storage</option>
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button 
                className="btn" 
                onClick={() => handleDeleteNode(editingNode.id)}
                style={{ 
                  color: 'var(--color-destructive)', 
                  borderColor: 'var(--color-destructive)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icons.Trash2 style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                Delete
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn" onClick={() => setEditingNode(null)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleConfirmEdit({
                    id: editingNode.id,
                    title: modalTitle,
                    subtitle: modalSubtitle,
                    type: modalType
                  })}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
