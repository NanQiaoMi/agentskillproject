import { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Icons } from '../Icons';

export function RouterNode({ id, data }: any) {
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
    }}>
      <div style={{
        backgroundColor: '#805AD5',
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
          <Icons.GitBranch style={{ width: '16px', height: '16px', color: '#FFFFFF', flexShrink: 0 }} />
          <span>路由 / 分发</span>
        </div>
        {isHovered && (
          <div onClick={handleDelete} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Icons.X style={{ width: '14px', height: '14px' }} />
          </div>
        )}
      </div>
      
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="target-input"
            style={{ background: '#63B3ED', left: '-10px' }}
          />
          <div style={{ color: '#E2E8F0', fontSize: '13px', marginLeft: '4px' }}>
            输入
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ color: '#A0AEC0', fontSize: '12px' }}>条件</div>
          <input 
            type="text"
            placeholder="例如：is_approved == true"
            style={{
              background: '#1A202C',
              color: '#e2e8f0',
              border: '1px solid #4a5568',
              borderRadius: '4px',
              padding: '6px',
              fontSize: '12px',
              width: '100%',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            value={data?.condition || ''}
            onChange={(e) => updateNodeData(id, { condition: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
          <div style={{ color: '#48BB78', fontSize: '13px', marginRight: '4px', fontWeight: 600 }}>
            是 (True)
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id="source-true"
            style={{ right: '-18px', width: '12px', height: '12px', background: '#48BB78', border: '2px solid #282828' }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative', marginTop: '4px' }}>
          <div style={{ color: '#F56565', fontSize: '13px', marginRight: '4px', fontWeight: 600 }}>
            否 (False)
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id="source-false"
            style={{ right: '-18px', width: '12px', height: '12px', background: '#F56565', border: '2px solid #282828' }}
          />
        </div>
      </div>
    </div>
  );
}
