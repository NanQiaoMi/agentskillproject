# Design Spec: One-Click Auto-Layout for TeamBuilderCanvas

## Goal
The goal is to support a one-click auto-layout feature on the `TeamBuilderCanvas` editor. This feature uses the `dagre` library to automatically calculate optimal, symmetrical, and aesthetic coordinates for all nodes and edges (Top-to-Bottom flow), align them, and fit the view.

## Proposed Changes

### `src/views/TeamBuilderCanvas.tsx`
- Import `dagre` at the top of the file:
  ```typescript
  import dagre from 'dagre';
  ```
- Implement a `getLayoutedElements` helper function (or inline method) that:
  1. Initializes a new `dagre.graphlib.Graph` instance.
  2. Sets graph settings: `rankdir: 'TB'`, `nodesep: 80`, `ranksep: 100`.
  3. Registers all nodes with a standard bounding box (`width: 220`, `height: 130`).
  4. Registers all edges.
  5. Computes coordinates using `dagre.layout(g)`.
  6. Returns the updated nodes with calculated positions.
- Add a new "一键美化排版" button in the sidebar panel.
- Implement the click handler for the button:
  - Updates the `nodes` state with layouted coordinates.
  - Triggers a smooth `fitView({ duration: 400 })` using the React Flow viewport instance.

## Verification Plan
- Run `npm run tauri dev`.
- Load a template (e.g. "软件开发全生命周期").
- Manually move nodes around into a messy layout.
- Click the "一键美化排版" button and verify:
  - The nodes align perfectly in a vertical, symmetric flowchart structure.
  - The viewport automatically centers and scales to fit the layout.
  - No connection lines overlap node bodies or zig-zag awkwardly.
