import React from 'react';
import { Icons } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    fontSize: number;
    tabSize: number;
    wordWrap: 'on' | 'off';
    autoSave: boolean;
  };
  onSettingsChange: (key: string, value: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ width: '360px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)' }}>Settings</span>
          <button className="btn-icon-ghost" onClick={onClose} style={{ color: 'var(--color-text-muted)' }}>
            <Icons.X width={16} height={16} />
          </button>
        </div>
        
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-main)', fontWeight: 500 }}>Font Size</span>
            <input 
              type="number" 
              value={settings.fontSize} 
              onChange={e => onSettingsChange('fontSize', parseInt(e.target.value) || 14)}
              style={{ width: '80px', padding: '6px 8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-main)', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-main)', fontWeight: 500 }}>Tab Size</span>
            <select 
              value={settings.tabSize}
              onChange={e => onSettingsChange('tabSize', parseInt(e.target.value))}
              style={{ width: '80px', padding: '6px 8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-main)', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-mono)' }}
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-main)', fontWeight: 500 }}>Word Wrap</span>
            <select 
              value={settings.wordWrap}
              onChange={e => onSettingsChange('wordWrap', e.target.value)}
              style={{ width: '80px', padding: '6px 8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-main)', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-mono)' }}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-main)', fontWeight: 500 }}>Auto Save</span>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={settings.autoSave}
                onChange={e => onSettingsChange('autoSave', e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--color-primary-orange)', width: '18px', height: '18px' }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
