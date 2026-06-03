import React, { useState } from 'react';
import { Icons } from './Icons';
import { invoke } from '@tauri-apps/api/core';

interface NewProjectWizardProps {
  onClose: () => void;
  onCreated: (path: string) => void;
}

export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({ onClose, onCreated }) => {
  const [activeStep, setActiveStep] = useState('Project Info');
  const [projectName, setProjectName] = useState('My Awesome Project');
  const [description, setDescription] = useState('前置引导智能体开发工程');
  const [location, setLocation] = useState('D:\\agentcode\\my-awesome-project');
  const [initGit, setInitGit] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const steps = ['Project Info', 'Template', 'Environment', 'Agents Setup', 'Review'];

  const handlePickFolder = async () => {
    try {
      const selected = await invoke<string>("select_directory");
      if (selected) setLocation(selected);
    } catch (e) {
      // ignore
    }
  };

  const handleNext = async () => {
    if (activeStep === 'Project Info') {
      setActiveStep('Review'); // skip template/env configuration for quick setup demo
    } else if (activeStep === 'Review') {
      setIsCreating(true);
      setCreateError('');
      try {
        // Create directory via shell command. Double quote location path to handle space.
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

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !isCreating) onClose(); }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div className="modal-card" style={{ width: '700px', height: '480px', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ fontSize: '15px', fontWeight: 600 }}>New Project Wizard</div>
          <button className="btn-icon-ghost" style={{ border: 'none' }} onClick={onClose} disabled={isCreating}><Icons.Plus style={{ transform: 'rotate(45deg)' }}/></button>
        </div>
        
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Steps sidebar left */}
          <div style={{ width: '180px', borderRight: '1px solid var(--color-border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-panel)' }}>
            {steps.map((step, idx) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: activeStep === step ? 'var(--color-primary-orange)' : 'var(--color-text-secondary)', fontWeight: activeStep === step ? 600 : 400 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: activeStep === step ? 'rgba(232, 104, 74, 0.1)' : 'var(--color-border)', fontSize: '11px', border: activeStep === step ? '1px solid var(--color-primary-orange)' : 'none' }}>
                  {idx + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          {/* Form Content right */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {activeStep === 'Project Info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '13px', marginBottom: '6px', display: 'block' }}>Project Name</label>
                  <input type="text" className="chat-input-area bg-panel" style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '8px' }} value={projectName} onChange={e => setProjectName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '13px', marginBottom: '6px', display: 'block' }}>Description</label>
                  <textarea className="chat-input-area bg-panel" rows={2} style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '8px' }} value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '13px', marginBottom: '6px', display: 'block' }}>Location</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" className="chat-input-area bg-panel" style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '4px', padding: '8px', fontSize: '12px' }} value={location} onChange={e => setLocation(e.target.value)} />
                    <button className="btn" onClick={handlePickFolder}><Icons.FolderOpen style={{ width: '14px', height: '14px' }}/></button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-panel)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '13px' }}>Initialize git repository</span>
                  <input type="checkbox" checked={initGit} onChange={e => setInitGit(e.target.checked)} />
                </div>
              </div>
            )}

            {activeStep === 'Review' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Review Configuration</h3>
                <div><strong>Project Name:</strong> {projectName}</div>
                <div><strong>Description:</strong> {description}</div>
                <div><strong>Location:</strong> {location}</div>
                <div><strong>Initialize Git:</strong> {initGit ? 'Yes' : 'No'}</div>
                <div><strong>Configured Agents:</strong> Hermes, Codex, Antigravity, Claudecode</div>
                {createError && (
                  <div style={{ color: 'var(--color-destructive)', marginTop: '8px', padding: '8px', border: '1px solid var(--color-destructive)', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                    Failed to create project: {createError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn" onClick={onClose} disabled={isCreating}>Cancel</button>
          <button className="btn btn-primary" onClick={handleNext} disabled={isCreating}>
            {activeStep === 'Review' ? (isCreating ? 'Creating...' : 'Create Project') : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
