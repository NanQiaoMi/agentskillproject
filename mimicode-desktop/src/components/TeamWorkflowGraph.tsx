import React, { useMemo, useEffect, useState } from 'react';
import { ReactFlow, Background, Handle, Position, Node, Edge, MarkerType, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Icons } from './Icons';
import { FeedbackEdge } from './FeedbackEdge';
// Removed unused dagre layout logic

interface AgentEvent {
  event: string;
  agent: string;
  node_id?: string;
}

interface TeamWorkflowGraphProps {
  events: AgentEvent[];
}

const getAgentIconSVG = (role: string, label: string) => {
  // Try to use screenshot-like icons: Brain for manager, Robot for workers, Lightning for action
  if (role?.toLowerCase().includes('manager') || role?.toLowerCase().includes('leader') || label === 'Hermes') {
    return <Icons.Brain style={{ width: '20px', height: '20px' }} />;
  } else if (role?.toLowerCase().includes('engineer') || role?.toLowerCase().includes('coder') || role?.toLowerCase().includes('worker')) {
    return <Icons.Bot style={{ width: '20px', height: '20px' }} />;
  } else if (label === 'Start' || label === 'End') {
    return <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4B5563' }} />;
  } else {
    // Default fallback
    return <Icons.Bot style={{ width: '20px', height: '20px' }} />;
  }
};

const CustomLightNode = ({ data }: { data: any }) => {
  const { label, role, isActive, isStartEnd } = data;
  
  if (isStartEnd) {
    return (
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative'
      }}>
        <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#6B7280' }} />
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center', padding: '12px',
      borderRadius: '16px', width: '220px', height: '64px',
      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.8)',
      border: isActive ? '1px solid #60A5FA' : '1px solid rgba(226, 232, 240, 0.8)',
      boxShadow: isActive ? '0 8px 30px -4px rgba(59, 130, 246, 0.3), 0 0 0 1px #60A5FA' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      backdropFilter: 'blur(4px)',
      transition: 'all 0.5s cubic-bezier(0, 0, 0.2, 1)'
    }}>
      
      {/* Top Edge Handles */}
      <Handle id="top-target" type="target" position={Position.Top} style={{ opacity: 0, left: '50%' }} />
      <Handle id="top-source" type="source" position={Position.Top} style={{ opacity: 0, left: '50%' }} />

      {/* Bottom Edge Handles */}
      <Handle id="bottom-target" type="target" position={Position.Bottom} style={{ opacity: 0, left: '50%' }} />
      <Handle id="bottom-source" type="source" position={Position.Bottom} style={{ opacity: 0, left: '50%' }} />

      {/* Left/Right Edge Handles for Feedback Loop */}
      <Handle id="right-target" type="target" position={Position.Right} style={{ opacity: 0, top: 'calc(50% - 10px)' }} />
      <Handle id="right-source" type="source" position={Position.Right} style={{ opacity: 0, top: 'calc(50% + 10px)' }} />

      {/* Active Indicator */}
      {isActive && (
        <span style={{ position: 'absolute', top: '-6px', right: '-6px', display: 'flex', width: '14px', height: '14px' }}>
          <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#60A5FA', opacity: 0.75, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></span>
          <span style={{ position: 'relative', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#3B82F6', border: '2px solid #FFFFFF' }}></span>
        </span>
      )}

      {/* Icon Area */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '40px', height: '40px', borderRadius: '12px',
        backgroundColor: isActive ? '#DBEAFE' : '#F1F5F9',
        color: isActive ? '#2563EB' : '#64748B',
        transition: 'all 0.3s'
      }}>
        {isActive && data.event === 'agent_action' ? (
          <Icons.Zap style={{ width: '20px', height: '20px' }} />
        ) : (
          <div style={{ transform: 'scale(0.85)' }}>
            {getAgentIconSVG(role, label)}
          </div>
        )}
      </div>
      
      {/* Text Area */}
      <div style={{ marginLeft: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden', width: '100%' }}>
        <span style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '2px',
          color: isActive ? '#2563EB' : '#94A3B8', transition: 'color 0.3s'
        }}>
          {role}
        </span>
        <span style={{
          fontSize: '13px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'left', fontFamily: 'sans-serif'
        }}>
          {label}
        </span>
      </div>
    </div>
  );
};

const nodeTypes = {
  agentNode: CustomLightNode,
  customLight: CustomLightNode
};

const edgeTypes = {
  feedback: FeedbackEdge
};

