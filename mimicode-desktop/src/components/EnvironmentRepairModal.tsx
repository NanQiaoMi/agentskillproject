import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from './Icons';
import { EnvStatus } from '../types';

interface EnvironmentRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  envStatus: EnvStatus | null;
  projectPath: string;
  onRepairComplete: () => Promise<void>;
  language: string;
}

export const EnvironmentRepairModal: React.FC<EnvironmentRepairModalProps> = ({ 
  isOpen, onClose, envStatus, projectPath, onRepairComplete, language 
}) => {
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairLog, setRepairLog] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCn = language === '简体中文';

  // Compute what is missing
  const missingComponents: string[] = [];
  if (envStatus) {
    if (!envStatus.node_installed) missingComponents.push('Node.js');
    if (!envStatus.npm_installed) missingComponents.push('npm');
    if (!envStatus.smithery_installed) missingComponents.push('Smithery CLI');
    if (!envStatus.claude_code_installed) missingComponents.push('Claude Code CLI');
    if (!envStatus.git_installed) missingComponents.push('Git');
    if (!envStatus.python_installed) missingComponents.push('Python 3.11');
    if (!envStatus.uv_installed) missingComponents.push('uv');
  }

  const needsRepair = missingComponents.length > 0 || !envStatus;

  const handleStartRepair = async () => {
    setIsRepairing(true);
    setRepairLog(null);
    try {
      const result: string = await invoke('setup_environment', { projectPath });
      setRepairLog(result);
      await onRepairComplete();
    } catch (err: any) {
      setRepairLog(`ERROR: ${err.toString()}`);
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isRepairing) onClose() }}>
      <div className="modal-card" style={{ width: '600px' }}>
        <div className="modal-header">
          <div className="modal-title">
            Environment Repair
            <br/>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>环境修复</span>
          </div>
          {!isRepairing && (
            <button className="btn-icon-ghost" onClick={onClose}>
              <Icons.Plus style={{ transform: 'rotate(45deg)' }}/>
            </button>
          )}
        </div>
        <div className="modal-body">
          {repairLog ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ color: repairLog.startsWith('ERROR') ? 'var(--color-destructive)' : 'var(--color-success)', fontWeight: '600' }}>
                {repairLog.startsWith('ERROR') 
                  ? (isCn ? '修复过程中发生错误' : 'An error occurred during repair')
                  : (isCn ? '环境修复完成！' : 'Environment repair complete!')}
              </div>
              <div style={{ backgroundColor: 'var(--bg-panel)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
                {repairLog}
              </div>
            </div>
          ) : isRepairing ? (
            <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <Icons.Settings style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: 'var(--color-text-main)' }} />
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                {isCn ? '后台脚本正在检测并静默安装缺失组件...\n这可能需要几分钟，请耐心等待。' : 'Detecting and silently installing missing components...\nThis may take a few minutes.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                {needsRepair ? (
                  <div style={{ color: 'var(--color-text-main)', marginBottom: '8px' }}>
                    {isCn ? '检测到以下组件缺失，需要进行修复：' : 'The following components are missing and require repair:'}
                  </div>
                ) : (
                  <div style={{ color: 'var(--color-success)', marginBottom: '8px', fontWeight: 'bold' }}>
                    {isCn ? '所有依赖组件均已安装。您可以选择重新运行修复脚本。' : 'All required components are installed. You can still force a repair.'}
                  </div>
                )}
                
                {missingComponents.length > 0 && (
                  <ul style={{ paddingLeft: '20px', margin: '8px 0', color: 'var(--color-destructive)' }}>
                    {missingComponents.map(c => <li key={c}>{c}</li>)}
                  </ul>
                )}
              </div>
              
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {isCn ? '修复程序将尝试自动安装所需的环境工具并配置环境变量。' : 'The repair script will attempt to automatically install the required environment tools and configure environment variables.'}
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          {repairLog ? (
            <button className="btn btn-primary" onClick={onClose}>
              {isCn ? '完成并关闭' : 'Done & Close'}
            </button>
          ) : (
            <>
              <button className="btn" onClick={onClose} disabled={isRepairing}>
                {isCn ? '取消' : 'Cancel'}
              </button>
              <button className="btn btn-primary" onClick={handleStartRepair} disabled={isRepairing}>
                {isRepairing ? (
                  <><Icons.RefreshCw style={{ width: '14px', height: '14px', marginRight: '6px', animation: 'spin 1s linear infinite' }}/> {isCn ? '修复中...' : 'Repairing...'}</>
                ) : (
                  <>{isCn ? '开始修复' : 'Start Repair'}</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
