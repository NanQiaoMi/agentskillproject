import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Icons } from '../components/Icons';

const getIconConfig = (iconType: string, roleName: string, labelName: string) => {
  const role = (roleName || '').toLowerCase();
  const label = (labelName || '').toLowerCase();
  
  if (label.includes('hermes') || role.includes('planner') || role.includes('manager') || role.includes('leader') || role.includes('pm') || iconType === 'manager') {
    return { Icon: Icons.Shield, bg: '#EF4444' };
  }
  if (label.includes('opencode') || role.includes('refactor')) {
    return { Icon: Icons.Activity, bg: '#8B5CF6' };
  }
  if (label.includes('codex') || role.includes('backend') || role.includes('后端')) {
    return { Icon: Icons.Database, bg: '#10B981' };
  }
  if (label.includes('claude') || role.includes('qa') || role.includes('test') || role.includes('测试')) {
    return { Icon: Icons.TestTube, bg: '#F59E0B' };
  }
  if (label.includes('antigravity') || role.includes('frontend') || role.includes('前端')) {
    return { Icon: Icons.Monitor, bg: '#3B82F6' };
  }

  if (role.includes('research') || role.includes('调研')) {
    return { Icon: Icons.Search, bg: '#8B5CF6' };
  }
  if (role.includes('writer') || role.includes('creat') || role.includes('撰写') || role.includes('创作者')) {
    return { Icon: Icons.PenTool, bg: '#10B981' };
  }
  if (role.includes('editor') || role.includes('review') || role.includes('审核') || role.includes('编辑')) {
    return { Icon: Icons.FileCheck, bg: '#F43F5E' };
  }
  if (role.includes('seo') || role.includes('market') || role.includes('运营') || role.includes('营销')) {
    return { Icon: Icons.TrendingUp, bg: '#6366F1' };
  }
  if (role.includes('devops') || role.includes('ops') || role.includes('运维')) {
    return { Icon: Icons.Server, bg: '#64748B' };
  }
  
  return { Icon: Icons.Code, bg: '#3B82F6' };
};

