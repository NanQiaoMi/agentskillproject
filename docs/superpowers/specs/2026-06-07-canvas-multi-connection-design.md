# Canvas Multi-Connection & Handle Layout Design

This design document specifies the layout optimization and feature enhancements for the AI Agent Team Builder Canvas, enabling multi-input, multi-output, and 4-sided LEGO-like connectivity.

## Goal

To allow users to build complex agent topologies (like Manager-to-multiple-Workers, and multiple-Workers-to-QA) with intuitive 4-sided bidirectional handles, resolving limitations of single-direction routing.

## Proposed Changes

### 1. Custom Node Handle Placement (`src/components/AgentNode.tsx`)
We will configure 8 handles (one `target` input and one `source` output per side) at the four cardinal edges (Top, Right, Bottom, Left). 
They will be positioned next to each other on each edge, using offset percentages to avoid overlap:
- **Top edge**:
  - `top-target` (Input, Blue, Left offset: `calc(50% - 10px)`)
  - `top-source` (Output, Green, Left offset: `calc(50% + 10px)`)
- **Bottom edge**:
  - `bottom-target` (Input, Blue, Left offset: `calc(50% - 10px)`)
  - `bottom-source` (Output, Green, Left offset: `calc(50% + 10px)`)
- **Left edge**:
  - `left-target` (Input, Blue, Top offset: `calc(50% - 10px)`)
  - `left-source` (Output, Green, Top offset: `calc(50% + 10px)`)
- **Right edge**:
  - `right-target` (Input, Blue, Top offset: `calc(50% - 10px)`)
  - `right-source` (Output, Green, Top offset: `calc(50% + 10px)`)

Each handle will be styled with premium colors and a glow effect:
- **Input (Target)**: `#3B82F6` (Neon Blue)
- **Output (Source)**: `#10B981` (Neon Green)
- **Border**: `2px solid #1e1e1e`
- **Size**: `10px * 10px`
- **Hover transition**: Glow shadow and scale-up effect.

### 2. Connection Logic and Validation (`src/views/TeamBuilderCanvas.tsx`)
We will pass the `isValidConnection` prop to `<ReactFlow>` to prevent self-connections (connecting a node to itself):
```typescript
const isValidConnection = useCallback((connection: Connection) => {
  return connection.source !== connection.target;
}, []);
```

## Verification Plan

### Automated Verification
- Run `tsc --noEmit` in the workspace to verify there are no compilation/type errors in the TypeScript codebase.

### Manual Verification
- Launch the application (`npm run tauri dev`).
- Open the Team Builder Canvas.
- Verify that 8 handles (4 blue, 4 green) are rendered on each card.
- Verify that dragging a connection from any green handle to any other node's blue handle succeeds.
- Verify that a single output handle can connect to multiple target nodes.
- Verify that multiple output handles can connect to a single target node.
- Verify that self-connections (dragging from a node's handle to its own handle) are rejected.
