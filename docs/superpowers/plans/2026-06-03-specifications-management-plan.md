# Specifications View Dynamic Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully implement specifications management, allowing users to dynamically read, write, and edit PRD, Design, Architecture, and API Contracts markdown files directly in the desktop application, alongside an interactive, editable architecture diagram synchronized back to ARCHITECTURE.md.

**Architecture:** Define two custom Tauri commands in Rust to read and write physical files securely. In React, load the files based on the active tab and render them with a custom lightweight Markdown parser. The Architecture tab extracts and writes diagram layout data via embedded HTML comments containing JSON metadata, providing real-time graphical synchronization.

**Tech Stack:** Tauri v2, Rust, React, TypeScript, Tailwind/CSS Variables

---

### Task 1: Tauri Backend File Commands (Rust)

**Files:**
- Modify: [lib.rs](file:///d:/agentcode/mimicode-desktop/src-tauri/src/lib.rs) (Add file read/write APIs and register them)
- Test: [lib.rs](file:///d:/agentcode/mimicode-desktop/src-tauri/src/lib.rs) (Add Rust unit tests for new APIs)

- [ ] **Step 1: Write file read/write Tauri commands and register them**
  Modify `src-tauri/src/lib.rs` to add `read_file_content` and `write_file_content` functions, and add them to the `generate_handler!` registration.
  Code to add:
  ```rust
  #[tauri::command]
  fn read_file_content(path: String) -> Result<String, String> {
      let p = std::path::Path::new(&path);
      if !p.exists() {
          return Ok("FILE_NOT_FOUND".to_string());
      }
      std::fs::read_to_string(p).map_err(|e| e.to_string())
  }

  #[tauri::command]
  fn write_file_content(path: String, content: String) -> Result<(), String> {
      let p = std::path::Path::new(&path);
      if let Some(parent) = p.parent() {
          std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
      }
      std::fs::write(p, content).map_err(|e| e.to_string())
  }
  ```
  Register in `run()` inside `lib.rs`:
  ```rust
          .invoke_handler(tauri::generate_handler![
              // ... existing handlers ...
              read_file_content,
              write_file_content,
          ])
  ```

- [ ] **Step 2: Add Rust unit tests in `lib.rs`**
  Add unit tests at the end of `src-tauri/src/lib.rs`:
  ```rust
      #[test]
      fn test_file_read_write_api() {
          let test_path = "D:\\agentcode\\docs\\test_spec.md".to_string();
          let test_content = "# Hello World\nThis is a test.".to_string();
          
          let res_write = write_file_content(test_path.clone(), test_content.clone());
          assert!(res_write.is_ok());
          
          let res_read = read_file_content(test_path.clone());
          assert!(res_read.is_ok());
          assert_eq!(res_read.unwrap(), test_content);
          
          // Cleanup
          std::fs::remove_file(test_path).ok();
      }
  ```

- [ ] **Step 3: Run Rust unit tests to verify they pass**
  Run: `cargo test` inside `mimicode-desktop/src-tauri` directory.
  Expected: All tests pass.

- [ ] **Step 4: Commit changes**
  ```bash
  git add src-tauri/src/lib.rs
  git commit -m "feat: add read_file_content and write_file_content Tauri commands"
  ```

---

### Task 2: Front-end Document Integration Setup

**Files:**
- Modify: [App.tsx](file:///d:/agentcode/mimicode-desktop/src/App.tsx) (Pass projectPath prop to SpecificationsView)
- Modify: [SpecificationsView.tsx](file:///d:/agentcode/mimicode-desktop/src/views/SpecificationsView.tsx) (Props and dynamic loading logic)

- [ ] **Step 1: Modify `App.tsx` to pass `projectPath`**
  ```tsx
  // In App.tsx: line 125
  return <SpecificationsView projectPath={projectPath} />;
  ```

- [ ] **Step 2: Modify `SpecificationsView.tsx` props and setup document states**
  Update `SpecificationsView` signature to accept `projectPath: string`. Add states for active tab, editor mode, markdown content, loading state, and selected tab.
  ```typescript
  interface SpecificationsViewProps {
    projectPath: string;
  }

  export const SpecificationsView: React.FC<SpecificationsViewProps> = ({ projectPath }) => {
    const [activeTab, setActiveTab] = useState('Architecture'); // PRD, Design, Architecture, API Contracts
    const [content, setContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // File path mapping
    const getFilePath = (tab: string) => {
      const filename = tab === 'API Contracts' ? 'API_CONTRACTS.md' : `${tab.toUpperCase()}.md`;
      return `${projectPath}\\docs\\${filename}`;
    };
  ```

- [ ] **Step 3: Load document content from Tauri on tab change or mount**
  Add `useEffect` hook to dynamically fetch file content.
  ```typescript
    const loadContent = async (tab: string) => {
      setIsLoading(true);
      try {
        const filePath = getFilePath(tab);
        const res: string = await invoke('read_file_content', { path: filePath });
        if (res === 'FILE_NOT_FOUND') {
          setContent('');
        } else {
          setContent(res);
        }
      } catch (err) {
        console.error("Failed to load specifications", err);
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      loadContent(activeTab);
      setIsEditing(false);
    }, [activeTab, projectPath]);
  ```

- [ ] **Step 4: Commit changes**
  ```bash
  git add src/App.tsx src/views/SpecificationsView.tsx
  git commit -m "feat: integrate projectPath and file loading in SpecificationsView"
  ```

---

### Task 3: Markdown Parsing and Double-Column Editor UI

**Files:**
- Modify: [SpecificationsView.tsx](file:///d:/agentcode/mimicode-desktop/src/views/SpecificationsView.tsx) (Implement markdown rendering & UI structure)

- [ ] **Step 1: Implement `parseMarkdown` function**
  Add regex compilation function:
  ```typescript
  const parseMarkdown = (md: string): string => {
    if (!md) return '<div class="text-muted" style="padding:20px;text-align:center;">此规范文档目前为空，点击编辑以添加内容。</div>';
    
    // Hide embedded json diagram
    let cleanMd = md.replace(/<!--\s*architecture_diagram[\s\S]*?-->/g, '');
    
    let html = cleanMd
      .replace(/^# (.*?)$/gm, '<h1 class="markdown-h1" style="font-size: 20px; font-weight: 600; color: var(--color-text-main); margin-bottom: 16px; border-bottom: 1px solid var(--color-border); padding-bottom: 8px;">$1</h1>')
      .replace(/^## (.*?)$/gm, '<h2 class="markdown-h2" style="font-size: 16px; font-weight: 600; color: var(--color-text-main); margin-top: 24px; margin-bottom: 12px;">$1</h2>')
      .replace(/^### (.*?)$/gm, '<h3 class="markdown-h3" style="font-size: 14px; font-weight: 600; color: var(--color-text-main); margin-top: 16px; margin-bottom: 8px;">$1</h3>')
      .replace(/^- \[ \] (.*?)$/gm, '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><input type="checkbox" disabled style="accent-color:var(--color-primary-orange)" /><span>$1</span></div>')
      .replace(/^- \[x\] (.*?)$/gm, '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;opacity:0.6;text-decoration:line-through;"><input type="checkbox" checked disabled style="accent-color:var(--color-primary-orange)" /><span>$1</span></div>')
      .replace(/^- (.*?)$/gm, '<li style="margin-left: 20px; margin-bottom: 6px; color: var(--color-text-secondary);">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--color-text-main); font-weight: 600;">$1</strong>')
      .replace(/`(.*?)`/g, '<code style="font-family: var(--font-mono); font-size: 12px; background-color: var(--bg-hover); padding: 2px 6px; border-radius: 4px; color: var(--color-primary-orange);">$1</code>')
      .replace(/```(.*?)\n([\s\S]*?)```/g, '<pre style="background-color: var(--bg-terminal); color: #E2E8F0; padding: 16px; border-radius: var(--radius-md); overflow-x: auto; font-family: var(--font-mono); font-size: 13px; margin: 16px 0;"><code class="language-$1">$2</code></pre>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: var(--color-primary-orange); text-decoration: none;">$1</a>');

    // Paragraph wrapping for loose lines
    html = html.split('\n\n').map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<div') || trimmed.startsWith('<li') || trimmed.startsWith('<pre') || trimmed.startsWith('<ul')) {
        return trimmed;
      }
      return `<p style="margin-bottom: 12px; line-height: 1.6; color: var(--color-text-secondary);">${trimmed}</p>`;
    }).join('\n');

    return html;
  };
  ```

- [ ] **Step 2: Update View UI with dynamic editor layout**
  Update the main return structure of `SpecificationsView.tsx`. Make the "Edit" button switch `isEditing` to true, loading `content` into `editContent`.
  Render a textarea on the left and `parseMarkdown(editContent)` on the right side-by-side when in edit mode.
  Include dynamic saves using `invoke('write_file_content', { path: getFilePath(activeTab), content: editContent })`.
  Ensure beautiful layout using Zinc theme variables.

- [ ] **Step 3: Commit changes**
  ```bash
  git add src/views/SpecificationsView.tsx
  git commit -m "feat: add markdown parser and split-screen editor UI in SpecificationsView"
  ```

---

### Task 4: Interactive Architecture Diagram Component

**Files:**
- Modify: [SpecificationsView.tsx](file:///d:/agentcode/mimicode-desktop/src/views/SpecificationsView.tsx) (Extract embedded diagram metadata, render visual editor)

- [ ] **Step 1: Extract diagram nodes JSON metadata**
  Create functions to read and write the architecture nodes inside `SpecificationsView.tsx`.
  ```typescript
  interface ArchNode {
    id: string;
    title: string;
    subtitle: string;
    type: 'frontend' | 'gateway' | 'backend' | 'database' | 'cache' | 'storage';
  }

  const defaultNodes: ArchNode[] = [
    { id: 'fe', title: 'Frontend', subtitle: 'React 18 + TS', type: 'frontend' },
    { id: 'gt', title: 'API Gateway', subtitle: 'Tauri IPC', type: 'gateway' },
    { id: 'be', title: 'Backend', subtitle: 'FastAPI', type: 'backend' },
    { id: 'db', title: 'PostgreSQL', subtitle: 'DB', type: 'database' },
    { id: 'cache', title: 'Redis', subtitle: 'Cache', type: 'cache' },
    { id: 'store', title: 'MinIO', subtitle: 'Storage', type: 'storage' },
  ];

  const parseArchNodes = (docContent: string): ArchNode[] => {
    const match = docContent.match(/<!--\s*architecture_diagram\s*\n([\s\S]*?)\n-->/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed && Array.isArray(parsed.nodes)) {
          return parsed.nodes;
        }
      } catch (e) {
        console.error("Failed to parse visual architecture nodes", e);
      }
    }
    return defaultNodes;
  };
  ```

- [ ] **Step 2: Implement node editor dialog and diagram update logic**
  Add state variables:
  `const [nodes, setNodes] = useState<ArchNode[]>(defaultNodes);`
  `const [selectedNode, setSelectedNode] = useState<ArchNode | null>(null);`
  
  When user clicks a node, open an editing popup. Let the user edit `title`, `subtitle`, and select `type`.
  Update document content on save by replacing/appending:
  ```typescript
  const saveNodesToDoc = (nodesList: ArchNode[], baseContent: string): string => {
    const jsonStr = JSON.stringify({ nodes: nodesList }, null, 2);
    const commentBlock = `\n\n<!-- architecture_diagram\n${jsonStr}\n-->`;
    
    const hasComment = /<!--\s*architecture_diagram[\s\S]*?-->/.test(baseContent);
    if (hasComment) {
      return baseContent.replace(/<!--\s*architecture_diagram[\s\S]*?-->/, `<!-- architecture_diagram\n${jsonStr}\n-->`);
    } else {
      return baseContent + commentBlock;
    }
  };
  ```

- [ ] **Step 3: Render dynamic nodes and connections**
  Use the state `nodes` to map items dynamically into columns and render connections.
  Add visual style highlighting based on node type.

- [ ] **Step 4: Commit changes**
  ```bash
  git add src/views/SpecificationsView.tsx
  git commit -m "feat: complete interactive architecture diagram and data sync in SpecificationsView"
  ```

---

### Task 5: Compilation and E2E Verification

- [ ] **Step 1: Check build for TypeScript and compilation errors**
  Run: `npm run build` inside `mimicode-desktop` folder.
  Expected: Successful compilation without errors.

- [ ] **Step 2: Create mock files for manual verification**
  Run commands to create initial test files under `docs/` and run the development server to verify the UI loads and updates them correctly.

- [ ] **Step 3: Commit all remaining files**
  ```bash
  git commit -am "chore: polish SpecificationsView implementation"
  ```
