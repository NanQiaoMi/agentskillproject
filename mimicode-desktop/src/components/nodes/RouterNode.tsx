// React import removed
import { Handle, Position } from '@xyflow/react';
import { Icons } from '../Icons';

export function RouterNode({ data }: any) {
  return (
    <div style={{
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
        gap: '6px',
        fontWeight: 600,
        fontSize: '14px',
        color: '#fff'
      }}>
        <Icons.Activity style={{ width: '16px', height: '16px', color: '#FFFFFF', flexShrink: 0 }} />
        <span>Router</span>
      </div>
      
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="target-input"
            style={{ background: '#63B3ED', left: '-10px' }}
          />
          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Data In</span>
        </div>

        <input 
          type="text"
          placeholder="Condition..."
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
          defaultValue={data?.condition || ''}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>True</span>
          <Handle
            type="source"
            position={Position.Right}
            id="source-true"
            style={{ background: '#68D391', right: '-10px' }}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>False</span>
          <Handle
            type="source"
            position={Position.Right}
            id="source-false"
            style={{ background: '#FC8181', right: '-10px' }}
          />
        </div>
      </div>
    </div>
  );
}