const FitViewHandler: React.FC<{ nodes: Node[]; edges: Edge[] }> = ({ nodes, edges }) => {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.15, duration: 400 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nodes, edges, fitView]);

  return null;
};

const TeamWorkflowGraphInner: React.FC<TeamWorkflowGraphProps> = ({ events }) => {
  const [savedNodes, setSavedNodes] = useState<Node[]>(() => {
    try {
      const stored = localStorage.getItem('mimi-team-flow-nodes');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [savedEdges, setSavedEdges] = useState<Edge[]>(() => {
    try {
      const stored = localStorage.getItem('mimi-team-flow-edges');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const loadGraphFromStorage = () => {
    try {
      const storedNodes = localStorage.getItem('mimi-team-flow-nodes');
      const storedEdges = localStorage.getItem('mimi-team-flow-edges');
      if (storedNodes) setSavedNodes(JSON.parse(storedNodes));
      if (storedEdges) setSavedEdges(JSON.parse(storedEdges));
    } catch (e) {
      console.error('Failed to parse saved workflow graph', e);
    }
  };

  useEffect(() => {
    loadGraphFromStorage();
    window.addEventListener('mimi-graph-updated', loadGraphFromStorage);
    window.addEventListener('mimi-team-run-auto', loadGraphFromStorage);
    return () => {
      window.removeEventListener('mimi-graph-updated', loadGraphFromStorage);
      window.removeEventListener('mimi-team-run-auto', loadGraphFromStorage);
    };
  }, []);

  const { nodes, edges } = useMemo(() => {
    const activeAgent = events.length > 0 ? events[events.length - 1].agent : '';
    const activeEvent = events.length > 0 ? events[events.length - 1].event : '';
    const activeNodeId = events.length > 0 ? events[events.length - 1].node_id : '';

    if (savedNodes.length > 0) {
      // Use saved nodes from canvas but apply independent X and Y scaling.
      // Since original nodes were 320x150 rectangles and the new ones are 220x64 cards,
      // we need to scale down slightly but give enough horizontal room.
      const SCALE_X = 0.85; // Wide scale to fit 220px cards horizontally
      const SCALE_Y = 0.85; // Keep vertical distance relatively generous

      const mappedNodes = savedNodes.map(n => {
        const isActive = activeNodeId ? activeNodeId === n.id : activeAgent === n.data.label;
        
        // Original nodes are roughly 320x150. Calculate original center:
        const origCenterX = n.position.x + 160;
        const origCenterY = n.position.y + 75;
        
        // Scale the centers
        const scaledCenterX = origCenterX * SCALE_X;
        const scaledCenterY = origCenterY * SCALE_Y;
        
        // Convert back to top-left for the 220x64 node
        const newX = scaledCenterX - 110; // Half of 220px
        const newY = scaledCenterY - 32;  // Half of 64px

        return {
          ...n,
          type: 'customLight',
          position: { x: newX, y: newY },
          data: {
            ...n.data,
            isActive: isActive,
            event: isActive ? activeEvent : ''
          }
        };
      });

      // --- Auto-Alignment Algorithm ---
      // Force nodes with similar X or Y coordinates to perfectly align to an imaginary grid
      // Increase threshold to 100 to catch sloppy manual placements and guarantee a perfectly straight spine
      const snapThreshold = 100; 

      const xClusters: { sum: number, count: number, nodes: any[] }[] = [];
      mappedNodes.forEach(n => {
        let found = false;
        for (const cluster of xClusters) {
          if (Math.abs((cluster.sum / cluster.count) - n.position.x) < snapThreshold) {
            cluster.sum += n.position.x;
            cluster.count++;
            cluster.nodes.push(n);
            found = true;
            break;
          }
        }
        if (!found) xClusters.push({ sum: n.position.x, count: 1, nodes: [n] });
      });
      xClusters.forEach(cluster => {
        const avgX = cluster.sum / cluster.count;
        cluster.nodes.forEach(n => n.position.x = avgX);
      });

      const yClusters: { sum: number, count: number, nodes: any[] }[] = [];
      mappedNodes.forEach(n => {
        let found = false;
        for (const cluster of yClusters) {
          if (Math.abs((cluster.sum / cluster.count) - n.position.y) < snapThreshold) {
            cluster.sum += n.position.y;
            cluster.count++;
            cluster.nodes.push(n);
            found = true;
            break;
          }
        }
        if (!found) yClusters.push({ sum: n.position.y, count: 1, nodes: [n] });
      });
      yClusters.forEach(cluster => {
        const avgY = cluster.sum / cluster.count;
        cluster.nodes.forEach(n => n.position.y = avgY);
      });
      // --- End Auto-Alignment ---

      let mappedEdges: any[] = savedEdges.map((e: any) => {
        let isFeedbackLoop = 
          (e.sourceHandle?.includes('right') && e.targetHandle?.includes('right')) ||
          (e.sourceHandle?.includes('left') && e.targetHandle?.includes('left'));
          
        // Auto-detect feedback loop if not explicitly drawn with side handles
        const sourceNode = savedNodes.find((n: any) => n.id === e.source);
        const targetNode = savedNodes.find((n: any) => n.id === e.target);
        if (!isFeedbackLoop && sourceNode && targetNode && targetNode.position.y < sourceNode.position.y) {
          isFeedbackLoop = true;
        }

        return {
          ...e,
          type: isFeedbackLoop ? 'feedback' : 'smoothstep', // Use smoothstep for perfect orthogonal flowchart branches
          style: { stroke: '#93C5FD', strokeWidth: 3 }, 
          markerEnd: { type: MarkerType.ArrowClosed, color: '#93C5FD', width: 15, height: 15 },
          animated: false
        };
      });

      // If no edges exist, it implies Hierarchical Mode!
      // Let's generate virtual hierarchical edges from the Manager to all other agents.
      if (mappedEdges.length === 0 && mappedNodes.length > 1) {
        const managerNode = mappedNodes.find(n => (n.data as any).role === 'Manager' || (n.data as any).label === 'Manager') || mappedNodes[0];
        mappedNodes.forEach((node, idx) => {
          if (node.id !== managerNode.id) {
            mappedEdges.push({
              id: `hierarchical-edge-${idx}`,
              source: managerNode.id,
              target: node.id,
              type: 'smoothstep',
              style: { stroke: '#E5E7EB', strokeWidth: 2, strokeDasharray: '5,5' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#E5E7EB', width: 12, height: 12 },
              animated: false
            });
          }
        });
      }

      // Find the active node to highlight incoming edges
      mappedEdges.forEach(edge => {
        const targetNode = mappedNodes.find(n => n.id === edge.target);
        if (targetNode && targetNode.data.isActive) {
          edge.animated = true;
          edge.style = { 
            stroke: '#3B82F6', 
            strokeWidth: 3,
            filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))',
            animation: 'dashdraw 1s linear infinite'
          };
          edge.markerEnd = { type: MarkerType.ArrowClosed, color: '#3B82F6', width: 15, height: 15 };
        } else {
          // Make inactive edges subtle and elegant
          edge.style = { stroke: '#CBD5E1', strokeWidth: 2, strokeDasharray: '4,4' };
          edge.markerEnd = { type: MarkerType.ArrowClosed, color: '#CBD5E1', width: 12, height: 12 };
        }
      });

      // Apply handle overrides for strict routing
      const finalEdges = mappedEdges.map(edge => {
        if (edge.type === 'feedback') {
          return { ...edge, sourceHandle: 'right-source', targetHandle: 'right-target' };
        }
        
        // Strict top/bottom routing ensures lines never cross the node body
        const sourceNode = mappedNodes.find(n => n.id === edge.source);
        const targetNode = mappedNodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return edge;

        const dy = targetNode.position.y - sourceNode.position.y;
        
        // Always route vertically for standard flowchart feeling
        if (dy >= 0) {
          return { ...edge, sourceHandle: 'bottom-source', targetHandle: 'top-target' };
        } else {
          return { ...edge, sourceHandle: 'top-source', targetHandle: 'bottom-target' };
        }
      });

      return { nodes: mappedNodes, edges: finalEdges };
    }

    // Fallback if no canvas data
    const sequence: string[] = [];
    events.forEach(ev => {
      if (ev.agent && ev.agent !== 'System' && ev.agent !== 'User' && ev.event !== 'error') {
        if (sequence.length === 0 || sequence[sequence.length - 1] !== ev.agent) {
          sequence.push(ev.agent);
        }
      }
    });

    if (sequence.length === 0) sequence.push('Hermes');

    const generatedNodes: Node[] = [];
    const generatedEdges: Edge[] = [];
    
    let currentY = 50;
    
    // Add Start Node
    generatedNodes.push({
      id: 'start', type: 'customLight', position: { x: 150, y: currentY },
      data: { isStartEnd: true, label: 'Start' }
    });
    currentY += 100;

    sequence.forEach((agent, index) => {
      generatedNodes.push({
        id: `node-${index}-${agent}`,
        type: 'customLight',
        position: { x: 150, y: currentY },
        data: { 
          label: agent, 
          role: agent === 'Hermes' ? 'Manager' : 'Engineer', 
          isActive: activeAgent === agent,
          event: activeAgent === agent ? activeEvent : ''
        }
      });

      const prevNodeId = index === 0 ? 'start' : `node-${index - 1}-${sequence[index - 1]}`;
      const currNodeId = `node-${index}-${agent}`;
      generatedEdges.push({
        id: `edge-${index}`,
        source: prevNodeId,
        target: currNodeId,
        animated: activeAgent === agent,
        style: { stroke: activeAgent === agent ? '#3B82F6' : '#93C5FD', strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: activeAgent === agent ? '#3B82F6' : '#93C5FD', width: 15, height: 15 }
      });
      
      currentY += 100;
    });

    // Add End Node
    generatedNodes.push({
      id: 'end', type: 'customLight', position: { x: 150, y: currentY },
      data: { isStartEnd: true, label: 'End' }
    });
    generatedEdges.push({
      id: `edge-end`,
      source: `node-${sequence.length - 1}-${sequence[sequence.length - 1]}`,
      target: 'end',
      animated: false,
      style: { stroke: '#E5E7EB', strokeWidth: 3, strokeDasharray: '5,5' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#E5E7EB', width: 15, height: 15 }
    });

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [events, savedNodes, savedEdges]);

  const activeAgent = events.length > 0 ? events[events.length - 1].agent : '';

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#F9FAFB', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode="light"
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          nodesConnectable={false}
          elementsSelectable={false}
          preventScrolling={true}
        >
          <Background color="#D1D5DB" gap={24} size={2} />
          <FitViewHandler nodes={nodes} edges={edges} />
        </ReactFlow>
      </div>
      {/* Modern Terminal Console */}
      <div style={{
        margin: '16px', marginTop: '8px', backgroundColor: '#0A0F1C', border: '1px solid #1E293B',
        borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(30, 58, 138, 0.1)',
        position: 'relative'
      }}>
        {/* Terminal Header */}
        <div style={{
          height: '24px', backgroundColor: '#131C2F', borderBottom: '1px solid #1E293B',
          display: 'flex', alignItems: 'center', padding: '0 12px', gap: '6px'
        }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.8)' }}></div>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(234, 179, 8, 0.8)' }}></div>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.8)' }}></div>
          <span style={{ marginLeft: '8px', fontSize: '10px', fontFamily: 'monospace', color: '#64748B', letterSpacing: '0.05em' }}>SYSTEM_LOG</span>
        </div>
        
        {/* Terminal Content */}
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#3B82F6', fontWeight: 700 }}>~</span>
            <span style={{ color: '#64748B' }}>./agent_engine</span>
            <span style={{ color: '#94A3B8' }}>--status</span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '4px 12px', borderRadius: '4px',
              border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60A5FA'
            }}>
              {activeAgent ? (
                <>
                  <span style={{ position: 'relative', display: 'flex', width: '8px', height: '8px', marginRight: '4px' }}>
                    <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#60A5FA', opacity: 0.75, animation: 'pulse 2s infinite' }}></span>
                    <span style={{ position: 'relative', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></span>
                  </span>
                  <span>EXECUTING:</span>
                  <span style={{ color: '#FFFFFF', fontWeight: 700, marginLeft: '4px' }}>{activeAgent.toUpperCase()}</span>
                </>
              ) : (
                <>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#64748B', marginRight: '4px' }}></span>
                  <span style={{ color: '#94A3B8' }}>AWAITING_TASKS</span>
                </>
              )}
            </div>
            {activeAgent && <span style={{ color: '#60A5FA', animation: 'pulse 1s infinite' }}>_</span>}
          </div>
          
          <div style={{ fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
            {new Date().toLocaleTimeString('en-US', { hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' })}
          </div>
        </div>
        
        {/* Ambient Glow */}
        {activeAgent && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(59, 130, 246, 0.5), transparent)'
          }}></div>
        )}
      </div>
    </div>
  );
};

export const TeamWorkflowGraph: React.FC<TeamWorkflowGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <TeamWorkflowGraphInner {...props} />
    </ReactFlowProvider>
  );
};
