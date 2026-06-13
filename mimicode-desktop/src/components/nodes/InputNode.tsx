import { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Icons } from '../Icons';

export function InputNode({ id, data }: any) {
  const { setNodes, setEdges, updateNodeData } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = () => {
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
    setEdges((edges) => edges.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: '#282828',
        border: '1px solid #3f3f3f',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: '200px',
        color: '#e2e8f0',
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div style={{
        backgroundColor: '#DD6B20',
        padding: '6px 10px',
        borderTopLeftRadius: '5px',
        borderTopRightRadius: '5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontWeight: 600,
        fontSize: '14px',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Icons.FileText style={{ width: '16px', height: '16px', color: '#FFFFFF' }} />
          <span>输入 (Input)</span>
        </div>
        {isHovered && (
          <div onClick={handleDelete} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.8 }} onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')} onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')} title="Delete node">
            <Icons.X style={{ width: '14px', height: '14px' }} />
          </div>
        )}
      </div>
      
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id={`runtime-only-${id}`}
            checked={data?.isRuntimeOnly || false}
            onChange={(e) => updateNodeData(id, { isRuntimeOnly: e.target.checked })}
            style={{ cursor: 'pointer', accentColor: '#DD6B20' }}
          />
          <label htmlFor={`runtime-only-${id}`} style={{ fontSize: '12px', color: '#CBD5E0', cursor: 'pointer' }}>
            仅接收运行时输入 (无预设)
          </label>
        </div>

        {!data?.isRuntimeOnly && (
          <textarea 
            placeholder="预设情景或系统提示词..."
            style={{
              background: '#1A202C',
              color: '#e2e8f0',
              border: '1px solid #4a5568',
              borderRadius: '4px',
              padding: '6px',
              resize: 'vertical',
              minHeight: '60px',
              fontSize: '12px',
              outline: 'none',
              boxSizing: 'border-box',
              width: '100%'
            }}
            value={data?.prompt || ''}
            onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
          />
        )}
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
          <div style={{ color: '#A0AEC0', fontSize: '12px', marginRight: '4px' }}>
            输出
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id="source-output"
            style={{ background: '#F6E05E', right: '-10px' }}
          />
        </div>
      </div>
    </div>
  );
}
