import { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Icons } from '../Icons';

export function ToolNode({ id, data }: any) {
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
        backgroundColor: '#3182CE',
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
          <Icons.Settings style={{ width: '16px', height: '16px', color: '#FFFFFF', flexShrink: 0 }} />
          <span>Tool</span>
        </div>
        {isHovered && (
          <button 
            onClick={handleDelete}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0',
            }}
          >
            <Icons.X style={{ width: '14px', height: '14px' }} />
          </button>
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
          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Parameters</span>
          
          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Result</span>
          <Handle
            type="source"
            position={Position.Right}
            id="source-output"
            style={{ background: '#F6E05E', right: '-10px' }}
          />
        </div>

        <select 
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
          value={data?.tool || 'web_search'}
          onChange={(e) => updateNodeData(id, { tool: e.target.value })}
        >
          <option value="web_search">Web Search</option>
          <option value="file_system">File System</option>
          <option value="code_interpreter">Code Interpreter</option>
        </select>
      </div>
    </div>
  );
}
