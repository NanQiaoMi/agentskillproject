import React, { useState, useMemo, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface PRDSectionProps {
  content: string;
  projectPath: string;
  onSave: (newContent: string) => Promise<void>;
}

interface PRDItem {
  index: number;
  checked: boolean;
  text: string;
}

export const PRDSection: React.FC<PRDSectionProps> = ({ content, projectPath, onSave }) => {
  const [toast, setToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingItems, setSyncingItems] = useState<Record<number, boolean>>({});
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  
  const toastTimeoutRef = useRef<any>(null);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (message: string, duration = 3000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  };

  // Memoize markdown parsing to avoid blocking the main thread on every state change
  const { items, lines } = useMemo(() => {
    const linesArray = content.split('\n');
    const parsedItems: PRDItem[] = [];
    let inCodeBlock = false;

    linesArray.forEach((line, idx) => {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return;
      }
      if (inCodeBlock) return;

      const match = line.match(/^(\s*)-\s+\[([ x])\]\s+(.*)$/i);
      if (match) {
        parsedItems.push({
          index: idx,
          checked: match[2].toLowerCase() === 'x',
          text: match[3].trim()
        });
      }
    });

    return { items: parsedItems, lines: linesArray };
  }, [content]);

  const total = items.length;
  const completed = items.filter(i => i.checked).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleCheckboxChange = async (lineIdx: number, currentlyChecked: boolean) => {
    if (isSaving) return; // Prevent concurrent saves causing race conditions
    
    setIsSaving(true);
    try {
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
    } catch (e) {
      showToast(`❌ 保存状态失败: ${String(e)}`, 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncTask = async (itemIndex: number, title: string, desc: string) => {
    if (syncingItems[itemIndex]) return;
    
    setSyncingItems(prev => ({ ...prev, [itemIndex]: true }));
    showToast('正在同步任务到 AgentFlow...');
    try {
      await invoke('run_agentflow_cmd', {
        projectPath,
        args: [
          'add', 
          '--title', `PRD需求: ${title}`, 
          '--desc', desc || '来自 PRD 自动同步需求描述', 
          '--assignee', 'antigravity'
        ]
      });
      showToast('🎉 成功同步为 system Task 看板任务！');
    } catch (e) {
      showToast(`❌ 同步失败: ${String(e)}`, 4000);
    } finally {
      setSyncingItems(prev => ({ ...prev, [itemIndex]: false }));
    }
  };

  const handleBulkSync = async () => {
    const uncheckedItems = items.filter(i => !i.checked);
    if (uncheckedItems.length === 0 || isBulkSyncing) return;

    setIsBulkSyncing(true);
    showToast(`正在同步 ${uncheckedItems.length} 个任务到 AgentFlow...`);
    
    try {
      for (const item of uncheckedItems) {
        await invoke('run_agentflow_cmd', {
          projectPath,
          args: [
            'add', 
            '--title', `PRD需求: ${item.text}`, 
            '--desc', `PRD 文件行号 ${item.index + 1}: ${item.text}`, 
            '--assignee', 'antigravity'
          ]
        });
      }
      showToast(`🎉 成功同步 ${uncheckedItems.length} 个任务至系统 Task 看板！`);
    } catch (e) {
      showToast(`❌ 同步失败: ${String(e)}`, 4000);
    } finally {
      setIsBulkSyncing(false);
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
            background: 'linear-gradient(90deg, var(--color-primary-orange), var(--color-success, #10B981))',
            borderRadius: '99px',
            transition: 'width 0.4s ease',
            boxShadow: '0 0 8px rgba(232, 104, 74, 0.4)'
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
                    disabled={isSaving}
                    onChange={() => handleCheckboxChange(item.index, item.checked)}
                    style={{ 
                      accentColor: 'var(--color-primary-orange)', 
                      width: '16px', 
                      height: '16px', 
                      cursor: isSaving ? 'not-allowed' : 'pointer' 
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
                  disabled={syncingItems[item.index]}
                  onClick={() => handleSyncTask(item.index, item.text, `PRD 文件行号 ${item.index + 1}: ${item.text}`)}
                  style={{ 
                    padding: '4px 10px', 
                    fontSize: '11px',
                    opacity: syncingItems[item.index] ? 0.6 : 1,
                    cursor: syncingItems[item.index] ? 'not-allowed' : 'pointer'
                  }}
                >
                  {syncingItems[item.index] ? '正在同步...' : '同步至任务'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 一键任务同步卡片 */}
      {total > 0 && (
        <div className="spec-card" style={{
          padding: '24px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--bg-panel)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                Sync to Tasks (一键任务同步)
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                {items.filter(i => !i.checked).length > 0 
                  ? `检测到有 ${items.filter(i => !i.checked).length} 项需求尚未完成，可一键批量同步至 Task 看板。` 
                  : '所有需求均已完成，太棒了！'}
              </p>
            </div>
            <button
              className="btn btn-primary"
              disabled={items.filter(i => !i.checked).length === 0 || isBulkSyncing}
              onClick={handleBulkSync}
              style={{
                backgroundColor: (items.filter(i => !i.checked).length === 0 || isBulkSyncing) ? 'var(--color-border)' : 'var(--color-primary-orange)',
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: (items.filter(i => !i.checked).length === 0 || isBulkSyncing) ? 'not-allowed' : 'pointer',
                opacity: (items.filter(i => !i.checked).length === 0 || isBulkSyncing) ? 0.6 : 1,
                transition: 'all 0.2s ease',
                boxShadow: (items.filter(i => !i.checked).length === 0 || isBulkSyncing) ? 'none' : '0 4px 12px rgba(232, 104, 74, 0.2)'
              }}
            >
              {isBulkSyncing ? '正在同步...' : 'Sync Uncompleted Items (同步未完成项)'}
            </button>
          </div>
        </div>
      )}

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
