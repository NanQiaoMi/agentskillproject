import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Icons } from '../components/Icons';

const getIconConfig = (iconType: string, roleName: string, labelName: string) => {
  const role = (roleName || '').toLowerCase();
  const label = (labelName || '').toLowerCase();
  
  if (label.includes('hermes') || role.includes('planner') || role.includes('manager') || role.includes('leader') || role.includes('pm') || iconType === 'manager') {
    return { Icon: Icons.Shield, bg: '#993333' }; // Darker red
  }
  if (label.includes('opencode') || role.includes('refactor')) {
    return { Icon: Icons.Activity, bg: '#663399' }; // Darker purple
  }
  if (label.includes('codex') || role.includes('backend') || role.includes('后端')) {
    return { Icon: Icons.Database, bg: '#338066' }; // Darker green
  }
  if (label.includes('claude') || role.includes('qa') || role.includes('test') || role.includes('测试')) {
    return { Icon: Icons.TestTube, bg: '#996633' }; // Darker orange/brown
  }
  if (label.includes('antigravity') || role.includes('frontend') || role.includes('前端')) {
    return { Icon: Icons.Monitor, bg: '#336699' }; // Darker blue
  }

  if (role.includes('research') || role.includes('调研')) {
    return { Icon: Icons.Search, bg: '#663399' };
  }
  if (role.includes('writer') || role.includes('creat') || role.includes('撰写') || role.includes('创作者')) {
    return { Icon: Icons.PenTool, bg: '#338066' };
  }
  if (role.includes('editor') || role.includes('review') || role.includes('审核') || role.includes('编辑')) {
    return { Icon: Icons.FileCheck, bg: '#993344' };
  }
  if (role.includes('seo') || role.includes('market') || role.includes('运营') || role.includes('营销')) {
    return { Icon: Icons.TrendingUp, bg: '#444499' };
  }
  if (role.includes('devops') || role.includes('ops') || role.includes('运维')) {
    return { Icon: Icons.Server, bg: '#555566' };
  }
  
  return { Icon: Icons.Code, bg: '#336699' };
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('edit-agent-node', { detail: { id } }));
  };

  const config = getIconConfig(data.icon, data.role, data.label);
  const IconComp = config.Icon;

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
      style={{
        background: '#282828',
        borderRadius: '8px',
        boxShadow: isHovered ? '0 0 0 2px #E0E0E0, 0 8px 16px rgba(0,0,0,0.6)' : '0 4px 10px rgba(0,0,0,0.5)',
        width: '240px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible', // To allow handles to be visible
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Header */}
      <div style={{
        background: config.bg,
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid #1A1A1A'
      }}>
        <IconComp style={{ width: '16px', height: '16px', color: '#FFFFFF', flexShrink: 0 }} />
        <div style={{
          flex: 1,
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
        }}>
          {data.label || 'Agent'}
        </div>

        {/* Action Buttons in Header */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleDoubleClick}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isHovered ? 0.8 : 0,
              transition: 'opacity 0.2s',
            }}
            title="Settings"
          >
            <Icons.Settings style={{ width: '14px', height: '14px' }} />
          </button>
          <button
            onClick={handleDelete}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isHovered ? 0.8 : 0,
              transition: 'opacity 0.2s',
            }}
            title="Delete Node"
          >
            <Icons.X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative'
      }}>

        {/* Input Row */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <Handle 
            id="target-input"
            type="target" 
            position={Position.Left} 
            style={{ 
              left: '-18px', 
              width: '12px', 
              height: '12px', 
              background: '#63B3ED', // Light blue input handle
              border: '2px solid #282828',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10
            }} 
          />
          <div style={{ color: '#E2E8F0', fontSize: '13px', marginLeft: '4px' }}>
            Dependencies
          </div>
        </div>

        {/* Role Inline Property */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: '#A0AEC0', fontSize: '12px' }}>Role</div>
          <div style={{ 
            color: '#E2E8F0', 
            fontSize: '12px', 
            maxWidth: '120px', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            textAlign: 'right'
          }}>
            {data.role || 'Agent'}
          </div>
        </div>

        {/* Model Dropdown Inline Property */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: '#A0AEC0', fontSize: '12px' }}>Model</div>
          <select
            value={actualModel}
            onChange={(e) => setActualModel(e.target.value)}
            style={{
              background: '#1A202C',
              color: '#E2E8F0',
              border: '1px solid #4A5568',
              borderRadius: '4px',
              padding: '4px 6px',
              fontSize: '12px',
              width: '120px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value={actualModel}>{actualModel}</option>
            {actualModel !== 'gpt-4o' && <option value="gpt-4o">gpt-4o</option>}
            {actualModel !== 'claude-3-5-sonnet-20240620' && <option value="claude-3-5-sonnet-20240620">claude-3-5-sonnet-20240620</option>}
            {actualModel !== 'gemini-1.5-pro' && <option value="gemini-1.5-pro">gemini-1.5-pro</option>}
            {actualModel !== 'deepseek-coder' && <option value="deepseek-coder">deepseek-coder</option>}
          </select>
        </div>

        {/* Output Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative', marginTop: '4px' }}>
          <div style={{ color: '#E2E8F0', fontSize: '13px', marginRight: '4px' }}>
            Result
          </div>
          <Handle 
            id="source-output"
            type="source" 
            position={Position.Right} 
            style={{ 
              right: '-18px', 
              width: '12px', 
              height: '12px', 
              background: '#F6E05E', // Yellow output handle
              border: '2px solid #282828',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10
            }} 
          />
        </div>

      </div>
    </div>
  );
});

