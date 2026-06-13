import React, { useMemo, useEffect, useState, useRef } from 'react';
import { ReactFlow, Background, Handle, Position, Node, Edge, MarkerType, ReactFlowProvider, useReactFlow, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Icons } from './Icons';
import { FeedbackEdge } from './FeedbackEdge';
import { AgentEvent } from '../types';
// Removed unused dagre layout logic

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
  let { label, role, isActive, isStartEnd, originalType } = data;
  
  if (!label && originalType === 'routerNode') {
    label = '条件分发';
    role = 'Router';
  } else if (!label && originalType === 'inputNode') {
    label = '全局输入';
    role = 'Input';
  } else if (!label && originalType === 'toolNode') {
    label = '工具节点';
    role = 'Tool';
  }
  
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

const FitViewHandler: React.FC<{ nodes: Node[], containerRef: React.RefObject<HTMLDivElement | null> }> = ({ nodes, containerRef }) => {
  const { fitView } = useReactFlow();

  // Only trigger fitView when the actual graph structure (nodes list, layout positions) changes.
  // This prevents resetting user's manual adjustments on execution event/active state updates.
  const structureKey = useMemo(() => {
    return nodes.map(n => `${n.id}:${Math.round(n.position.x)}:${Math.round(n.position.y)}`).join(',');
  }, [nodes]);

  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.15, duration: 450 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [structureKey, fitView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && lastWidth === 0) {
          fitView({ padding: 0.15, duration: 450 });
        }
        lastWidth = entry.contentRect.width;
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [fitView, containerRef]);

  return null;
};

const TeamWorkflowGraphInner: React.FC<TeamWorkflowGraphProps> = ({ events }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [events]);

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
            originalType: n.type,
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
      const xAligned = new Map<any, number>();
      xClusters.forEach(cluster => {
        const avgX = cluster.sum / cluster.count;
        cluster.nodes.forEach(n => xAligned.set(n, avgX));
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
      const yAligned = new Map<any, number>();
      yClusters.forEach(cluster => {
        const avgY = cluster.sum / cluster.count;
        cluster.nodes.forEach(n => yAligned.set(n, avgY));
      });

      // Apply aligned positions immutably
      for (let i = 0; i < mappedNodes.length; i++) {
        const n = mappedNodes[i];
        const newX = xAligned.get(n) ?? n.position.x;
        const newY = yAligned.get(n) ?? n.position.y;
        if (newX !== n.position.x || newY !== n.position.y) {
          mappedNodes[i] = { ...n, position: { x: newX, y: newY } };
        }
      }
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

      // Add dynamic glowing edges for recent delegations
      const recentDelegations = events.filter(e => e.event === 'agent_delegated');
      if (recentDelegations.length > 0) {
        // Show the 2 most recent delegations
        const recent = recentDelegations.slice(-2);
        recent.forEach((del, i) => {
          const match = del.message?.match(/Delegating to ([^.]+)/);
          if (match && match[1]) {
            const callerName = del.agent;
            const calleeName = match[1].trim();
            const sourceNode = mappedNodes.find(n => (n.data as any).label === callerName || (n.data as any).name === callerName);
            // Relaxed matching for callee
            const targetNode = mappedNodes.find(n => (n.data as any).label === calleeName || (n.data as any).name === calleeName || ((n.data as any).label as string).toLowerCase().includes(calleeName.toLowerCase()));
            
            if (sourceNode && targetNode && sourceNode.id !== targetNode.id) {
              // Ensure we don't duplicate existing identical edges
              if (!finalEdges.find(e => e.source === sourceNode.id && e.target === targetNode.id && e.id.includes('delegation'))) {
                finalEdges.push({
                  id: `delegation-edge-${sourceNode.id}-${targetNode.id}-${i}`,
                  source: sourceNode.id,
                  target: targetNode.id,
                  type: 'default',
                  style: { stroke: '#F59E0B', strokeWidth: 4, filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.9))' },
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#F59E0B', width: 20, height: 20 },
                  animated: true
                });
              }
            }
          }
        });
      }

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
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#F9FAFB', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }} ref={containerRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode="light"
          proOptions={{ hideAttribution: true }}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.05}
          maxZoom={2}
          nodesDraggable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
          nodesConnectable={false}
          elementsSelectable={true}
          preventScrolling={false}
        >
          <Background color="#D1D5DB" gap={24} size={2} />
          <FitViewHandler nodes={nodes} containerRef={containerRef} />
          <Controls />
        </ReactFlow>
      </div>
      
      {/* Real-time System Log Console */}
      <div style={{
        flex: 1, margin: '16px', marginTop: '0', backgroundColor: '#0A0F1C', border: '1px solid #1E293B',
        borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(30, 58, 138, 0.1)',
        position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0
      }}>
        {/* Terminal Header */}
        <div style={{
          height: '32px', backgroundColor: '#131C2F', borderBottom: '1px solid #1E293B',
          display: 'flex', alignItems: 'center', padding: '0 12px', gap: '6px', flexShrink: 0
        }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.8)' }}></div>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(234, 179, 8, 0.8)' }}></div>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.8)' }}></div>
          <span style={{ marginLeft: '8px', fontSize: '10px', fontFamily: 'monospace', color: '#64748B', letterSpacing: '0.05em' }}>SYSTEM_LOG</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
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
            <span style={{ color: '#475569', marginLeft: '8px' }}>
              {new Date().toLocaleTimeString('en-US', { hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' })}
            </span>
          </div>
        </div>
        
        {/* Terminal Content (Logs) */}
        <div ref={scrollContainerRef} style={{ 
          flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', 
          fontFamily: 'monospace', fontSize: '12px', overflowY: 'auto' 
        }}>
          {events.length === 0 ? (
            <div style={{ color: '#64748B', fontStyle: 'italic' }}>Waiting for system events...</div>
          ) : (
            events.map((ev, i) => {
              if (ev.event === 'user_input') return null;
              
              let color = '#3B82F6';
              if (ev.event === 'error') color = '#EF4444';
              else if (ev.event === 'success') color = '#10B981';
              else if (ev.event === 'agent_action' || ev.event === 'system') color = '#F59E0B';
              
              const message = ev.message || ev.task || ev.tool || ev.event;
              
              return (
                <div key={i} style={{ display: 'flex', gap: '12px', lineHeight: '1.4' }}>
                  <span style={{ color, fontWeight: 600, width: '110px', flexShrink: 0, textAlign: 'right' }}>
                    [{ev.agent}]
                  </span>
                  <span style={{ color: '#E2E8F0', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                    {message}
                  </span>
                </div>
              );
            })
          )}
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
