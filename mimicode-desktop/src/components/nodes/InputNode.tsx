// React import removed
import { Handle, Position } from '@xyflow/react';
import { Icons } from '../Icons';

export function InputNode({ data }: any) {
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
        backgroundColor: '#DD6B20',
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
        <Icons.FileText style={{ width: '16px', height: '16px', color: '#FFFFFF', flexShrink: 0 }} />
        <span>Input</span>
      </div>
      
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <textarea 
          placeholder="Initial context or prompt..."
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
          defaultValue={data?.value || ''}
        />
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Data Out</span>
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
