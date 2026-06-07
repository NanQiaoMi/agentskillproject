# Design Spec: TeamWorkflowGraph Auto-Fit & Viewport Lock

## Goal
The goal of this modification is to make the `TeamWorkflowGraph` (in `mimicode-desktop`) completely self-adaptive so the user never has to adjust the view (panning or zooming) manually. The viewport should be locked and automatically scale and center the graph nodes whenever the node hierarchy changes or the application window/panel is resized.

## Proposed Changes

### `src/components/TeamWorkflowGraph.tsx`
- Wrap the inner graph logic in `<ReactFlowProvider>` so we can access `useReactFlow()` via a custom subcomponent or hook.
- Implement an auto-fit helper component (`FitViewHandler`) that monitors updates to `nodes` and `edges` and calls `fitView({ padding: 0.15, duration: 400 })` with a slight timeout (to allow DOM node measurement).
- Configure the `<ReactFlow>` component with properties that prevent manual user adjustments:
  - `nodesDraggable={false}`
  - `panOnDrag={false}`
  - `zoomOnScroll={false}`
  - `zoomOnPinch={false}`
  - `zoomOnDoubleClick={false}`
  - `nodesConnectable={false}`
  - `elementsSelectable={false}`
  - `preventScrolling={true}`

## Verification Plan
- Load the Tauri app (`npm run tauri dev`).
- Run a team task and verify that the workflow graph centers and scales automatically as nodes display their active status.
- Resize the Tauri app window and ensure the graph scales accordingly.
- Try dragging nodes, double-clicking, pinching, or using the scroll wheel on the graph, and verify that the viewport remains locked and centered.
