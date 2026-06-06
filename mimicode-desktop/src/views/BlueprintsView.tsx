import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { listen } from '@tauri-apps/api/event';

import { WorkflowNodeCard, WorkflowNodeData, WorkflowNodeRunStatus } from '../components/workflow/nodes/WorkflowNodeCard';
import { ApprovalSidebar, PendingApproval } from '../components/workflow/ApprovalSidebar';
import '../components/workflow/Workflow.css';

const initialNodes: Node<WorkflowNodeData>[] = [
  { id: '1', position: { x: 50, y: 150 }, type: 'customNode', data: { label: 'Start Process', type: 'trigger' } },
  { id: '2', position: { x: 350, y: 150 }, type: 'customNode', data: { label: 'Task Splitter', type: 'manager', status: 'idle', prompt: 'Output strictly a JSON array with exactly 3 items: ["Apple", "Banana", "Cherry"].' } },
  { id: '3', position: { x: 650, y: 150 }, type: 'customNode', data: { label: 'Parallel Workers', type: 'manager_slot', status: 'idle', agent: 'claude', prompt: 'Write a 1-sentence poetic description for this fruit.' } },
  { id: '4', position: { x: 950, y: 150 }, type: 'customNode', data: { label: 'Aggregator', type: 'summary', status: 'idle', prompt: 'Combine the poems into a single coherent paragraph.' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e3-4', source: '3', target: '4', animated: true },
];

interface BlueprintEventPayload {
  blueprint_id: string;
  node_id: string;
  status: WorkflowNodeRunStatus;
  message: string;
  output?: string;
}

export const BlueprintsView: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  
  const [activeTab, setActiveTab] = useState<'canvas' | 'history'>('canvas');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const hist = await invoke<string>('get_run_history', { companyId: 'default_company' });
      setHistoryLogs(JSON.parse(hist));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  const nodeTypes = useMemo(() => ({ customNode: WorkflowNodeCard }), []);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  useEffect(() => {
    const unlisten = listen<BlueprintEventPayload>('blueprint-event', (event) => {
      setNodes((nds) => 
        nds.map((node) => {
          if (node.id === event.payload.node_id) {
            return {
              ...node,
              data: {
                ...node.data,
                status: event.payload.status,
              }
            };
          }
          return node;
        })
      );

      if (event.payload.status === 'waiting_approval') {
        setPendingApproval({
          blueprint_id: event.payload.blueprint_id,
          node_id: event.payload.node_id,
          message: event.payload.message,
          output: event.payload.output,
        });
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setNodes]);

  const handleResolveApproval = useCallback(async (decision: 'approve' | 'reject' | 'feedback', comment?: string) => {
    if (!pendingApproval) return;
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('resolve_approval', {
        blueprintId: pendingApproval.blueprint_id,
        nodeId: pendingApproval.node_id,
        decision,
        comment
      });
      setPendingApproval(null);
      // Let the backend event trigger the status update
    } catch (e) {
      console.error("Failed to resolve approval", e);
    }
  }, [pendingApproval]);



  const runBlueprint = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      // Reset status
      setNodes((nds) => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle', output: undefined } })));

      const blueprintJson = {
        id: "default-blueprint",
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.data.type,
          position: n.position,
          data: n.data
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          condition: (e.data as any)?.condition,
        })),
        variables: {}
      };

      await invoke('run_blueprint_engine', {
        blueprintJson: JSON.stringify(blueprintJson)
      });
      
      // After completion, save the run record (Wait 500ms to allow final state updates)
      setTimeout(async () => {
        setNodes((currentNodes) => {
          const runRecord = {
            timestamp: new Date().toISOString(),
            blueprintId: "default-blueprint",
            nodes: currentNodes.map(n => ({ id: n.id, label: n.data.label, status: n.data.status, output: n.data.output }))
          };
          invoke('save_run_record', { companyId: 'default_company', runData: JSON.stringify(runRecord) });
          return currentNodes;
        });
      }, 500);

    } catch (e) {
      console.error("Failed to run blueprint", e);
    }
  }, [nodes, edges]);

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="view-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
        <h2 className="view-title">Workflow Blueprints</h2>
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-primary" onClick={runBlueprint}>Run Blueprint</button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 24px' }}>
        <button 
          className={`tab-button ${activeTab === 'canvas' ? 'active' : ''}`} 
          onClick={() => setActiveTab('canvas')}
          style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'canvas' ? '2px solid var(--color-primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === 'canvas' ? 600 : 400 }}
        >
          Blueprint Canvas
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`} 
          onClick={() => setActiveTab('history')}
          style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'history' ? '2px solid var(--color-primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === 'history' ? 600 : 400 }}
        >
          Run History
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', width: '100%', display: activeTab === 'canvas' ? 'block' : 'none' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          colorMode="system"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: activeTab === 'history' ? 'block' : 'none' }}>
        {historyLogs.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--color-text-muted)' }}>
            No run history available for this blueprint.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {historyLogs.slice().reverse().map((run, idx) => (
              <div key={idx} style={{ background: 'var(--bg-panel)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>Run at: {new Date(run.timestamp).toLocaleString()}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>ID: {run.blueprintId}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {run.nodes?.map((n: any) => (
                    <div key={n.id} style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', padding: '12px', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '14px' }}>{n.label}</strong>
                        <span style={{ 
                          fontSize: '12px', 
                          padding: '2px 8px', 
                          borderRadius: '12px',
                          background: n.status === 'success' ? 'var(--color-success)' : n.status === 'failed' ? 'var(--color-danger)' : 'var(--color-primary)',
                          color: '#fff'
                        }}>
                          {n.status}
                        </span>
                      </div>
                      {n.output && (
                        <div style={{ fontSize: '13px', background: 'var(--bg-body)', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                          {n.output}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingApproval && (
        <ApprovalSidebar 
          approval={pendingApproval} 
          onClose={() => setPendingApproval(null)} 
          onResolve={handleResolveApproval} 
        />
      )}
    </div>
  );
};
