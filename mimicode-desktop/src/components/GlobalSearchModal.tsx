import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from './Icons';
import { invoke } from '@tauri-apps/api/core';

interface SearchResultData {
  id: string;
  path: string;
  line: number;
  title: string;
  excerpt: string;
  result_type: string;
}

interface GlobalSearchModalProps {
  onClose: () => void;
  isOpen: boolean;
  projectPath?: string;
}

const getIconForType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'task': return <Icons.CheckSquare style={{ color: '#10B981' }}/>;
    case 'spec': return <Icons.BookOpen style={{ color: '#8B5CF6' }}/>;
    case 'commit': return <Icons.GitBranch style={{ color: '#F43F5E' }}/>;
    case 'code':
    case 'file':
    default:
      return <Icons.Code style={{ color: '#3B82F6' }}/>;
  }
};

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ onClose, isOpen, projectPath }) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [matchCase, setMatchCase] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [results, setResults] = useState<SearchResultData[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAdvancedClosing, setIsAdvancedClosing] = useState(false);
  const [includePath, setIncludePath] = useState('');
  const [excludePath, setExcludePath] = useState('');

  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('mimi-language') || '简体中文'; } 
    catch { return '简体中文'; }
  });

  useEffect(() => {
    const handleLangChange = (e: any) => setLanguage(e.detail);
    window.addEventListener('mimi-language-changed', handleLangChange);
    return () => window.removeEventListener('mimi-language-changed', handleLangChange);
  }, []);

  const isZh = language === '简体中文';

  const tabs = isZh 
    ? ['All', '代码', '任务', '文档', '提交', '文件'] 
    : ['All', 'Code', 'Tasks', 'Specs', 'Commits', 'Files'];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !projectPath || !query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const delayDebounceFn = setTimeout(() => {
      invoke<SearchResultData[]>('search_codebase', { 
        projectPath, 
        query, 
        matchCase, 
        isRegex 
      }).then(res => {
        setResults(res);
        setIsLoading(false);
      }).catch(err => {
        console.error(err);
        setIsLoading(false);
      });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, matchCase, isRegex, isOpen, projectPath]);

  const filteredResults = useMemo(() => {
    return results.filter(res => {
      // Advanced Filters
      if (includePath.trim()) {
        const includes = includePath.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
        if (includes.length > 0 && !includes.some(inc => res.path.toLowerCase().includes(inc))) {
          return false;
        }
      }
      if (excludePath.trim()) {
        const excludes = excludePath.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
        if (excludes.length > 0 && excludes.some(exc => res.path.toLowerCase().includes(exc))) {
          return false;
        }
      }

      // Tab Filters
      if (activeTab === 'All') return true;
      const t = activeTab.toLowerCase();
      if (t === 'code' || t === '代码') return res.result_type === 'code';
      if (t === 'tasks' || t === '任务') return res.result_type === 'task';
      if (t === 'specs' || t === '文档') return res.result_type === 'spec';
      if (t === 'files' || t === '文件') return true; // everything is a file
      if (t === 'commits' || t === '提交') return res.result_type === 'commit';
      return true;
    });
  }, [results, activeTab, includePath, excludePath]);

  useEffect(() => {
    if (filteredResults.length > 0) {
      if (!filteredResults.find(r => r.id === selectedResult?.id)) {
        setSelectedResult(filteredResults[0]);
      }
    } else {
      setSelectedResult(null);
    }
  }, [filteredResults, selectedResult]);

  const handleOpenEditor = (path: string, line: number) => {
    const fullPath = projectPath ? `${projectPath}\\${path}` : path;
    invoke('open_file_in_editor', { path: fullPath, line }).catch(console.error);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '80px', zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card fade-in-scale" style={{ width: '850px', height: '600px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* Search Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--bg-panel)' }}>
          <Icons.Search style={{ width: '18px', height: '18px', color: 'var(--color-text-muted)', marginRight: '12px' }} />
          <input 
            type="text" 
            autoFocus
            className="intercept-input" 
            style={{ border: 'none', background: 'transparent', flex: 1, fontSize: '16px', padding: 0, boxShadow: 'none' }}
            placeholder={isZh ? "搜索文件、任务、文档、代码..." : "Search files, tasks, specs, code..."}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '4px 10px', borderRadius: '16px', letterSpacing: '0.5px' }}
            >
              <span style={{ fontWeight: 800 }}>&gt;_</span> AGENT TUI
            </div>
            <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--color-border)', margin: '0 4px' }}></div>
            <div 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '24px', fontSize: '13px', fontWeight: 500, color: matchCase ? 'var(--color-primary-orange)' : 'var(--color-text-muted)', backgroundColor: matchCase ? 'rgba(249, 115, 22, 0.1)' : 'transparent', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none' }} 
              onClick={() => setMatchCase(!matchCase)}
              title="Match Case"
              className={matchCase ? '' : 'hover:bg-[var(--bg-main)]'}
            >Aa</div>
            <div 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '24px', fontSize: '13px', fontWeight: 500, color: isRegex ? 'var(--color-primary-orange)' : 'var(--color-text-muted)', backgroundColor: isRegex ? 'rgba(249, 115, 22, 0.1)' : 'transparent', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none' }} 
              onClick={() => setIsRegex(!isRegex)}
              title="Use Regular Expression"
              className={isRegex ? '' : 'hover:bg-[var(--bg-main)]'}
            >.*</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 24px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--bg-main)' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            {tabs.map(tab => (
              <div 
                key={tab} 
                style={{ 
                  fontSize: '13px', 
                  fontWeight: 500, 
                  cursor: 'pointer',
                  color: activeTab === tab ? 'var(--color-primary-orange)' : 'var(--color-text-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--color-primary-orange)' : '2px solid transparent',
                  paddingBottom: '6px',
                  marginBottom: '-9px',
                  transition: 'all 0.2s'
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
          <div 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', 
              color: showAdvanced ? 'var(--color-primary-orange)' : 'var(--color-text-muted)', 
              cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none',
              padding: '4px 8px', borderRadius: '6px',
              backgroundColor: showAdvanced ? 'rgba(249, 115, 22, 0.1)' : 'transparent'
            }} 
            className="hover:text-[var(--color-primary-orange)]"
            onClick={() => {
              if (showAdvanced && !isAdvancedClosing) {
                setIsAdvancedClosing(true);
              } else if (!showAdvanced) {
                setShowAdvanced(true);
                setIsAdvancedClosing(false);
              }
            }}
          >
            <Icons.Settings style={{ width: '14px', height: '14px', transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} /> 
            {isZh ? "高级" : "Advanced"}
          </div>
        </div>

        {/* Advanced Options Panel */}
        {(showAdvanced || isAdvancedClosing) && (
          <div 
            style={{ 
              padding: '16px 24px', backgroundColor: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--color-border)', 
              display: 'flex', gap: '16px', alignItems: 'center', 
              animation: isAdvancedClosing ? 'panelSlideUp 0.25s ease-in forwards' : 'panelSlideDown 0.35s var(--ease-spring) forwards' 
            }}
            onAnimationEnd={() => {
              if (isAdvancedClosing) {
                setShowAdvanced(false);
                setIsAdvancedClosing(false);
              }
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{isZh ? "包含路径 (逗号分隔)" : "Include Paths"}</label>
              <input 
                type="text" 
                value={includePath}
                onChange={e => setIncludePath(e.target.value)}
                placeholder="例如: src, components"
                style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{isZh ? "排除路径 (逗号分隔)" : "Exclude Paths"}</label>
              <input 
                type="text" 
                value={excludePath}
                onChange={e => setExcludePath(e.target.value)}
                placeholder="例如: node_modules, dist"
                style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
              <button 
                onClick={() => { setIncludePath(''); setExcludePath(''); }}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                className="hover:bg-[var(--bg-hover)] transition-colors"
              >
                {isZh ? "重置" : "Reset"}
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Left: Results List */}
          <div style={{ width: '300px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-panel)' }}>
            <div style={{ padding: '12px 24px', fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              {isZh ? `找到 ${filteredResults.length} 个结果` : `${filteredResults.length} result${filteredResults.length !== 1 ? 's' : ''} found`}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px', color: 'var(--color-text-muted)', fontSize: '13px', gap: '8px' }}>
                  <Icons.RefreshCw className="spin" style={{ width: '14px', height: '14px' }} />
                  {isZh ? "搜索中..." : "Searching..."}
                </div>
              ) : filteredResults.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  {isZh ? "未找到匹配项" : "No matches found"}
                </div>
              ) : (
                filteredResults.map(res => (
                  <div 
                    key={res.id}
                    onClick={() => setSelectedResult(res)}
                    style={{ 
                      padding: '12px 24px', 
                      cursor: 'pointer',
                      backgroundColor: selectedResult?.id === res.id ? 'var(--bg-main)' : 'transparent',
                      borderLeft: selectedResult?.id === res.id ? '2px solid var(--color-primary-orange)' : '2px solid transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    className="hover:bg-[var(--bg-main)]"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getIconForType(res.result_type)}
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{res.title}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', paddingLeft: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {res.path}:{res.line}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Detail Preview */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
            {selectedResult ? (
              <>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>{selectedResult.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{selectedResult.path}:{selectedResult.line}</div>
                </div>
                
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#0f172a', fontFamily: 'var(--font-mono)' }}>
                  {selectedResult.excerpt ? (
                    <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                      {/* Very basic manual highlighting for the matched query */}
                      {(() => {
                        let excerpt = selectedResult.excerpt;
                        if (excerpt.length > 2000) {
                          excerpt = excerpt.substring(0, 2000) + '\n... [content truncated for performance]';
                        }
                        if (query.trim()) {
                          try {
                            return excerpt.split(new RegExp(`(${query})`, matchCase ? 'g' : 'gi')).map((part, i) => (
                              part.toLowerCase() === query.toLowerCase() ? (
                                <span key={i} style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)', padding: '2px 4px', borderRadius: '4px', color: '#fb923c' }}>{part}</span>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            ));
                          } catch {
                            return excerpt;
                          }
                        }
                        return excerpt;
                      })()}
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>{isZh ? "无可用预览" : "No preview available"}</div>
                  )}
                </div>

                <div style={{ padding: '12px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--bg-main)' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ fontSize: '13px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f97316', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    onClick={() => handleOpenEditor(selectedResult.path, selectedResult.line)}
                  >
                    <Icons.Edit2 style={{ width: '14px', height: '14px' }} /> {isZh ? "在编辑器中打开" : "Open in Editor"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                {isZh ? "选择一个结果以预览" : "Select a result to preview"}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
