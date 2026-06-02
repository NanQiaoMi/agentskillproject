import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';

interface SpecificationsViewProps {
  projectPath: string;
}

export const SpecificationsView: React.FC<SpecificationsViewProps> = ({ projectPath }) => {
  const [activeTab, setActiveTab] = useState('Architecture'); // PRD, Design, Architecture, API Contracts
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // File path mapping
  const getFilePath = (tab: string) => {
    const filename = tab === 'API Contracts' ? 'API_CONTRACTS.md' : `${tab.toUpperCase()}.md`;
    return `${projectPath}/docs/${filename}`;
  };

  useEffect(() => {
    let active = true;

    const loadContent = async () => {
      setIsLoading(true);
      try {
        const filePath = getFilePath(activeTab);
        const res: string | null = await invoke('read_file_content', { path: filePath });
        if (!active) return;
        if (res === null) {
          setContent('');
        } else {
          setContent(res);
        }
      } catch (err) {
        if (active) {
          console.error("Failed to load specifications", err);
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

  // Reference variables to bypass unused compiler warnings until fully utilized in subsequent tasks
  if (false as boolean) {
    console.log(content, isEditing, editContent, setEditContent, isLoading);
  }

  return (
    <div className="view-container bg-main">
      <div className="view-header" style={{ paddingBottom: '0' }}>
        <div className="view-title-row" style={{ paddingBottom: '16px' }}>
          <div>
            <h1 className="view-title">Specifications</h1>
          </div>
          <div className="header-right-users">
            <div className="user-avatar" style={{ backgroundColor: '#FDE68A' }}></div>
            <div className="user-avatar" style={{ backgroundColor: '#FECACA', marginLeft: '-8px' }}></div>
          </div>
        </div>
        
        <div className="view-tabs" style={{ gap: '32px' }}>
          {['PRD', 'Design', 'Architecture', 'API Contracts'].map(tab => (
            <div 
              key={tab} 
              className={`view-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{ paddingBottom: '12px' }}
            >
              {tab}
            </div>
          ))}
        </div>
      </div>

      <div className="view-content" style={{ display: 'flex', padding: '32px', overflowY: 'auto' }}>
        {activeTab === 'PRD' && (
          <div style={{ flex: 1, paddingRight: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>PRD-001: 用户登录与权限系统</h2>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-hover)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Draft</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}><Icons.Edit2 style={{ width: '12px', height: '12px', marginRight: '6px' }}/> Edit</button>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}><Icons.FileText style={{ width: '12px', height: '12px', marginRight: '6px' }}/> Export</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '14px', lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
              <div>
                <h3 style={{ fontSize: '15px', color: 'var(--color-text-main)', fontWeight: 600, marginBottom: '8px' }}>1. 背景</h3>
                <p>随着系统用户体量的增加，我们需要建立一套更加安全、高效、易扩展的认证与授权系统。该模块是整个系统的基石，确保用户数据隔离与安全的API调用权限。</p>
              </div>
              <div>
                <h3 style={{ fontSize: '15px', color: 'var(--color-text-main)', fontWeight: 600, marginBottom: '8px' }}>2. 目标</h3>
                <p>允许用户使用邮箱密码以及第三方（GitHub/Google）授权登录。支持基于角色的权限控制（RBAC），实现精细化前端组件渲染和后端路由守卫。</p>
              </div>
              <div>
                <h3 style={{ fontSize: '15px', color: 'var(--color-text-main)', fontWeight: 600, marginBottom: '8px' }}>3. 功能需求</h3>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>用户账户管理（注册、登录、重置密码）。</li>
                  <li>支持 OAuth 2.0 第三方接入。</li>
                  <li>细粒度的角色定义与路由拦截中间件。</li>
                  <li>敏感接口调用频次限制（Rate Limiting）。</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Architecture' && (
          <>
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
            
            <div className="spec-content">
              <h2 className="spec-section-title">系统架构总览</h2>
              <p className="spec-section-desc text-muted">前端由 React 驱动，后端采用 FastAPI 微服务架构，配合 Redis 和 PostgreSQL 进行状态 and 数据管理。</p>
              
              <div className="arch-diagram-container">
                <div className="arch-row">
                  <div className="arch-node">
                    <div className="arch-node-title">Frontend</div>
                    <div className="arch-node-subtitle">(React)</div>
                  </div>
                  <Icons.ArrowLeft className="arch-arrow" style={{ transform: 'rotate(180deg)' }} />
                  <div className="arch-node">
                    <div className="arch-node-title">API Gateway</div>
                  </div>
                  <Icons.ArrowLeft className="arch-arrow" style={{ transform: 'rotate(180deg)' }} />
                  <div className="arch-node">
                    <div className="arch-node-title">Backend</div>
                    <div className="arch-node-subtitle">(FastAPI)</div>
                  </div>
                </div>
                
                <div className="arch-connections-vertical">
                   <div className="arch-conn-line"></div>
                   <div className="arch-conn-line"></div>
                   <div className="arch-conn-line"></div>
                </div>

                <div className="arch-row">
                  <div className="arch-node database">
                    <div className="arch-node-title">PostgreSQL</div>
                    <div className="arch-node-subtitle">(DB)</div>
                  </div>
                  <div className="arch-node cache">
                    <div className="arch-node-title">Redis</div>
                    <div className="arch-node-subtitle">(Cache)</div>
                  </div>
                  <div className="arch-node storage">
                    <div className="arch-node-title">MinIO</div>
                    <div className="arch-node-subtitle">(Storage)</div>
                  </div>
                </div>
              </div>
              
              <h3 className="spec-subsection-title" style={{ marginTop: '48px' }}>技术选型</h3>
              <div className="tech-stack-list">
                <div className="tech-item"><span className="tech-label">Frontend:</span> <span className="tech-value">React 18 + TypeScript + Vite</span></div>
                <div className="tech-item"><span className="tech-label">Backend:</span> <span className="tech-value">Python FastAPI</span></div>
                <div className="tech-item"><span className="tech-label">Database:</span> <span className="tech-value">PostgreSQL 15</span></div>
                <div className="tech-item"><span className="tech-label">Cache:</span> <span className="tech-value">Redis 7</span></div>
                <div className="tech-item"><span className="tech-label">Storage:</span> <span className="tech-value">MinIO</span></div>
              </div>
            </div>
          </>
        )}

        {activeTab !== 'PRD' && activeTab !== 'Architecture' && (
          <div style={{ flex: 1, color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Specification content for {activeTab} is currently being drafted.
          </div>
        )}
      </div>
    </div>
  );
};
