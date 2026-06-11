# Canvas Multi-Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 8 side-by-side connection handles (4 targets, 4 sources) on the custom AgentNode and enforce self-connection prevention in the React Flow canvas.

**Architecture:** We will modify `AgentNode.tsx` to explicitly place `Handle` components with `left` and `top` CSS offsets. We will update `TeamBuilderCanvas.tsx` to add an `isValidConnection` prop to `<ReactFlow>`.

**Tech Stack:** React, `@xyflow/react`, TypeScript

---

### Task 1: Update AgentNode Handles Geometry

**Files:**
- Modify: `src/components/AgentNode.tsx`

- [ ] **Step 1: Write the updated handle implementation**

```tsx
// Inside src/components/AgentNode.tsx, replace the existing Top/Left/Bottom/Right handles with:

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
```

- [ ] **Step 2: Run application to verify visually**

Run: `npm run tauri dev`
Expected: The UI shows 8 connection dots correctly placed on the 4 edges of the node card without overlap.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgentNode.tsx
git commit -m "feat: implement 4-sided dual handles for AgentNode"
```

### Task 2: Implement Connection Validation in Canvas

**Files:**
- Modify: `src/views/TeamBuilderCanvas.tsx`

- [ ] **Step 1: Write the validation logic**

```tsx
// Inside src/views/TeamBuilderCanvas.tsx, define the isValidConnection callback:

  const isValidConnection = useCallback((connection: Connection) => {
    // Prevent connecting a node to itself
    return connection.source !== connection.target;
  }, []);

// Add it to the <ReactFlow> component props:
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
        >
```

- [ ] **Step 2: Run application to verify connection rule**

Run: `npm run tauri dev`
Expected: Dragging from a node's source to its own target handle is visually rejected and does not create an edge. Dragging between different nodes works.

- [ ] **Step 3: Commit**

```bash
git add src/views/TeamBuilderCanvas.tsx
git commit -m "feat: prevent self-connections in TeamBuilderCanvas"
```