export const AgentNode = memo(({ id, data }: any) => {
  const { setNodes, setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [actualModel, setActualModel] = useState(data.model || 'gpt-4o');

  useEffect(() => {
    const updateModel = () => {
      try {
        const saved = localStorage.getItem('mimi-subagent-configs');
        if (saved) {
          const configs = JSON.parse(saved);
          const rLower = (data.role || '').toLowerCase();
          const nLower = (data.label || '').toLowerCase();

          let match = null;
          if (rLower.includes('manager') || rLower.includes('leader') || rLower.includes('pm') || rLower.includes('planner') || rLower.includes('架构') || rLower.includes('architect') || rLower.includes('负责人') || rLower.includes('owner') || rLower.includes('主控') || rLower.includes('调研') || rLower.includes('research') || nLower.includes('hermes')) {
            match = configs.find((c: any) => c.id === '1' || c.name.toLowerCase().includes('hermes') || c.role.toLowerCase().includes('manager') || c.role.toLowerCase().includes('leader'));
          } else if (rLower.includes('frontend') || rLower.includes('ui') || rLower.includes('ux') || rLower.includes('designer') || rLower.includes('前端') || rLower.includes('视觉') || rLower.includes('报告') || rLower.includes('可视化') || nLower.includes('antigravity')) {
            match = configs.find((c: any) => c.id === '2' || c.name.toLowerCase().includes('antigravity') || c.role.toLowerCase().includes('frontend'));
          } else if (rLower.includes('backend') || rLower.includes('api') || rLower.includes('database') || rLower.includes('db') || rLower.includes('后端') || rLower.includes('data') || rLower.includes('数据') || rLower.includes('采集') || rLower.includes('分析') || rLower.includes('worker') || rLower.includes('执行') || rLower.includes('writer') || rLower.includes('创作') || nLower.includes('codex')) {
            match = configs.find((c: any) => c.id === '3' || c.name.toLowerCase().includes('codex') || c.role.toLowerCase().includes('backend'));
          } else if (rLower.includes('qa') || rLower.includes('test') || rLower.includes('audit') || rLower.includes('cve') || rLower.includes('security') || rLower.includes('测试') || rLower.includes('审计') || rLower.includes('review') || rLower.includes('评审') || rLower.includes('editor') || rLower.includes('编辑') || rLower.includes('审稿') || rLower.includes('cleaner') || rLower.includes('清洗') || nLower.includes('claude') || nLower.includes('qa')) {
            match = configs.find((c: any) => c.id === '4' || c.name.toLowerCase().includes('qa') || c.name.toLowerCase().includes('claude') || c.role.toLowerCase().includes('tester') || c.role.toLowerCase().includes('auditor'));
          } else if (rLower.includes('devops') || rLower.includes('ops') || rLower.includes('deploy') || rLower.includes('docker') || rLower.includes('k8s') || rLower.includes('运维') || rLower.includes('seo') || rLower.includes('优化') || rLower.includes('specialist') || nLower.includes('devops')) {
            match = configs.find((c: any) => c.id === '5' || c.name.toLowerCase().includes('devops') || c.role.toLowerCase().includes('devops'));
          } else {
            match = configs.find((c: any) => nLower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(nLower)) || 
                    configs.find((c: any) => rLower.includes(c.role.toLowerCase()) || c.role.toLowerCase().includes(rLower));
          }

          if (match && match.model) {
            setActualModel(match.model);
            return;
          }
        }
      } catch (e) {}
      setActualModel(data.model || 'gpt-4o');
    };

    updateModel();
    window.addEventListener('mimi-subagent-configs-updated', updateModel);
    return () => window.removeEventListener('mimi-subagent-configs-updated', updateModel);
  }, [data.role, data.label, data.model]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('edit-agent-node', { detail: { id } })); }}
      style={{
        padding: '20px',
        borderRadius: '16px',
        background: '#ffffff',
        border: `1px solid ${isHovered ? '#6366f1' : '#e2e8f0'}`,
        boxShadow: isHovered 
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.08)' 
          : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        minWidth: '240px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        position: 'relative',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)'
      }}
    >
      {/* Settings Button */}
      <button
        onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('edit-agent-node', { detail: { id } })); }}
        style={{
          position: 'absolute',
          top: '-12px',
          right: '24px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#6366f1',
          color: '#ffffff',
          border: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-45deg)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)',
          zIndex: 10
        }}
        title="设置任务属性"
      >
        <Icons.Settings style={{ width: '14px', height: '14px' }} />
      </button>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: '-12px',
          right: '-12px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#f43f5e',
          color: '#ffffff',
          border: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-45deg)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transitionDelay: '0.05s',
          boxShadow: '0 2px 4px rgba(244, 63, 94, 0.3)',
          zIndex: 10
        }}
        title="删除节点"
      >
        <Icons.X style={{ width: '14px', height: '14px' }} />
      </button>

      {/* Top Edge */}
      <Handle id="top-target" type="target" position={Position.Top} style={{ left: 'calc(50% - 14px)', background: '#6366f1', width: '12px', height: '12px', border: '2px solid #ffffff', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)' }} />
      <Handle id="top-source" type="source" position={Position.Top} style={{ left: 'calc(50% + 14px)', background: '#10B981', width: '12px', height: '12px', border: '2px solid #ffffff', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)' }} />

      {/* Bottom Edge */}
      <Handle id="bottom-target" type="target" position={Position.Bottom} style={{ left: 'calc(50% - 14px)', background: '#6366f1', width: '12px', height: '12px', border: '2px solid #ffffff', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)' }} />
      <Handle id="bottom-source" type="source" position={Position.Bottom} style={{ left: 'calc(50% + 14px)', background: '#10B981', width: '12px', height: '12px', border: '2px solid #ffffff', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)' }} />

      {/* Left Edge */}
      <Handle id="left-target" type="target" position={Position.Left} style={{ top: 'calc(50% - 14px)', background: '#6366f1', width: '12px', height: '12px', border: '2px solid #ffffff', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)' }} />
      <Handle id="left-source" type="source" position={Position.Left} style={{ top: 'calc(50% + 14px)', background: '#10B981', width: '12px', height: '12px', border: '2px solid #ffffff', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)' }} />

      {/* Right Edge */}
      <Handle id="right-target" type="target" position={Position.Right} style={{ top: 'calc(50% - 14px)', background: '#6366f1', width: '12px', height: '12px', border: '2px solid #ffffff', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)' }} />
      <Handle id="right-source" type="source" position={Position.Right} style={{ top: 'calc(50% + 14px)', background: '#10B981', width: '12px', height: '12px', border: '2px solid #ffffff', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {(() => {
          const config = getIconConfig(data.icon, data.role, data.label);
          const IconComp = config.Icon;
          return (
            <div style={{ 
              width: '46px', height: '46px', borderRadius: '12px', 
              backgroundColor: config.bg,
              display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff',
              flexShrink: 0
            }}>
              <IconComp style={{ width: '22px', height: '22px' }} />
            </div>
          );
        })()}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ 
            fontSize: '17px', 
            fontWeight: 700, 
            color: '#0f172a', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            letterSpacing: '0.4px', 
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale'
          }}>
            {data.label}
          </div>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 500, 
            color: '#64748b', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            WebkitFontSmoothing: 'antialiased'
          }}>
            {data.role}
          </div>
        </div>
      </div>

      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '8px', 
        padding: '6px 10px', 
        backgroundColor: '#f1f5f9', 
        borderRadius: '6px', 
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }}></div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.5px' }}>
          {actualModel}
        </div>
      </div>
    </div>
  );
});
