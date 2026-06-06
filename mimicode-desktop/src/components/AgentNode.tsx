import React, { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Icons } from '../components/Icons';

export const AgentNode = memo(({ id, data }: any) => {
  const { setNodes, setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: 'rgba(25, 25, 30, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${isHovered ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
        boxShadow: isHovered ? '0 8px 32px rgba(59, 130, 246, 0.2)' : '0 4px 20px rgba(0,0,0,0.3)',
        minWidth: '220px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        position: 'relative'
      }}
    >
      {/* Delete Button */}
      <button
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '24px',
          height: '24px',
          borderRadius: '12px',
          backgroundColor: 'var(--color-danger)',
          color: '#fff',
          border: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'scale(1)' : 'scale(0.8)',
          transition: 'all 0.2s',
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
          zIndex: 10
        }}
        title="删除节点"
      >
        <Icons.X style={{ width: '12px', height: '12px' }} />
      </button>

      {/* Top Edge */}
      <Handle id="top-target" type="target" position={Position.Top} style={{ left: 'calc(50% - 10px)', background: '#3B82F6', width: '10px', height: '10px', border: '2px solid #1e1e1e', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)' }} />
      <Handle id="top-source" type="source" position={Position.Top} style={{ left: 'calc(50% + 10px)', background: '#10B981', width: '10px', height: '10px', border: '2px solid #1e1e1e', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 0 4px rgba(16, 185, 129, 0.5)' }} />

      {/* Bottom Edge */}
      <Handle id="bottom-target" type="target" position={Position.Bottom} style={{ left: 'calc(50% - 10px)', background: '#3B82F6', width: '10px', height: '10px', border: '2px solid #1e1e1e', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)' }} />
      <Handle id="bottom-source" type="source" position={Position.Bottom} style={{ left: 'calc(50% + 10px)', background: '#10B981', width: '10px', height: '10px', border: '2px solid #1e1e1e', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 0 4px rgba(16, 185, 129, 0.5)' }} />

      {/* Left Edge */}
      <Handle id="left-target" type="target" position={Position.Left} style={{ top: 'calc(50% - 10px)', background: '#3B82F6', width: '10px', height: '10px', border: '2px solid #1e1e1e', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)' }} />
      <Handle id="left-source" type="source" position={Position.Left} style={{ top: 'calc(50% + 10px)', background: '#10B981', width: '10px', height: '10px', border: '2px solid #1e1e1e', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 0 4px rgba(16, 185, 129, 0.5)' }} />

      {/* Right Edge */}
      <Handle id="right-target" type="target" position={Position.Right} style={{ top: 'calc(50% - 10px)', background: '#3B82F6', width: '10px', height: '10px', border: '2px solid #1e1e1e', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)' }} />
      <Handle id="right-source" type="source" position={Position.Right} style={{ top: 'calc(50% + 10px)', background: '#10B981', width: '10px', height: '10px', border: '2px solid #1e1e1e', zIndex: 100, transition: 'all 0.2s', boxShadow: '0 0 4px rgba(16, 185, 129, 0.5)' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: '36px', height: '36px', borderRadius: '10px', 
          background: data.icon === 'manager' 
            ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' 
            : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)'
        }}>
          {data.icon === 'manager' ? <Icons.Shield style={{ width: '18px', height: '18px' }}/> : <Icons.Code style={{ width: '18px', height: '18px' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.label}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.role}</div>
        </div>
      </div>

      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '6px', 
        padding: '6px 8px', backgroundColor: 'rgba(0,0,0,0.3)', 
        borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' }}></div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
          {data.model || 'gpt-4o'}
        </div>
      </div>


    </div>
  );
});
