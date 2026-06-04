import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { invoke } from '@tauri-apps/api/core';

interface NewProjectWizardProps {
  onClose: () => void;
  onCreated: (path: string) => void;
}

const getAgentIcon = (id: string, name: string) => {
  const baseStyle: React.CSSProperties = { color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const iconSize = '18px';
  const containerStyle = { width: '36px', height: '36px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' };

  switch(id.toLowerCase()) {
    case 'claudecode':
      return <div style={{ ...baseStyle, ...containerStyle, background: 'linear-gradient(135deg, #FF8C00 0%, #E52E71 100%)' }}><Icons.Shield style={{ width: iconSize, height: iconSize }} /></div>;
    case 'codex':
      return <div style={{ ...baseStyle, ...containerStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}><Icons.Code style={{ width: iconSize, height: iconSize }} /></div>;
    case 'hermes':
      return <div style={{ ...baseStyle, ...containerStyle, background: 'linear-gradient(135deg, #F53844 0%, #42378F 100%)' }}><Icons.Box style={{ width: iconSize, height: iconSize }} /></div>;
    case 'antigravity':
      return <div style={{ ...baseStyle, ...containerStyle, background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}><Icons.Zap style={{ width: iconSize, height: iconSize }} /></div>;
    case 'opencode':
      return <div style={{ ...baseStyle, ...containerStyle, background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}><Icons.Terminal style={{ width: iconSize, height: iconSize }} /></div>;
    default:
      return <div style={{ ...baseStyle, ...containerStyle, background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }}>{name.charAt(0).toUpperCase()}</div>;
  }
};

export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({ onClose, onCreated }) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('mimi-language') || 'en'; } 
    catch { return 'en'; }
  });

  useEffect(() => {
    const handleLanguageChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.language) {
        setLanguage(customEvent.detail.language);
      }
    };
    window.addEventListener('mimi-language-changed', handleLanguageChange);
    return () => window.removeEventListener('mimi-language-changed', handleLanguageChange);
  }, []);

  const t = (en: string, zh: string) => language === 'zh' ? zh : en;

  // Step 1: Project Info
  const [projectName, setProjectName] = useState('My Awesome Project');
  const [description, setDescription] = useState('前置引导智能体开发工程');
  const [location, setLocation] = useState('D:\\agentcode\\my-awesome-project');
  const [initGit, setInitGit] = useState(true);

  // Step 2: Template
  const [template, setTemplate] = useState('react-vite');
  
  // Step 3: Environment
  const [pkgManager, setPkgManager] = useState('npm');
  
  // Step 4: Agents Setup
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['Hermes', 'Antigravity']);

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const steps = [
    t('Project Info', '项目信息'), 
    t('Template', '选择模板'), 
    t('Environment', '运行环境'), 
    t('Agents Setup', '配置智能体'), 
    t('Review', '配置总览')
  ];

  const handlePickFolder = async () => {
    try {
      const selected = await invoke<string>("select_directory");
      if (selected) setLocation(selected);
    } catch (e) {
      // ignore
    }
  };

  const handleNext = async () => {
    if (activeStepIndex < steps.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
    } else {
      // Final Review -> Create
      setIsCreating(true);
      setCreateError('');
      try {
        const createCmd = `if not exist "${location}" mkdir "${location}"`;
        await invoke('run_shell_command', { command: createCmd, cwd: 'C:\\' });

        if (initGit) {
          await invoke('run_shell_command', { command: 'git init', cwd: location });
        }
        
        await invoke("initialize_project", { projectPath: location });
        
        onCreated(location);
        onClose();
      } catch (err: any) {
        setCreateError(err.toString());
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleBack = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex(activeStepIndex - 1);
    }
  };

  const renderStepContent = () => {
    switch(activeStepIndex) {
      case 0: // Project Info
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'viewFadeIn var(--duration-normal) var(--ease-spring) both' }} key="step0">
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>{t('Project Name', '项目名称')}</label>
              <input type="text" className="modern-input" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. My Next Startup" />
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>{t('Description', '项目描述')}</label>
              <textarea className="modern-input" rows={2} style={{ resize: 'none' }} value={description} onChange={e => setDescription(e.target.value)} placeholder={t("Brief description of your project...", "简单描述一下你的项目...")} />
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>{t('Location', '保存位置')}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className="modern-input" style={{ flex: 1, fontFamily: 'var(--font-mono)' }} value={location} onChange={e => setLocation(e.target.value)} />
                <button className="btn" onClick={handlePickFolder}><Icons.FolderOpen style={{ width: '16px', height: '16px' }}/></button>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>{t('Initialize git repository', '初始化 Git 仓库')}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t('Create an empty git repository in this project location', '在项目路径中创建一个空的 Git 仓库')}</div>
              </div>
              <label className="modern-toggle">
                <input type="checkbox" checked={initGit} onChange={e => setInitGit(e.target.checked)} />
                <span className="modern-toggle-slider"></span>
              </label>
            </div>
          </div>
        );
        
      case 1: // Template
        const templates = [
          { id: 'blank', name: t('Blank Project', '空白项目'), desc: t('Empty directory with minimal config', '没有任何配置的空文件夹'), icon: <Icons.FolderOpen/> },
          { id: 'react-vite', name: t('React + Vite', 'React + Vite 前端框架'), desc: t('Lightning fast frontend environment', '极速前端开发环境'), icon: <Icons.Monitor/> },
          { id: 'node-api', name: t('Node.js Express', 'Node.js Express 后端'), desc: t('REST API backend setup', '经典 REST API 服务端'), icon: <Icons.Server/> },
          { id: 'python-fastapi', name: t('Python FastAPI', 'Python FastAPI 后端'), desc: t('High performance Python backend', '高性能 Python 服务端'), icon: <Icons.Database/> },
        ];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'viewFadeIn var(--duration-normal) var(--ease-spring) both' }} key="step1">
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)' }}>{t('Select a Template', '选择初始模板')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {templates.map((tpl, i) => (
                <div key={tpl.id} className="settings-card" 
                     style={{ 
                       padding: '20px', cursor: 'pointer', 
                       border: template === tpl.id ? '2px solid var(--color-primary-orange)' : '1px solid var(--color-border)',
                       backgroundColor: template === tpl.id ? 'var(--color-primary-light)' : 'var(--bg-panel)',
                       boxShadow: template === tpl.id ? '0 4px 12px rgba(232, 104, 74, 0.1)' : 'none',
                       transform: template === tpl.id ? 'translateY(-2px)' : 'none',
                       transition: 'all 0.2s ease',
                       '--i': i 
                     } as React.CSSProperties}
                     onClick={() => setTemplate(tpl.id)}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      color: template === tpl.id ? 'var(--color-primary-orange)' : 'var(--color-text-secondary)',
                      padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg-main)',
                      transition: 'all 0.2s ease'
                    }}>
                      {tpl.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: template === tpl.id ? 'var(--color-primary-orange)' : 'var(--color-text-main)', marginBottom: '4px', transition: 'color 0.2s ease' }}>{tpl.name}</div>
                      <div style={{ fontSize: '12px', color: template === tpl.id ? 'rgba(232, 104, 74, 0.8)' : 'var(--color-text-muted)', transition: 'color 0.2s ease' }}>{tpl.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 2: // Environment
        const pkgManagers = ['npm', 'yarn', 'pnpm', 'bun'];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'viewFadeIn var(--duration-normal) var(--ease-spring) both' }} key="step2">
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)' }}>{t('Package Manager', '包管理器')}</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{t('Select the package manager to use for installing dependencies.', '选择项目初始化和后续安装依赖使用的包管理器。')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {pkgManagers.map((pm, i) => (
                <div key={pm} className="settings-card"
                     style={{
                       padding: '20px', cursor: 'pointer', textAlign: 'center', fontWeight: 600, fontSize: '15px',
                       border: pkgManager === pm ? '2px solid var(--color-primary-orange)' : '1px solid var(--color-border)',
                       color: pkgManager === pm ? 'var(--color-primary-orange)' : 'var(--color-text-main)',
                       backgroundColor: pkgManager === pm ? 'var(--color-primary-light)' : 'var(--bg-panel)',
                       boxShadow: pkgManager === pm ? '0 4px 12px rgba(232, 104, 74, 0.1)' : 'none',
                       transform: pkgManager === pm ? 'translateY(-2px)' : 'none',
                       transition: 'all 0.2s ease',
                       '--i': i
                     } as React.CSSProperties}
                     onClick={() => setPkgManager(pm)}>
                  {pm}
                </div>
              ))}
            </div>
          </div>
        );
        
      case 3: // Agents Setup
        const agentsList = [
          { id: 'Hermes', name: 'Hermes', role: t('System Architect', '系统架构师'), model: 'mimo-v2.5-pro' },
          { id: 'Codex', name: 'Codex', role: t('Code Generator', '代码生成器'), model: 'MiniMax-M3' },
          { id: 'Antigravity', name: 'Antigravity', role: t('Fullstack Developer', '全栈工程师'), model: 'deepseek-v4-flash' },
          { id: 'ClaudeCode', name: 'Claude Code', role: t('Code Reviewer', '代码审查员'), model: 'claude-3.5-sonnet' }
        ];
        const toggleAgent = (id: string) => {
          setSelectedAgents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        };
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'viewFadeIn var(--duration-normal) var(--ease-spring) both' }} key="step3">
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)' }}>{t('Agents Setup', '内置智能体配置')}</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{t('Select which AI agents to automatically mount for this project.', '选择将在该项目中默认挂载启动的 AI 协作智能体。')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {agentsList.map((ag, i) => {
                const isSelected = selectedAgents.includes(ag.id);
                return (
                <div key={ag.id} className="settings-card" 
                     style={{ 
                       display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px',
                       border: isSelected ? '1px solid var(--color-primary-orange)' : '1px solid var(--color-border)',
                       backgroundColor: isSelected ? 'rgba(251, 146, 60, 0.03)' : 'var(--bg-panel)',
                       transition: 'all 0.2s ease',
                       '--i': i 
                     } as React.CSSProperties}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {getAgentIcon(ag.id, ag.name)}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {ag.name}
                        <span style={{ fontSize: '11px', fontWeight: 500, backgroundColor: 'var(--bg-hover)', color: 'var(--color-text-secondary)', padding: '2px 6px', borderRadius: '4px' }}>{ag.role}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Model: {ag.model}</div>
                    </div>
                  </div>
                  <label className="modern-toggle">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleAgent(ag.id)} />
                    <span className="modern-toggle-slider"></span>
                  </label>
                </div>
              )})}
            </div>
          </div>
        );
        
      case 4: // Review
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'viewFadeIn var(--duration-normal) var(--ease-spring) both' }} key="step4">
            <div className="settings-card" style={{ padding: '24px', '--i': 0 } as React.CSSProperties}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.CheckSquare style={{ color: 'var(--color-primary-orange)' }}/> {t('Review Configuration', '检查配置详情')}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--color-border)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{t('Project Name', '项目名称')}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '14px' }}>{projectName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--color-border)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{t('Location', '保存位置')}</span>
                  <span style={{ fontWeight: 500, color: 'var(--color-text-main)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{location}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--color-border)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{t('Git Init', '初始化 Git')}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '13px' }}>{initGit ? t('Yes', '是') : t('No', '否')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--color-border)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{t('Template', '使用模板')}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '13px' }}>{template}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--color-border)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{t('Package Manager', '包管理器')}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '13px' }}>{pkgManager}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{t('Mounted Agents', '挂载智能体')}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-primary-orange)', fontSize: '13px', textAlign: 'right' }}>
                    {selectedAgents.length > 0 ? selectedAgents.join(', ') : t('None', '无')}
                  </span>
                </div>
              </div>
            </div>
            
            {createError && (
              <div style={{ color: 'var(--color-destructive)', padding: '12px 16px', border: '1px solid var(--color-destructive)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.1)', fontSize: '13px', animation: 'viewFadeIn var(--duration-fast) var(--ease-spring)' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t('Failed to create project', '创建项目失败')}</div>
                <div>{createError}</div>
              </div>
            )}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !isCreating) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-card" style={{ width: '850px', height: '560px', display: 'flex', flexDirection: 'column', animation: 'modalBounceIn var(--duration-normal) var(--ease-spring)' }}>
        <div className="modal-header" style={{ padding: '24px 32px' }}>
          <div className="modal-title" style={{ fontSize: '18px', fontWeight: 700 }}>{t('New Project Wizard', '新建项目向导')}</div>
          <button className="btn-icon-ghost" style={{ border: 'none' }} onClick={onClose} disabled={isCreating}><Icons.Plus style={{ transform: 'rotate(45deg)' }}/></button>
        </div>
        
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{ width: '220px', borderRight: '1px solid var(--color-border)', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: 'var(--bg-panel)' }}>
            {steps.map((step, idx) => {
              const isActive = activeStepIndex === idx;
              const isPassed = idx < activeStepIndex;
              
              return (
              <div key={idx} style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', 
                color: isActive ? 'var(--color-primary-orange)' : isPassed ? 'var(--color-text-main)' : 'var(--color-text-muted)', 
                fontWeight: isActive || isPassed ? 600 : 400,
                transition: 'all var(--duration-normal) var(--ease-standard)'
              }}>
                <span style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', 
                  backgroundColor: isActive ? 'var(--color-primary-orange)' : isPassed ? 'var(--color-text-main)' : 'transparent', 
                  color: isActive || isPassed ? 'white' : 'var(--color-text-muted)',
                  border: isActive || isPassed ? 'none' : '2px solid var(--color-border)', 
                  fontSize: '12px', fontWeight: 700,
                  transition: 'all var(--duration-normal) var(--ease-standard)',
                  boxShadow: isActive ? '0 0 10px rgba(232, 104, 74, 0.4)' : 'none'
                }}>
                  {isPassed ? <Icons.Check style={{ width: '14px', height: '14px' }}/> : idx + 1}
                </span>
                <span>{step}</span>
              </div>
            )})}
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', backgroundColor: 'var(--bg-main)' }}>
            {renderStepContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '20px 32px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--bg-panel)', justifyContent: 'space-between' }}>
          <button className="btn" onClick={handleBack} disabled={activeStepIndex === 0 || isCreating} style={{ opacity: activeStepIndex === 0 ? 0 : 1 }}>{t('Back', '上一步')}</button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn" onClick={onClose} disabled={isCreating}>{t('Cancel', '取消')}</button>
            <button className="btn btn-primary" onClick={handleNext} disabled={isCreating} style={{ minWidth: '120px' }}>
              {activeStepIndex === steps.length - 1 ? (isCreating ? <Icons.Loader className="spin" style={{ width: '16px' }}/> : t('Create Project', '创建项目')) : t('Next', '下一步')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
