import { Handle, Position } from '@xyflow/react';
import { Icons } from '../Icons';

export function FeedbackNode({ data }: any) {
  // Render node
  return (
    <div style={{
      background: 'rgba(40, 40, 40, 0.95)',
      backdropFilter: 'blur(8px)',
      border: '1px solid #ED8936',
      borderRadius: '24px',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#fff',
      boxShadow: '0 0 15px rgba(237, 137, 54, 0.2), inset 0 0 10px rgba(237, 137, 54, 0.1)',
      position: 'relative'
    }}>
      {/* Left target handle (receives input) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in-feedback"
        style={{ background: '#A0AEC0', width: '10px', height: '10px', border: '2px solid #282828', left: '-5px' }}
      />

      <Icons.RefreshCw style={{ width: '16px', height: '16px', color: '#ED8936' }} />
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#FBD38D' }}>{data?.label || '人工审查'}</span>

      {/* Right source handle (Approve) */}
      <Handle
        type="source"
        position={Position.Right}
        id="source-true"
        style={{ background: '#48BB78', width: '10px', height: '10px', border: '2px solid #282828', right: '-5px' }}
      />
      
      {/* Bottom source handle (Revise) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-false"
        style={{ background: '#F56565', width: '10px', height: '10px', border: '2px solid #282828', bottom: '-5px' }}
      />
    </div>
  );
}
