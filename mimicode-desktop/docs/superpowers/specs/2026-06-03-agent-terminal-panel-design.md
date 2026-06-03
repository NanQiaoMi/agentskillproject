# MIMIcode Studio Agent Terminal Panel Design

## Objective
Redesign the Agent Terminal Panel (PTY) to support running multiple CLI agent sessions simultaneously, optimize the layout for split-screen tiling, add maximize capabilities, and fix UI styling issues (like the unreadable black text on the select dropdown).

## Architecture & Data Management
- **State Management**: Instead of a single `isRunning` and `sessionKey`, the panel will maintain a dictionary of active sessions mapped by `agentId`:
  `type SessionMap = Record<string, { sessionKey: string }>`
- **Constraints**: Enforce a "One Active Session Per Agent" rule to avoid concurrent writes/locks to the same workspace by the identical CLI executable.
- **PTY Handling**: 
  - Each active session spawns its own `xterm.js` Terminal instance.
  - Sub-component `<AgentTerminalInstance />` encapsulates the setup, rendering, resizing, and cleanup of an individual xterm terminal linked to a specific `sessionKey`.

## UI/UX Components

### 1. Panel Header & Controls
- **Left Side**:
  - Agent dropdown selector (styling fixed with high-contrast text color `#c0caf5`).
  - Contextual Action Button: If the selected agent is NOT running, show "Start". If running, show "Focus/View" (switches active tab) and a separate "Stop" button.
- **Center / Navigation**:
  - **Tabs Bar**: A list of active session tabs displaying the agent icon, name, and a close/stop `x` button.
  - **Layout Toggle**: A toggle switch between **Tabbed View** (single terminal active) and **Grid View** (all active terminals tiled).
- **Right Side**:
  - **Maximize Toggle**: Expands the floating panel from its default size (e.g., 600x480px) to maximize inside the main content area (e.g. `left: 300px`, `right: 20px`, `top: 60px`, `bottom: 20px`), providing a massive workspace for grid tiling.
  - **Collapse/Close**: Minimizes the panel back to its trigger pill.

### 2. View Modes
- **Tabbed Mode (`layoutMode === 'tabs'`)**: Only the active session's `<AgentTerminalInstance />` is visible (others are hidden via CSS `display: none` to preserve their PTY state and scrollback buffers).
- **Grid Mode (`layoutMode === 'grid'`)**: All active sessions are displayed in a responsive CSS Grid.
  - 1 session: 100% width, 100% height
  - 2 sessions: 1 column, 2 rows (split top/bottom) or 2 columns, 1 row (split left/right)
  - 3-4 sessions: 2x2 grid layout
  - Each tile has a minimal header displaying the agent's name/icon to identify the terminal.

### 3. Styling Changes
- Fix `.pty-agent-select` text color to `#f8fafc`.
- Update `.pty-panel-expanded` with dynamic width/height and transitions for the Maximized state.
- Add `.pty-tabs-container`, `.pty-grid-container`, and `.pty-tile-header` CSS classes to support the new layouts.

## Verification
- Test starting 2+ different CLIs (e.g., Gemini CLI and Claude Code).
- Verify typing works in each respective terminal.
- Toggle between Tabbed and Grid modes; ensure terminals resize correctly (triggering `fitAddon` and Tauri backend resize events).
- Maximize the panel and verify it fills the main content area gracefully.
