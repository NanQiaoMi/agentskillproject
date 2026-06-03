# Specifications 交互化改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Specifications 下 PRD、Design 以及 API Contracts 三个页面的深度交互化改造，将其从静态 Markdown 预览升级为高品质、可操作的开发沙盒。

**Architecture:** 主控视图 [SpecificationsView.tsx](file:///d:/agentcode/mimicode-desktop/src/views/SpecificationsView.tsx) 负责读取和写入物理 Markdown 文件。当处于非编辑态时，它不再渲染静态 HTML，而是渲染对应的三个交互子组件：`PRDSection.tsx`、`DesignSection.tsx` 和 `APIContractsSection.tsx`。子组件接收 markdown 内容并通过回调将修改写回磁盘。

**Tech Stack:** React 19, TypeScript, Tauri 2 Core API, Vanilla CSS.

---

### Task 1: 创建 PRD 交互式开发面板

**Files:**
- Create: `src/components/specs/PRDSection.tsx`
- Test: 编译检查及开发运行验证
- Modify: `src/views/SpecificationsView.tsx` (在后续 Task 4 中统一接入)

- [ ] **Step 1: 新建 `PRDSection.tsx` 骨架**

编写基础结构，支持接收 markdown 内容并解析勾选列表。

```tsx
import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface PRDSectionProps {
  content: string;
  projectPath: string;
  onSave: (newContent: string) => Promise<void>;
}

export const PRDSection: React.FC<PRDSectionProps> = ({ content, projectPath, onSave }) => {
  const [toast, setToast] = useState<string | null>(null);

  // 正则解析 Markdown 并获取所有复选框列表
  const lines = content.split('\n');
  const items: { index: number; checked: boolean; text: string }[] = [];

  lines.forEach((line, idx) => {
    const match = line.match(/^(\s*)-\s+\[([ x])\]\s+(.*)$/i);
    if (match) {
      items.push({
        index: idx,
        checked: match[2].toLowerCase() === 'x',
        text: match[3].trim()
      });
    }
  });

  const total = items.length;
  const completed = items.filter(i => i.checked).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleCheckboxChange = async (lineIdx: number, currentlyChecked: boolean) => {
    const newLines = [...lines];
    const originalLine = newLines[lineIdx];
    const match = originalLine.match(/^(\s*)-\s+\[([ x])\]\s+(.*)$/i);
    if (match) {
      const indent = match[1];
      const newStatus = currentlyChecked ? ' ' : 'x';
      const text = match[3];
      newLines[lineIdx] = `${indent}- [${newStatus}] ${text}`;
      await onSave(newLines.join('\n'));
    }
  };

  const handleSyncTask = async (title: string, desc: string) => {
    try {
      setToast('正在同步任务到 AgentFlow...');
      // 默认指派给 antigravity (前端)
      await invoke('run_agentflow_cmd', {
        projectPath,
        args: ['add', '--title', `PRD需求: ${title}`, '--desc', desc || '来自 PRD 自动同步需求描述', '--assignee', 'antigravity']
      });
      setToast('🎉 成功同步为系统 Task 看板任务！');
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setToast(`❌ 同步失败: ${String(e)}`);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* 顶部进度条 */}
      <div style={{
        padding: '24px',
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-soft)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--color-text-main)' }}>
          <span className="font-semibold">PRD 需求完成进度 (Acceptance Progress)</span>
          <span className="font-bold">{completed} / {total} 已完成 ({percent}%)</span>
        </div>
        <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--color-border)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${percent}%`,
            background: 'linear-gradient(90deg, var(--color-primary-orange), #10B981)',
            borderRadius: '99px',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* 需求列表 */}
      <div className="spec-card" style={{ padding: '24px' }}>
        <h3 className="spec-subsection-title" style={{ marginTop: 0 }}>需求条目与状态同步</h3>
        {items.length === 0 ? (
          <div className="text-muted" style={{ fontSize: '13px', padding: '12px 0' }}>未检测到 PRD 需求清单条目（请使用 `- [ ]` 语法创建）。</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {items.map(item => (
              <div 
                key={item.index} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  opacity: item.checked ? 0.75 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="checkbox" 
                    checked={item.checked}
                    onChange={() => handleCheckboxChange(item.index, item.checked)}
                    style={{ 
                      accentColor: 'var(--color-primary-orange)', 
                      width: '16px', 
                      height: '16px', 
                      cursor: 'pointer' 
                    }} 
                  />
                  <span style={{ 
                    fontSize: '13px', 
                    color: 'var(--color-text-main)',
                    textDecoration: item.checked ? 'line-through' : 'none' 
                  }}>{item.text}</span>
                </div>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => handleSyncTask(item.text, `PRD 文件行号 ${item.index + 1}: ${item.text}`)}
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                >
                  同步至任务
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast 提示框 */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          backgroundColor: 'var(--bg-panel)',
          color: 'var(--color-text-main)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-card)',
          fontSize: '12px',
          zIndex: 1000
        }}>
          {toast}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: 前端编译测试，确信无 TypeScript 报错**

运行：`npm run build` 确保无编译报错。

---

### Task 2: 创建 Design 交互式设计沙盒

**Files:**
- Create: `src/components/specs/DesignSection.tsx`
- Test: 编译检查及开发运行验证
- Modify: `src/views/SpecificationsView.tsx` (在后续 Task 4 中统一接入)

- [ ] **Step 1: 新建 `DesignSection.tsx` 组件**

编写提取 HEX、组件沙盒与三态预览的逻辑。

```tsx
import React, { useState } from 'react';

interface DesignSectionProps {
  content: string;
}

export const DesignSection: React.FC<DesignSectionProps> = ({ content }) => {
  const [activeState, setActiveState] = useState<'loading' | 'empty' | 'error'>('loading');
  const [toastColor, setToastColor] = useState<string | null>(null);

  // 正则解析 HEX 颜色并去重
  const colors: string[] = [];
  const colorMatches = content.match(/#[0-9a-fA-F]{6}\b/g) || [];
  colorMatches.forEach(c => {
    const normalized = c.toLowerCase();
    if (!colors.includes(normalized)) {
      colors.push(normalized);
    }
  });

  const handleCopyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setToastColor(hex);
    setTimeout(() => setToastColor(null), 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* 智能调色板 */}
      <div className="spec-card" style={{ padding: '24px' }}>
        <h3 className="spec-subsection-title" style={{ marginTop: 0 }}>设计规范调色板 (Color Swatches)</h3>
        {colors.length === 0 ? (
          <div className="text-muted" style={{ fontSize: '13px' }}>未检测到 HEX 颜色定义（请使用 `#FFFFFF` 格式定义）。</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
            {colors.map(hex => (
              <div 
                key={hex} 
                onClick={() => handleCopyColor(hex)}
                style={{ 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden', 
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-main)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ height: '60px', backgroundColor: hex }} />
                <div style={{ padding: '10px', fontSize: '11px', textAlign: 'center', color: 'var(--color-text-main)' }}>
                  <div className="font-semibold">{hex.toUpperCase()}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '10px', marginTop: '2px' }}>
                    {toastColor === hex ? 'Copied!' : 'Click to copy'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UI 组件状态沙盒 */}
      <div className="spec-card" style={{ padding: '24px' }}>
        <h3 className="spec-subsection-title" style={{ marginTop: 0 }}>标准 UI 组件沙盒 (Interactive UI Sandbox)</h3>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: '24px', 
          padding: '24px', 
          backgroundColor: 'var(--bg-main)', 
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>Primary Button</button>
          <button className="btn" style={{ padding: '8px 16px', fontSize: '12px' }}>Secondary Button</button>
          <button className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '12px' }}>Ghost Button</button>
          <input 
            type="text" 
            className="intercept-input" 
            placeholder="Focus and type..." 
            style={{ maxWidth: '180px', padding: '6px 12px', fontSize: '12px' }}
          />
        </div>
      </div>

      {/* 三态预览面板 */}
      <div className="spec-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 className="spec-subsection-title" style={{ margin: 0 }}>规范三态预览 (Three States Previewer)</h3>
          <div style={{ display: 'flex', gap: '8px', border: '1px solid var(--color-border)', borderRadius: '99px', padding: '2px', backgroundColor: 'var(--bg-panel)' }}>
            {(['loading', 'empty', 'error'] as const).map(state => (
              <button 
                key={state}
                onClick={() => setActiveState(state)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '99px',
                  border: 'none',
                  fontSize: '11px',
                  cursor: 'pointer',
                  backgroundColor: activeState === state ? 'var(--color-primary-orange)' : 'transparent',
                  color: activeState === state ? '#FFFFFF' : 'var(--color-text-secondary)',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                {state === 'loading' ? 'Loading' : state === 'empty' ? 'Empty' : 'Error'}
              </button>
            ))}
          </div>
        </div>

        {/* 视口框 */}
        <div style={{ 
          height: '200px', 
          backgroundColor: 'var(--bg-main)', 
          border: '1px solid var(--color-border)', 
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '24px'
        }}>
          {activeState === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
              <div style={{ height: '14px', width: '40%', backgroundColor: 'var(--color-border)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
              <div style={{ height: '32px', width: '100%', backgroundColor: 'var(--color-border)', borderRadius: '6px', animation: 'pulse 1.5s infinite 0.2s' }} />
              <div style={{ height: '14px', width: '70%', backgroundColor: 'var(--color-border)', borderRadius: '4px', animation: 'pulse 1.5s infinite 0.4s' }} />
            </div>
          )}

          {activeState === 'empty' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>暂无相关配置或内容为空</span>
            </div>
          )}

          {activeState === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>网络连接异常，数据加载失败</span>
              </div>
              <button className="btn" style={{ padding: '6px 12px', fontSize: '11px' }}>点击重试 (Retry)</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 前端编译测试，确信无 TypeScript 报错**

运行：`npm run build` 确保无编译报错。

---

### Task 3: 创建 API Contracts 契约测试沙盒

**Files:**
- Create: `src/components/specs/APIContractsSection.tsx`
- Test: 编译检查及开发运行验证
- Modify: `src/views/SpecificationsView.tsx` (在后续 Task 4 中统一接入)

- [ ] **Step 1: 新建 `APIContractsSection.tsx` 组件**

编写正则解析接口定义、发送 mock 与契约 Schema 校验逻辑。

```tsx
import React, { useState } from 'react';

interface APIContractsSectionProps {
  content: string;
}

interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  requestBody: string;
  responseBody: string;
}

export const APIContractsSection: React.FC<APIContractsSectionProps> = ({ content }) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [requestTexts, setRequestTexts] = useState<Record<number, string>>({});
  const [responses, setResponses] = useState<Record<number, { status: number; body: string }>>({});
  const [validations, setValidations] = useState<Record<number, { valid: boolean; message: string }>>({});
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});

  // 从 MD 文档解析 API 定义
  // 匹配格式: - **METHOD PATH**: 紧接着请求或响应的代码块
  const endpoints: APIEndpoint[] = [];
  const lines = content.split('\n');
  let currentEp: Partial<APIEndpoint> | null = null;
  let codeBlockLines: string[] = [];
  let inCodeBlock = false;
  let blockType: 'req' | 'res' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // 匹配如 `- **POST \`/api/auth/login\`**:` 或 `- **POST \`/api/auth/login\`**`
    const methodMatch = line.match(/^-\s+\*\*(GET|POST|PUT|DELETE)\s+\`([^\`]+)\`\*\*/i);
    if (methodMatch) {
      if (currentEp && (currentEp.method || currentEp.path)) {
        endpoints.push({
          method: currentEp.method || 'GET',
          path: currentEp.path || '',
          requestBody: currentEp.requestBody || '{}',
          responseBody: currentEp.responseBody || '{}'
        });
      }
      currentEp = {
        method: methodMatch[1].toUpperCase() as any,
        path: methodMatch[2],
        requestBody: '',
        responseBody: ''
      };
      continue;
    }

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // 关闭代码块
        inCodeBlock = false;
        const blockContent = codeBlockLines.join('\n').trim();
        if (currentEp) {
          if (blockType === 'req') {
            currentEp.requestBody = blockContent;
          } else {
            currentEp.responseBody = blockContent;
          }
        }
        codeBlockLines = [];
        blockType = null;
      } else {
        inCodeBlock = true;
        // 简单区分请求和响应
        const prevText = i > 0 ? lines[i - 1].toLowerCase() : '';
        if (prevText.includes('请求') || prevText.includes('request')) {
          blockType = 'req';
        } else {
          blockType = 'res';
        }
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(lines[i]);
    }
  }

  // 压入最后一个解析项
  if (currentEp && (currentEp.method || currentEp.path)) {
    endpoints.push({
      method: currentEp.method || 'GET',
      path: currentEp.path || '',
      requestBody: currentEp.requestBody || '{}',
      responseBody: currentEp.responseBody || '{}'
    });
  }

  const handleSendRequest = (idx: number, ep: APIEndpoint) => {
    setLoadingMap(prev => ({ ...prev, [idx]: true }));
    // 模拟 500ms API 网络延时
    setTimeout(() => {
      setLoadingMap(prev => ({ ...prev, [idx]: false }));
      setResponses(prev => ({
        ...prev,
        [idx]: {
          status: 200,
          body: ep.responseBody || '{\n  "status": "success"\n}'
        }
      }));
    }, 500);
  };

  const handleValidateJson = (idx: number, text: string) => {
    const rawVal = text === undefined ? endpoints[idx].requestBody : text;
    try {
      JSON.parse(rawVal);
      setValidations(prev => ({
        ...prev,
        [idx]: { valid: true, message: 'JSON 契约校验通过 (Valid Schema)' }
      }));
    } catch (e) {
      setValidations(prev => ({
        ...prev,
        [idx]: { valid: false, message: `语法错误: ${e instanceof Error ? e.message : String(e)}` }
      }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {endpoints.length === 0 ? (
        <div className="spec-card text-muted" style={{ padding: '24px', fontSize: '13px' }}>
          未检测到标准的 API 契约声明，请按照此格式编写契约：<br/>
          <code>- **POST `/api/v1/login`**</code>
        </div>
      ) : (
        endpoints.map((ep, idx) => {
          const isExpanded = expandedIdx === idx;
          const reqVal = requestTexts[idx] !== undefined ? requestTexts[idx] : ep.requestBody;
          const isPostOrPut = ['POST', 'PUT'].includes(ep.method);
          const response = responses[idx];
          const validation = validations[idx];
          const isLoading = loadingMap[idx];

          const methodColor = ep.method === 'GET' ? '#3B82F6' : ep.method === 'POST' ? '#10B981' : '#EF4444';

          return (
            <div 
              key={idx} 
              className="spec-card" 
              style={{ 
                padding: '0', 
                overflow: 'hidden',
                borderColor: isExpanded ? 'var(--color-primary-orange)' : 'var(--color-border)',
                transition: 'border-color 0.2s'
              }}
            >
              {/* Header Toggle */}
              <div 
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                style={{ 
                  padding: '16px 20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-panel)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    color: '#FFFFFF',
                    backgroundColor: methodColor,
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>{ep.method}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{ep.path}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                  transition: 'transform 0.2s'
                }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>

              {/* Collapsible Sandbox */}
              {isExpanded && (
                <div style={{ padding: '20px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isPostOrPut ? '1fr 1fr' : '1fr', gap: '20px' }}>
                    {/* Request Column */}
                    {isPostOrPut && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Request JSON Body</span>
                          <button 
                            className="btn" 
                            onClick={() => handleValidateJson(idx, reqVal)}
                            style={{ padding: '2px 8px', fontSize: '10px' }}
                          >
                            校验格式
                          </button>
                        </div>
                        <textarea
                          value={reqVal}
                          onChange={e => setRequestTexts(prev => ({ ...prev, [idx]: e.target.value }))}
                          style={{
                            height: '180px',
                            backgroundColor: 'var(--bg-main)',
                            color: 'var(--color-text-main)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            padding: '12px',
                            resize: 'none',
                            outline: 'none'
                          }}
                        />
                        {validation && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: validation.valid ? '#10B981' : '#EF4444',
                            fontWeight: 500
                          }}>
                            {validation.message}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Response Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Response Sandbox Terminal</span>
                        {response && (
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: 600, 
                            color: '#FFFFFF',
                            backgroundColor: '#10B981',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>HTTP {response.status} OK</span>
                        )}
                      </div>
                      <div style={{
                        height: '180px',
                        backgroundColor: 'var(--bg-terminal)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        overflowY: 'auto',
                        position: 'relative'
                      }}>
                        {isLoading ? (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-muted)',
                            fontSize: '12px'
                          }}>
                            模拟接口调用中...
                          </div>
                        ) : (
                          <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>
                            {response ? response.body : '// 点击上方 "Send Request" 查看契约响应数据...'}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleSendRequest(idx, ep)}
                      disabled={isLoading}
                      style={{ padding: '6px 16px', fontSize: '12px' }}
                    >
                      Send Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
```

- [ ] **Step 2: 前端编译测试，确信无 TypeScript 报错**

运行：`npm run build` 确保无编译报错。

---

### Task 4: 重构 SpecificationsView.tsx 并接入新组件

**Files:**
- Modify: `src/views/SpecificationsView.tsx:1-835`
- Test: 整体页面调试

- [ ] **Step 1: 在 `SpecificationsView.tsx` 中导入子组件**

在文件头部引入 `PRDSection`、`DesignSection`、`APIContractsSection`：

```typescript
// Replace lines 1-17 with imports including the new subsections
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';
import { PRDSection } from '../components/specs/PRDSection';
import { DesignSection } from '../components/specs/DesignSection';
import { APIContractsSection } from '../components/specs/APIContractsSection';
```

- [ ] **Step 2: 重构主页面 `.spec-content` 的渲染分流**

修改 `SpecificationsView.tsx` 的非编辑模式核心内容输出部分。
定位原文件中的 `dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}`（原行号约 `596` 行）。如果是 `PRD`、`Design` 或 `API Contracts` 标签页，我们直接渲染对应的丰富交互小节；如果是 `Architecture`，则渲染富文本以及 SVG 拓扑图：

```tsx
// Replacement inside spec-content (around line 596):
{activeTab === 'PRD' && (
  <PRDSection 
    content={content} 
    projectPath={projectPath} 
    onSave={async (newVal) => {
      setContent(newVal);
      const filePath = getFilePath('PRD');
      await invoke('write_file_content', { path: filePath, content: newVal });
    }} 
  />
)}

{activeTab === 'Design' && (
  <DesignSection content={content} />
)}

{activeTab === 'API Contracts' && (
  <APIContractsSection content={content} />
)}

{activeTab === 'Architecture' && (
  <>
    <div dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />
    <div className="arch-diagram-container" style={{ marginTop: '32px' }}>
      {/* Existing arch-diagram markup remains */}
      ...
    </div>
  </>
)}
```

- [ ] **Step 3: 完整编译打包测试**

运行：`npm run build` 确保整体验证成功，无类型冲突，并可以在本地 Tauri 客户端中热更新渲染。
