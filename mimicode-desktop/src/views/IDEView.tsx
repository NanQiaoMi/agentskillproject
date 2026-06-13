import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { Icons } from '../components/Icons';
import { IntegratedTerminal } from '../components/IntegratedTerminal';
import { LogViewer } from '../components/LogViewer';
import { SettingsModal } from '../components/SettingsModal';
import { CommandPalette } from '../components/CommandPalette';
import { List } from 'react-window';
// @ts-ignore
import { AutoSizer } from 'react-virtualized-auto-sizer';

interface IDEViewProps {
  projectPath: string | null;
}

export const IDEView: React.FC<IDEViewProps> = ({ projectPath }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openedFiles, setOpenedFiles] = useState<{path: string; content: string}[]>([]);
  const openedFilesRef = useRef(openedFiles);
  openedFilesRef.current = openedFiles;
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [contextMenu, setContextMenu] = useState<{ path: string; x: number; y: number; isFolder?: boolean } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // New state for Git and Search
  const [activeTab, setActiveTab] = useState<'explorer' | 'git' | 'search'>('explorer');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMatchCase, setSearchMatchCase] = useState(false);
  const [searchRegex, setSearchRegex] = useState(false);
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [jumpToLine, setJumpToLine] = useState<number | null>(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string | null>(null);

  // Terminal State
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'terminal' | 'output'>('terminal');
  const [terminalHeight, setTerminalHeight] = useState(300);
  const [isTerminalResizing, setIsTerminalResizing] = useState(false);
  const isTerminalResizingRef = useRef(false);
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const editorsRef = useRef<any[]>([]);

  const startTerminalResizing = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsTerminalResizing(true);
    isTerminalResizingRef.current = true;
  }, []);

  const stopTerminalResizing = React.useCallback(() => {
    if (isTerminalResizingRef.current) {
      setIsTerminalResizing(false);
      isTerminalResizingRef.current = false;
      if (terminalContainerRef.current) {
        setTerminalHeight(parseInt(terminalContainerRef.current.style.height || '300', 10));
      }
    }
  }, []);

  const resizeTerminal = React.useCallback(
    (e: MouseEvent) => {
      if (isTerminalResizingRef.current) {
        const newHeight = window.innerHeight - e.clientY - 24; // approx bottom offset
        if (newHeight > 100 && newHeight < 800) {
          if (terminalContainerRef.current) {
            terminalContainerRef.current.style.height = `${newHeight}px`;
          }
        }
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener('mousemove', resizeTerminal);
    window.addEventListener('mouseup', stopTerminalResizing);
    return () => {
      window.removeEventListener('mousemove', resizeTerminal);
      window.removeEventListener('mouseup', stopTerminalResizing);
    };
  }, [resizeTerminal, stopTerminalResizing]);

  const handleGlobalSearch = async () => {
    if (!projectPath || !searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await invoke<any[]>('search_codebase', {
        projectPath,
        query: searchQuery,
        matchCase: searchMatchCase,
        isRegex: searchRegex
      });
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGlobalReplace = async () => {
    if (!projectPath || !searchQuery.trim() || searchResults.length === 0) return;
    setIsReplacing(true);
    try {
      const uniquePaths = Array.from(new Set(searchResults.map(r => r.path)));
      const replacedCount = await invoke<number>('replace_in_files', {
        projectPath,
        query: searchQuery,
        replacement: replaceQuery,
        matchCase: searchMatchCase,
        isRegex: searchRegex,
        paths: uniquePaths
      });
      await handleGlobalSearch();
      (window as any).showToast?.(`Replaced in ${replacedCount} file(s)`, "success");
    } catch (err: any) {
      console.error('Replace failed:', err);
      (window as any).showToast?.('Replace failed: ' + err.toString(), "error");
    } finally {
      setIsReplacing(false);
    }
  };


  const [gitStatus, setGitStatus] = useState<string>('');
  const [commitMsg, setCommitMsg] = useState('');
  const [gitLoading, setGitLoading] = useState(false);

  // Settings loaded from localStorage
  const [fontSize, setFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(4);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');
  const [autoSave, setAutoSave] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleSettingsChange = (key: string, value: any) => {
    if (key === 'fontSize') {
      setFontSize(value);
      localStorage.setItem('mimi-editor-font-size', value.toString());
    } else if (key === 'tabSize') {
      setTabSize(value);
      localStorage.setItem('mimi-editor-tab-size', value.toString());
    } else if (key === 'wordWrap') {
      setWordWrap(value);
      localStorage.setItem('mimi-editor-word-wrap', value);
    } else if (key === 'autoSave') {
      setAutoSave(value);
      localStorage.setItem('mimi-editor-auto-save', value.toString());
    }
  };

  // Phase 2 states
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = React.useRef(false);
  const sidebarContainerRef = React.useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'diff'>('editor');
  const [diffOriginalContent, setDiffOriginalContent] = useState('');
  const editorRef = React.useRef<any>(null);

  // Split Editor states
  const [splitLeftWidth, setSplitLeftWidth] = useState<number | string>('50%');
  const [isSplitResizing, setIsSplitResizing] = useState(false);
  const isSplitResizingRef = React.useRef(false);
  const mainEditorContainerRef = React.useRef<HTMLDivElement>(null);

  const startResizing = React.useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
    isResizingRef.current = true;
  }, []);

  const stopResizing = React.useCallback(() => {
    if (isResizingRef.current) {
      setIsResizing(false);
      isResizingRef.current = false;
      if (sidebarContainerRef.current) {
        setSidebarWidth(parseInt(sidebarContainerRef.current.style.width || '260', 10));
      }
    }
  }, []);

  const startSplitResizing = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsSplitResizing(true);
    isSplitResizingRef.current = true;
  }, []);

  const stopSplitResizing = React.useCallback(() => {
    if (isSplitResizingRef.current) {
      setIsSplitResizing(false);
      isSplitResizingRef.current = false;
      if (mainEditorContainerRef.current) {
        setSplitLeftWidth(parseInt(mainEditorContainerRef.current.style.width || '500', 10));
      }
    }
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizingRef.current) {
        const newWidth = mouseMoveEvent.clientX - 48; // 48px is the left activity bar
        if (newWidth > 150 && newWidth < 800) {
          if (sidebarContainerRef.current) {
            sidebarContainerRef.current.style.width = `${newWidth}px`;
          }
        }
      }
      if (isSplitResizingRef.current) {
        const sidebarW = parseInt(sidebarContainerRef.current?.style.width || sidebarWidth.toString(), 10);
        const newWidth = mouseMoveEvent.clientX - 48 - sidebarW;
        if (newWidth > 100 && newWidth < window.innerWidth - 48 - sidebarW - 100) {
          if (mainEditorContainerRef.current) {
            mainEditorContainerRef.current.style.width = `${newWidth}px`;
          }
        }
      }
    },
    [sidebarWidth]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    window.addEventListener('mouseup', stopSplitResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('mouseup', stopSplitResizing);
    };
  }, [resize, stopResizing, stopSplitResizing]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    if (!editorsRef.current.includes(editor)) {
      editorsRef.current.push(editor);
    }

    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.trigger('anyString', 'editor.action.quickCommand');
    }
  };

  const handleOpenCommandPalette = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.trigger('anyString', 'editor.action.quickCommand');
    }
  };

  const loadGitDiff = async (path: string) => {
    try {
      if (!projectPath) return;
      const separator = projectPath.includes('/') ? '/' : '\\';
      const relativePath = path.replace(projectPath + separator, '');
      const original = await invoke<string>('run_shell_command', { 
        command: `git show HEAD:"${relativePath}"`,
        cwd: projectPath
      });
      if (original.includes('fatal:') && original.includes('does not exist')) {
        setDiffOriginalContent('');
      } else {
        setDiffOriginalContent(original);
      }
      setViewMode('diff');
    } catch (e) {
      console.warn("Could not load original file for diff", e);
      setViewMode('editor');
    }
  };

  useEffect(() => {
    const loadSettings = () => {
      const rawFontSize = localStorage.getItem('mimi-editor-font-size');
      const rawAutoSave = localStorage.getItem('mimi-editor-auto-save');
      const rawTabSize = localStorage.getItem('mimi-editor-tab-size');
      const rawWordWrap = localStorage.getItem('mimi-editor-word-wrap');

      if (rawFontSize) setFontSize(parseInt(rawFontSize, 10));
      if (rawAutoSave) setAutoSave(rawAutoSave === 'true');
      if (rawTabSize) setTabSize(parseInt(rawTabSize, 10));
      if (rawWordWrap) setWordWrap(rawWordWrap as 'on'|'off');
    };

    loadSettings();

    window.addEventListener('mimi-editor-settings-updated', loadSettings);
    return () => window.removeEventListener('mimi-editor-settings-updated', loadSettings);
  }, []);

  const fetchFiles = async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      const result = await invoke<string>("read_dir_recursive", { path: projectPath });
      setFiles(result.split('\n').filter(Boolean));
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    
    const fetchGitStatus = async () => {
      if (!projectPath) return;
      try {
        const result = await invoke<string>("get_git_status", { repoPath: projectPath });
        setGitStatus(result);
      } catch (err) {
        console.error("Failed to fetch git status:", err);
      }
    };

    fetchFiles();
    fetchGitStatus();
  }, [projectPath]);

  const handleFileClick = async (file: string, lineNumber?: number, query?: string) => {
    if (lineNumber !== undefined) setJumpToLine(lineNumber);
    if (query !== undefined) setActiveSearchQuery(query);
    if (!projectPath) return;
    
    // git status returns directories with a trailing slash for untracked folders
    if (file.endsWith('/') || file.endsWith('\\')) {
      return;
    }

    const separator = projectPath.includes('/') ? '/' : '\\';
    const filePath = file.startsWith(projectPath) ? file : projectPath + separator + file;

    const existing = openedFilesRef.current.find(f => f.path === filePath);
    if (existing) {
      setActiveFilePath(filePath);
      if (activeTab === 'git') loadGitDiff(filePath);
      else setViewMode('editor');
      return;
    }

    setFileError('');
    setFileLoading(true);
    try {
      const content = await invoke<string>('read_file_content', { path: filePath });
      setOpenedFiles(prev => [...prev, { path: filePath, content }]);
      setActiveFilePath(filePath);
      if (activeTab === 'git') loadGitDiff(filePath);
      else setViewMode('editor');
    } catch (err: any) {
      setFileError(err.toString());
    } finally {
      setFileLoading(false);
    }
  };

  useEffect(() => {
    if (jumpToLine !== null && editorRef.current && activeFilePath) {
      editorRef.current.revealLineInCenter(jumpToLine);
      editorRef.current.setPosition({ lineNumber: jumpToLine, column: 1 });
      setJumpToLine(null);
      if (activeSearchQuery) {
        // highlight logic can be added later
      }
    }
  }, [activeFilePath, jumpToLine, editorRef.current, activeSearchQuery]);

  const handleEditorChange = async (value: string | undefined) => {
    if (value === undefined || !activeFilePath) return;
    setOpenedFiles(prev => prev.map(f => f.path === activeFilePath ? { ...f, content: value } : f));
    
    if (autoSave) {
      try {
        await invoke('write_file_content', { path: activeFilePath, content: value });
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }
  };

  const [splitFile, setSplitFile] = useState<string | null>(null);

  // Mouse-based Drag System (bypasses WebView2 DnD restrictions entirely)
  const [mouseDrag, setMouseDrag] = useState<{
    file: string;
    x: number;
    y: number;
    dropZone: 'left' | 'right' | null;
    active: boolean; // becomes true after moving 5px from start
    startX: number;
    startY: number;
  } | null>(null);
  const mouseDragRef = useRef(mouseDrag);
  mouseDragRef.current = mouseDrag;

  const startMouseDrag = (filePath: string, e: React.MouseEvent) => {
    e.preventDefault();
    setMouseDrag({
      file: filePath,
      x: e.clientX,
      y: e.clientY,
      dropZone: null,
      active: false,
      startX: e.clientX,
      startY: e.clientY
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = mouseDragRef.current;
      if (!drag) return;
      
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const active = drag.active || Math.sqrt(dx * dx + dy * dy) > 5;
      
      if (!active) return;
      
      const isRightHalf = e.clientX > window.innerWidth / 2;
      setMouseDrag({
        ...drag,
        x: e.clientX,
        y: e.clientY,
        dropZone: isRightHalf ? 'right' : 'left',
        active: true
      });
    };

    const handleMouseUp = async (e: MouseEvent) => {
      const drag = mouseDragRef.current;
      if (!drag) return;

      if (!drag.active) {
        // Was just a click, not a drag
        handleFileClick(drag.file);
        setMouseDrag(null);
        return;
      }
      
      const filePath = drag.file;
      const isRightHalf = e.clientX > window.innerWidth / 2;
      setMouseDrag(null);

      // Ensure the file is loaded into openedFiles
      const existing = openedFilesRef.current.find(f => f.path === filePath);
      if (!existing) {
        try {
          const content = await invoke<string>('read_file_content', { path: filePath });
          setOpenedFiles(prev => {
            if (prev.find(f => f.path === filePath)) return prev;
            return [...prev, { path: filePath, content }];
          });
        } catch (err) {
          console.error('Failed to load file for drag:', err);
          return;
        }
      }

      if (isRightHalf) {
        setSplitFile(filePath);
      } else {
        setActiveFilePath(filePath);
        setViewMode('editor');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Auto Save
  useEffect(() => {
    if (autoSave && activeFilePath && projectPath) {
      const timer = setTimeout(async () => {
        const file = openedFiles.find(f => f.path === activeFilePath);
        if (file) {
          let contentToSave = file.content;
          if (editorRef.current) {
            const action = editorRef.current.getAction('editor.action.formatDocument');
            if (action) {
              await action.run();
              const formattedContent = editorRef.current.getValue();
              if (formattedContent && formattedContent !== contentToSave) {
                contentToSave = formattedContent;
                setOpenedFiles(prev => prev.map(f => f.path === activeFilePath ? { ...f, content: formattedContent } : f));
              }
            }
          }
          invoke('write_file_content', { path: activeFilePath, content: contentToSave }).catch(console.error);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [openedFiles, autoSave, activeFilePath, projectPath]);



  const handleManualSave = async () => {
    if (activeFilePath) {
      try {
        const file = openedFiles.find(f => f.path === activeFilePath);
        if (file) {
          let contentToSave = file.content;
          if (editorRef.current) {
            const action = editorRef.current.getAction('editor.action.formatDocument');
            if (action) {
              await action.run();
              const formattedContent = editorRef.current.getValue();
              if (formattedContent && formattedContent !== contentToSave) {
                contentToSave = formattedContent;
                setOpenedFiles(prev => prev.map(f => f.path === activeFilePath ? { ...f, content: formattedContent } : f));
              }
            }
          }
          await invoke('write_file_content', { path: activeFilePath, content: contentToSave });
          (window as any).showToast?.("File saved successfully", "success");
        }
      } catch (err: any) {
        (window as any).showToast?.("Save failed: " + err.toString(), "error");
      }
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle Terminal: Ctrl + `
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
      }
      
      // Save File: Ctrl + S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (!autoSave) handleManualSave();
      }

      // Command Palette: F1
      if (e.key === 'F1') {
        e.preventDefault();
        handleOpenCommandPalette();
      }

      // Quick Open: Ctrl+P / Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }

      // Format Document: Shift + Alt + F
      if (e.shiftKey && e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        const editor = editorRef.current;
        if (editor) {
          editor.focus();
          const action = editor.getAction('editor.action.formatDocument');
          if (action) {
            action.run();
          } else {
            editor.trigger('keyboard', 'editor.action.selectAll', null);
            setTimeout(() => {
              editor.trigger('keyboard', 'editor.action.indentLines', null);
              const pos = editor.getPosition();
              if (pos) editor.setSelection({ startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column });
            }, 50);
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [autoSave, activeFilePath, openedFiles]);


  const handleCreateFile = async (targetPath: string, isFolder: boolean) => {
    setContextMenu(null);
    const name = prompt("Enter new file name:");
    if (!name) return;
    const separator = projectPath?.includes('/') ? '/' : '\\';
    const folderPath = isFolder ? targetPath : targetPath.substring(0, targetPath.lastIndexOf(separator));
    const path = folderPath + separator + name;
    try {
      await invoke('create_file', { path });
      fetchFiles();
    } catch (err: any) {
      alert("Failed to create file: " + err);
    }
  };

  const handleCreateFolder = async (targetPath: string, isFolder: boolean) => {
    setContextMenu(null);
    const name = prompt("Enter new folder name:");
    if (!name) return;
    const separator = projectPath?.includes('/') ? '/' : '\\';
    const folderPath = isFolder ? targetPath : targetPath.substring(0, targetPath.lastIndexOf(separator));
    const path = folderPath + separator + name;
    try {
      await invoke('create_folder', { path });
      fetchFiles();
    } catch (err: any) {
      alert("Failed to create folder: " + err);
    }
  };

  const handleRename = async (oldPath: string) => {
    setContextMenu(null);
    const separator = projectPath?.includes('/') ? '/' : '\\';
    const currentName = oldPath.split(separator).pop();
    const name = prompt("Enter new name:", currentName);
    if (!name || name === currentName) return;
    const folderPath = oldPath.substring(0, oldPath.lastIndexOf(separator));
    const newPath = folderPath + separator + name;
    try {
      await invoke('rename_path', { oldPath, newPath });
      fetchFiles();
    } catch (err: any) {
      alert("Failed to rename: " + err);
    }
  };

  const handleDelete = async (path: string) => {
    setContextMenu(null);
    const separator = projectPath?.includes('/') ? '/' : '\\';
    const name = path.split(separator).pop();
    if (window.confirm(`Are you sure you want to delete '${name}'?`)) {
      try {
        await invoke('delete_path', { path });
        fetchFiles();
        if (activeFilePath === path) setActiveFilePath(null);
        setOpenedFiles(prev => prev.filter(f => f.path !== path));
      } catch (err: any) {
        alert("Failed to delete: " + err);
      }
    }
  };

  const getLanguageFromFilename = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'py':
        return 'python';
      case 'json':
        return 'json';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'md':
        return 'markdown';
      case 'rs':
        return 'rust';
      default:
        return 'plaintext';
    }
  };

  const handleCommit = async () => {
    if (!projectPath || !commitMsg.trim()) return;
    setGitLoading(true);
    try {
      // Run git add .
      await invoke('run_shell_command', { command: 'git', args: ['add', '.'], cwd: projectPath });
      // Run git commit
      await invoke('run_shell_command', { command: 'git', args: ['commit', '-m', commitMsg], cwd: projectPath });
      
      setCommitMsg('');
      (window as any).showToast?.("Commit successful", "success");
      
      // Refresh git status
      const result = await invoke<string>("get_git_status", { repoPath: projectPath });
      setGitStatus(result);
    } catch (err: any) {
      (window as any).showToast?.("Commit failed: " + err.toString(), "error");
    } finally {
      setGitLoading(false);
    }
  };

  // Build tree structure
  const buildTree = (paths: string[]) => {
    const root: any = { name: 'root', path: '', children: {}, isDir: true };
    const separator = projectPath?.includes('/') ? '/' : '\\';
    
    paths.forEach(p => {
      let relativePath = p;
      if (projectPath && p.startsWith(projectPath)) {
        relativePath = p.substring(projectPath.length + 1);
      }
      
      const parts = relativePath.split(/[\\/]/);
      let current = root;
      
      let currentPath = projectPath || '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;
        currentPath = currentPath ? currentPath + separator + part : part;
        
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            isDir: i < parts.length - 1, // Intermediate nodes are always dirs
            children: {}
          };
        }
        current = current.children[part];
      }
    });
    
    return root;
  };

  const toggleFolder = (e: React.MouseEvent, folderPath: string) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };


  const fileTree = React.useMemo(() => buildTree(files), [files, projectPath]);

  const flattenTree = (node: any, depth = 0, result: any[] = []) => {
    if (node.name === 'root') {
      const sortedKeys = Object.keys(node.children).sort((a, b) => {
        const aIsDir = node.children[a].isDir;
        const bIsDir = node.children[b].isDir;
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
      });
      sortedKeys.forEach(k => flattenTree(node.children[k], depth, result));
      return result;
    }

    result.push({ ...node, depth });

    const isExpanded = expandedFolders.has(node.path);
    if (node.isDir && isExpanded) {
      const sortedKeys = Object.keys(node.children).sort((a, b) => {
        const aIsDir = node.children[a].isDir;
        const bIsDir = node.children[b].isDir;
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
      });
      sortedKeys.forEach(k => flattenTree(node.children[k], depth + 1, result));
    }

    return result;
  };

  const flattenedNodes = React.useMemo(() => {
    if (!fileTree || Object.keys(fileTree).length === 0) return [];
    return flattenTree(fileTree);
  }, [fileTree, expandedFolders]);

  const TreeRow = ({ index, style }: any) => {
    const node = flattenedNodes[index];
    if (!node) return null;
    const { depth } = node;
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = activeFilePath === node.path;

    return (
      <div style={style} key={node.path}>
        <div
          className="tree-item hover-scale"
          onMouseDown={(e) => { if (!node.isDir) startMouseDrag(node.path, e); }}
          style={{
            padding: `0px 16px 0px ${16 + depth * 12}px`,
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            cursor: node.isDir ? 'pointer' : 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
            color: isSelected ? 'var(--color-primary-orange)' : 'var(--color-text-main)',
            transition: 'background-color 0.2s ease, color 0.2s ease'
          }}
          onClick={(e) => {
            if (node.isDir) {
              toggleFolder(e, node.path);
            } else {
              handleFileClick(node.path);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ path: node.path, x: e.clientX, y: e.clientY, isFolder: node.isDir });
          }}
        >
          {node.isDir ? (
            <div style={{ display: 'flex', alignItems: 'center', opacity: 0.7, marginRight: '6px' }}>
              {isExpanded ? <Icons.ChevronDown width={12} height={12} style={{ marginRight: '4px' }} /> : <Icons.ChevronRight width={12} height={12} style={{ marginRight: '4px' }} />}
              {isExpanded ? <Icons.FolderOpen width={14} height={14} color="#E8A317" /> : <Icons.Folder width={14} height={14} color="#E8A317" />}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', opacity: 0.7, marginRight: '6px', paddingLeft: '16px' }}>
              <Icons.FileText width={14} height={14} color="#519aba" />
            </div>
          )}
          <span className="tree-label text-xs font-mono" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.name}
          </span>
        </div>
      </div>
    );
  };

  const editorOptions = React.useMemo(() => ({
    fontSize,
    tabSize,
    wordWrap,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 16 }
  }), [fontSize, tabSize, wordWrap]);

  const diffEditorOptions = React.useMemo(() => ({
    ...editorOptions,
    renderSideBySide: true,
    minimap: { enabled: false }
  }), [editorOptions]);

  const renderBreadcrumbs = (filePath: string) => {
    if (!filePath) return null;
    let relPath = filePath;
    if (projectPath && filePath.startsWith(projectPath)) {
      relPath = filePath.replace(projectPath + (projectPath.includes('/') ? '/' : '\\'), '');
    }
    const parts = relPath.split(/[\\/]/);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {parts.map((part, idx) => (
          <React.Fragment key={`${idx}-${part}`}>
            <span style={{ color: idx === parts.length - 1 ? '#e7e7e7' : '#858585' }}>
              {part}
            </span>
            {idx < parts.length - 1 && <span style={{ color: '#858585' }}>&gt;</span>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'row', height: '100%', overflow: 'hidden' }}>
      {/* Activity Bar */}
      <div style={{ width: '48px', borderRight: '1px solid var(--color-border)', backgroundColor: 'var(--bg-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '12px', gap: '16px' }}>
        <button 
          className="btn-icon-ghost" 
          style={{ width: '40px', height: '40px', color: activeTab === 'explorer' ? 'var(--color-primary-orange)' : 'var(--color-text-muted)', backgroundColor: activeTab === 'explorer' ? 'var(--bg-hover)' : 'transparent', borderRadius: '8px' }} 
          onClick={() => setActiveTab('explorer')}
          title="Explorer"
        >
          <Icons.FileText width={14} height={14} />
        </button>
        <button 
          className="btn-icon-ghost" 
          style={{ width: '40px', height: '40px', color: activeTab === 'git' ? 'var(--color-primary-orange)' : 'var(--color-text-muted)', backgroundColor: activeTab === 'git' ? 'var(--bg-hover)' : 'transparent', borderRadius: '8px' }} 
          onClick={() => setActiveTab('git')}
          title="Source Control"
        >
          <Icons.GitBranch width={14} height={14} />
        </button>
        <button 
          className="btn-icon-ghost" 
          style={{ width: '40px', height: '40px', color: activeTab === 'search' ? 'var(--color-primary-orange)' : 'var(--color-text-muted)', backgroundColor: activeTab === 'search' ? 'var(--bg-hover)' : 'transparent', borderRadius: '8px', marginTop: '8px' }} 
          onClick={() => setActiveTab('search')}
          title="Global Search"
        >
          <Icons.Search width={14} height={14} />
        </button>
        
        <div style={{ flex: 1 }} />
        
        <button 
          className="btn-icon-ghost" 
          style={{ width: '40px', height: '40px', color: settingsModalOpen ? 'var(--color-primary-orange)' : 'var(--color-text-muted)', backgroundColor: settingsModalOpen ? 'var(--bg-hover)' : 'transparent', borderRadius: '8px', marginBottom: '12px' }} 
          onClick={() => setSettingsModalOpen(true)}
          title="Settings"
        >
          <Icons.Settings width={16} height={16} />
        </button>
      </div>

      <div ref={sidebarContainerRef} className="file-tree-sidebar" style={{ width: `${sidebarWidth}px`, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--color-border)', backgroundColor: 'var(--bg-panel)', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'explorer' ? (
          <>
            <div className="tree-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <span className="font-semibold text-sm" style={{ color: 'var(--color-text-main)' }}>EXPLORER</span>
            </div>
            <div className="tree-content" style={{ padding: '8px 0', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {!projectPath && <div style={{ padding: '0 16px', color: 'var(--color-text-muted)', fontSize: '13px' }}>No project selected.</div>}
              {loading && <div style={{ padding: '0 16px', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading files...</div>}
              {error && <div style={{ padding: '0 16px', color: 'var(--color-destructive)', fontSize: '13px' }}>{error}</div>}
              {!loading && !error && (
                <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
                  <AutoSizer renderProp={({ height, width }: { height?: number; width?: number }) => {
                    if (!height || !width) return null;
                    return (
                      <List
                        rowCount={flattenedNodes.length}
                        rowHeight={26}
                        rowComponent={TreeRow}
                        rowProps={{}}
                        style={{ height, width }}
                      />
                    );
                  }} />
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'git' ? (
          <>
            <div className="tree-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center' }}>
              <span className="font-semibold text-sm" style={{ color: 'var(--color-text-main)' }}>SOURCE CONTROL</span>
              <span style={{ marginLeft: 'auto', backgroundColor: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {gitStatus ? gitStatus.split('\n').filter(Boolean).length : 0}
              </span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ position: 'relative' }}>
                <textarea 
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  placeholder="Message (Enter to commit)"
                  style={{ 
                    width: '100%', minHeight: '68px', padding: '10px 12px', 
                    backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-border)', 
                    borderRadius: '6px', color: 'var(--color-text-main)', fontSize: '13px', 
                    resize: 'vertical', outline: 'none', transition: 'border-color 0.2s',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleCommit} 
                disabled={gitLoading || !commitMsg.trim() || !gitStatus.trim()}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 0', borderRadius: '6px', fontWeight: 500 }}
              >
                {gitLoading ? <Icons.Loader className="spin" width={14} height={14} /> : <Icons.GitCommit width={14} height={14} />}
                Commit
              </button>
            </div>
            <div className="tree-content" style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '4px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                Changes
              </div>
              {!gitStatus.trim() ? (
                <div style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', fontStyle: 'italic' }}>
                  No changes detected.
                </div>
              ) : (
                gitStatus.split('\n').filter(Boolean).map((line, i) => {
                  const status = line.substring(0, 2);
                  const file = line.substring(3);
                  const filename = file.split(/[\\/]/).pop() || '';
                  const dirPath = file.substring(0, file.length - filename.length);
                  
                  let statusChar = 'M';
                  let color = 'var(--color-text-main)';
                  if (status.includes('M')) { color = '#E8A317'; statusChar = 'M'; }
                  else if (status.includes('A') || status.includes('?')) { color = '#10B981'; statusChar = 'U'; }
                  else if (status.includes('D')) { color = '#EF4444'; statusChar = 'D'; }

                  return (
                    <div
                      key={i}
                      className="tree-item hover-scale"
                      onClick={() => handleFileClick(file)}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '6px 12px', cursor: 'pointer',
                        backgroundColor: activeFilePath?.endsWith(file) ? 'var(--bg-hover)' : 'transparent',
                        borderRadius: '6px', marginBottom: '2px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', marginRight: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: color }}>{statusChar}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, gap: '6px' }}>
                        <span className="text-sm font-medium" style={{ color: activeFilePath?.endsWith(file) ? 'var(--color-primary-orange)' : 'var(--color-text-main)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {filename}
                        </span>
                        {dirPath && (
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', flex: 1, opacity: 0.6 }}>
                            {dirPath}
                          </span>
                        )}
                      </div>
                      <div style={{ 
                        color: color, 
                        fontSize: '10px', 
                        fontWeight: 700, 
                        width: '18px', 
                        height: '18px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderRadius: '4px',
                        backgroundColor: `${color}15`,
                        flexShrink: 0
                      }}>
                        {statusChar}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : activeTab === 'search' ? (
          <>
            <div className="tree-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <span className="font-semibold text-sm" style={{ color: 'var(--color-text-main)' }}>SEARCH</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid var(--color-border)' }}>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
                placeholder="Search"
                style={{ 
                  width: '100%', height: '28px', padding: '0 8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-main)', fontSize: '13px', outline: 'none' 
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setSearchMatchCase(!searchMatchCase)}
                  style={{ flex: 1, height: '24px', fontSize: '12px', borderRadius: '4px', backgroundColor: searchMatchCase ? 'rgba(249, 115, 22, 0.1)' : 'transparent', color: searchMatchCase ? 'var(--color-primary-orange)' : 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                >Aa</button>
                <button 
                  onClick={() => setSearchRegex(!searchRegex)}
                  style={{ flex: 1, height: '24px', fontSize: '12px', borderRadius: '4px', backgroundColor: searchRegex ? 'rgba(249, 115, 22, 0.1)' : 'transparent', color: searchRegex ? 'var(--color-primary-orange)' : 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                >.*</button>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <input 
                  type="text" 
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGlobalReplace()}
                  placeholder="Replace"
                  style={{ 
                    flex: 1, height: '28px', padding: '0 8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-main)', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)'
                  }}
                />
                <button 
                  onClick={handleGlobalReplace}
                  disabled={isReplacing || searchResults.length === 0}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', width: '28px', borderRadius: '4px', backgroundColor: 'var(--color-primary-orange)', color: 'white', border: 'none', cursor: (isReplacing || searchResults.length === 0) ? 'not-allowed' : 'pointer', opacity: (isReplacing || searchResults.length === 0) ? 0.5 : 1, transition: 'var(--transition-smooth)' }}
                >
                  <Icons.RefreshCw width={14} height={14} className={isReplacing ? "spin" : ""} />
                </button>
              </div>
            </div>
            <div className="tree-content" style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
              {isSearching ? (
                <div style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((res: any, idx) => (
                  <div 
                    key={`${res.path}-${res.line}-${idx}`}
                    className="tree-item hover-scale"
                    onClick={() => handleFileClick(projectPath ? `${projectPath}\\${res.path}` : res.path, res.line, searchQuery)}
                    style={{ padding: '6px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                  >
                    <div style={{ fontSize: '13px', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icons.FileText width={12} height={12} color="#519aba" /> {res.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {res.path}:{res.line}
                    </div>
                    {res.excerpt && (
                      <div style={{ fontSize: '11px', color: '#858585', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '2px' }}>
                        {res.excerpt.trim()}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>No results.</div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Resizer */}
      <div 
        onMouseDown={startResizing}
        style={{ 
          width: '4px', cursor: 'col-resize', backgroundColor: isResizing ? 'var(--color-primary-orange)' : 'transparent',
          zIndex: 10, transition: 'background-color 0.2s',
          marginLeft: '-2px', marginRight: '-2px'
        }}
        className="layout-resizer hover:bg-[var(--color-primary-orange)]"
      />
      
      <div className="code-editor-viewer" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', overflow: 'hidden', minHeight: 0 }}>
        {!activeFilePath ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#858585', fontSize: '14px' }}>
            <div style={{ textAlign: 'center' }}>
              <Icons.Code width={14} height={14} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              <div>Select a file to edit</div>
            </div>
          </div>
        ) : fileLoading && openedFiles.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#858585', fontSize: '14px' }}>
            Loading file...
          </div>
        ) : fileError ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '13px', padding: '16px' }}>
            {fileError}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', backgroundColor: '#252526', borderBottom: '1px solid #333', width: '100%' }}>
                <div style={{ display: 'flex', overflowX: 'auto', flex: 1 }}>
                  {openedFiles.map(f => (
                    <div 
                      key={f.path} 
                      onMouseDown={(e) => startMouseDrag(f.path, e)}
                      style={{ 
                        padding: '8px 16px', 
                        cursor: 'grab', 
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        backgroundColor: activeFilePath === f.path ? '#1e1e1e' : 'transparent',
                        borderTop: activeFilePath === f.path ? '2px solid var(--color-primary-orange)' : '2px solid transparent',
                        borderRight: '1px solid #333',
                        color: activeFilePath === f.path ? '#fff' : '#858585',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap',
                        minWidth: '120px'
                      }}
                      onClick={() => setActiveFilePath(f.path)}
                    >
                      <Icons.FileText width={14} height={14} color="#519aba" />
                      <span style={{ fontSize: '13px' }}>{f.path.split(/[\\/]/).pop()}</span>
                      <div 
                        className="hover:bg-[#333] rounded p-0.5 ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenedFiles(prev => prev.filter(file => file.path !== f.path));
                          if (activeFilePath === f.path) setActiveFilePath(null);
                          if (splitFile === f.path) setSplitFile(null);
                        }}
                      >
                        <Icons.X width={12} height={12} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '12px', padding: '8px 16px', alignItems: 'center', flexShrink: 0 }}>
                {/* Split Editor - toggle split view of the current file */}
                <button className="btn-icon-ghost" title="Split Editor" onClick={() => {
                  if (splitFile) {
                    setSplitFile(null);
                  } else if (activeFilePath) {
                    setSplitFile(activeFilePath);
                  }
                }} style={{ color: splitFile ? 'var(--color-primary-orange)' : '#cccccc' }}>
                  <Icons.Layout width={14} height={14} />
                </button>
                {/* Format Document */}
                <button className="btn-icon-ghost" title="Format Document (Shift+Alt+F)" onClick={() => {
                  const editor = editorRef.current;
                  if (editor) {
                    editor.focus();
                    // Try the built-in format action
                    const action = editor.getAction('editor.action.formatDocument');
                    if (action) {
                      action.run();
                    } else {
                      // Fallback: manually re-indent via select all + indent
                      editor.trigger('keyboard', 'editor.action.selectAll', null);
                      setTimeout(() => {
                        editor.trigger('keyboard', 'editor.action.indentLines', null);
                        // Deselect
                        const pos = editor.getPosition();
                        if (pos) editor.setSelection({ startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column });
                      }, 50);
                    }
                  }
                }} style={{ color: '#cccccc' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '16px', lineHeight: 1 }}>{`{}`}</span>
                </button>
                {/* Terminal Toggle */}
                <button className="btn-icon-ghost" title="Terminal (Ctrl+`)" onClick={() => setIsTerminalOpen(prev => !prev)} style={{ color: isTerminalOpen ? 'var(--color-primary-orange)' : '#cccccc' }}>
                  <Icons.Terminal width={14} height={14} />
                </button>
                <button className="btn-icon-ghost" title="Command Palette (F1)" onClick={handleOpenCommandPalette} style={{ color: '#cccccc' }}>
                  <Icons.Command width={14} height={14} />
                </button>
                {!autoSave && (
                  <button className="btn-icon-ghost" title="Save File (Ctrl+S)" onClick={handleManualSave} style={{ color: '#cccccc' }}>
                    <Icons.Save width={14} height={14} />
                  </button>
                )}
                <div style={{ position: 'relative' }}>
                  <button className="btn-icon-ghost" title="More Actions..." onClick={() => setShowMoreMenu(!showMoreMenu)} style={{ color: showMoreMenu ? 'var(--color-primary-orange)' : '#cccccc' }}>
                    <Icons.MoreHorizontal width={14} height={14} />
                  </button>
                  {showMoreMenu && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowMoreMenu(false)} />
                      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: '#252526', border: '1px solid #444', borderRadius: '4px', padding: '4px 0', minWidth: '200px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        <div 
                          onClick={() => { setOpenedFiles([]); setActiveFilePath(null); setSplitFile(null); setShowMoreMenu(false); }}
                          style={{ padding: '8px 16px', fontSize: '12px', color: '#cccccc', cursor: 'pointer' }}
                          className="hover:bg-[#37373D] hover:text-white"
                        >
                          Close All Editors
                        </div>
                        <div 
                          onClick={() => { 
                            if (activeFilePath) {
                              setOpenedFiles(openedFiles.filter(f => f.path === activeFilePath));
                              if (splitFile && splitFile !== activeFilePath) setSplitFile(null);
                            }
                            setShowMoreMenu(false); 
                          }}
                          style={{ padding: '8px 16px', fontSize: '12px', color: '#cccccc', cursor: 'pointer' }}
                          className="hover:bg-[#37373D] hover:text-white"
                        >
                          Close Others
                        </div>
                        <div style={{ borderTop: '1px solid #444', margin: '4px 0' }} />
                        <div 
                          onClick={() => { setWordWrap(wordWrap === 'on' ? 'off' : 'on'); setShowMoreMenu(false); }}
                          style={{ padding: '8px 16px', fontSize: '12px', color: '#cccccc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                          className="hover:bg-[#37373D] hover:text-white"
                        >
                          <span>Word Wrap</span>
                          <span style={{ color: wordWrap === 'on' ? 'var(--color-primary-orange)' : '#666' }}>{wordWrap === 'on' ? 'ON' : 'OFF'}</span>
                        </div>
                        <div 
                          onClick={() => { setFontSize(prev => Math.min(prev + 1, 28)); setShowMoreMenu(false); }}
                          style={{ padding: '8px 16px', fontSize: '12px', color: '#cccccc', cursor: 'pointer' }}
                          className="hover:bg-[#37373D] hover:text-white"
                        >
                          Increase Font Size
                        </div>
                        <div 
                          onClick={() => { setFontSize(prev => Math.max(prev - 1, 10)); setShowMoreMenu(false); }}
                          style={{ padding: '8px 16px', fontSize: '12px', color: '#cccccc', cursor: 'pointer' }}
                          className="hover:bg-[#37373D] hover:text-white"
                        >
                          Decrease Font Size
                        </div>
                        <div style={{ borderTop: '1px solid #444', margin: '4px 0' }} />
                        <div 
                          onClick={() => { handleSettingsChange('autoSave', !autoSave); setShowMoreMenu(false); }}
                          style={{ padding: '8px 16px', fontSize: '12px', color: '#cccccc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                          className="hover:bg-[#37373D] hover:text-white"
                        >
                          <span>Auto Save</span>
                          <span style={{ color: autoSave ? 'var(--color-primary-orange)' : '#666' }}>{autoSave ? 'ON' : 'OFF'}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div style={{ padding: '4px 16px', fontSize: '12px', color: '#858585', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', backgroundColor: '#1e1e1e', height: '30px' }}>
              {viewMode === 'diff' ? (
                <>
                  <span style={{ color: '#E8A317' }}>{activeFilePath.split(/[\\/]/).pop()} (Original)</span>
                  <Icons.ArrowRight width={14} height={14} style={{ margin: '0 12px', color: '#666' }} />
                  <span style={{ color: '#10B981' }}>{activeFilePath.split(/[\\/]/).pop()} (Modified)</span>
                </>
              ) : (
                renderBreadcrumbs(activeFilePath)
              )}
            </div>

            <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                {viewMode === 'diff' ? (
                  <DiffEditor
                    height="100%"
                    language={getLanguageFromFilename(activeFilePath)}
                    theme="vs-dark"
                    original={diffOriginalContent}
                    modified={openedFiles.find(f => f.path === activeFilePath)?.content || ''}
                    onMount={(editor) => handleEditorDidMount(editor.getModifiedEditor())}
                    options={diffEditorOptions as any}
                  />
                ) : (
                  <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
                    <div ref={mainEditorContainerRef} style={splitFile ? { flex: 'none', width: typeof splitLeftWidth === 'number' ? `${splitLeftWidth}px` : splitLeftWidth, minWidth: 0, position: 'relative' } : { flex: 1, minWidth: 0, position: 'relative' }}>
                      <Editor
                        height="100%"
                        language={getLanguageFromFilename(activeFilePath)}
                        path={activeFilePath}
                        theme="vs-dark"
                        value={openedFiles.find(f => f.path === activeFilePath)?.content || ''}
                        onChange={handleEditorChange}
                        onMount={handleEditorDidMount}
                        options={editorOptions}
                      />
                    </div>
                    {splitFile && (
                      <div
                        onMouseDown={startSplitResizing}
                        style={{
                          width: '4px',
                          cursor: 'col-resize',
                          backgroundColor: 'transparent',
                          borderLeft: '1px solid var(--color-border)',
                          zIndex: 10,
                          flexShrink: 0
                        }}
                      />
                    )}
                    {splitFile && (
                      <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '4px 16px', fontSize: '12px', color: '#858585', borderBottom: '1px solid var(--color-border)', backgroundColor: '#1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '30px' }}>
                          {renderBreadcrumbs(splitFile)}
                          <button className="btn-icon-ghost" onClick={() => setSplitFile(null)}>
                            <Icons.X width={12} height={12} />
                          </button>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                            <Editor
                              height="100%"
                              language={getLanguageFromFilename(splitFile)}
                              path={splitFile}
                              theme="vs-dark"
                              value={openedFiles.find(f => f.path === splitFile)?.content || ''}
                              onChange={(val) => {
                                const updated = openedFiles.map(f => f.path === splitFile ? { ...f, content: val || '' } : f);
                                setOpenedFiles(updated);
                              }}
                              onMount={(editor) => {
                                if (!editorsRef.current.includes(editor)) {
                                  editorsRef.current.push(editor);
                                }
                              }}
                              options={editorOptions}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mouse Drag Ghost + Drop Zone Overlay */}
            {mouseDrag?.active && (
              <>
                {/* Floating ghost label following the cursor */}
                <div style={{
                  position: 'fixed',
                  left: mouseDrag.x + 12,
                  top: mouseDrag.y - 10,
                  backgroundColor: '#333',
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  zIndex: 99999,
                  pointerEvents: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  whiteSpace: 'nowrap'
                }}>
                  {mouseDrag.file.split(/[\\/]/).pop()}
                </div>
                {/* Full screen drop zone overlay */}
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998, pointerEvents: 'none', display: 'flex' }}>
                  {/* Left half */}
                  <div style={{
                    flex: 1,
                    backgroundColor: mouseDrag.dropZone === 'left' ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
                    borderRight: '2px dashed ' + (mouseDrag.dropZone === 'left' ? 'var(--color-primary-orange)' : 'transparent'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background-color 0.15s ease'
                  }}>
                    {mouseDrag.dropZone === 'left' && (
                      <div style={{ color: 'var(--color-primary-orange)', fontSize: '14px', fontWeight: 'bold', opacity: 0.8 }}>Open Here</div>
                    )}
                  </div>
                  {/* Right half */}
                  <div style={{
                    flex: 1,
                    backgroundColor: mouseDrag.dropZone === 'right' ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
                    borderLeft: '2px dashed ' + (mouseDrag.dropZone === 'right' ? 'var(--color-primary-orange)' : 'transparent'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background-color 0.15s ease'
                  }}>
                    {mouseDrag.dropZone === 'right' && (
                      <div style={{ color: 'var(--color-primary-orange)', fontSize: '14px', fontWeight: 'bold', opacity: 0.8 }}>Split Editor</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Integrated Terminal - always available regardless of file state */}
        {isTerminalOpen && (
          <div ref={terminalContainerRef} style={{ height: `${terminalHeight}px`, display: 'flex', flexDirection: 'column', borderTop: '1px solid #333', flexShrink: 0, position: 'relative' }}>
            
            {/* Full-screen overlay to catch mouse events while resizing */}
            {isTerminalResizing && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, cursor: 'row-resize' }} />
            )}
            {isResizing && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, cursor: 'col-resize' }} />
            )}
            {isSplitResizing && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, cursor: 'col-resize' }} />
            )}

            <div 
              onMouseDown={startTerminalResizing}
              style={{ 
                position: 'absolute', 
                top: '-4px', 
                left: 0, 
                right: 0, 
                height: '8px', 
                cursor: 'row-resize', 
                zIndex: 10, 
                backgroundColor: isTerminalResizing ? 'var(--color-primary-orange)' : 'transparent',
                opacity: isTerminalResizing ? 1 : 0,
                transition: 'opacity 0.2s'
              }}
              className="hover:opacity-100"
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-orange)'; e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { if (!isTerminalResizing) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.opacity = '0'; } }}
            />
            
            {/* Terminal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', backgroundColor: '#1e1e1e', borderBottom: '1px solid #333', userSelect: 'none' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div 
                  onClick={() => setActiveBottomTab('terminal')}
                  style={{ 
                    fontSize: '11px', 
                    color: activeBottomTab === 'terminal' ? '#e7e7e7' : '#858585', 
                    borderBottom: `1px solid ${activeBottomTab === 'terminal' ? 'var(--color-primary-orange)' : 'transparent'}`, 
                    padding: '6px 0', 
                    cursor: 'pointer', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px', 
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  Terminal
                </div>
                <div 
                  onClick={() => setActiveBottomTab('output')}
                  style={{ 
                    fontSize: '11px', 
                    color: activeBottomTab === 'output' ? '#e7e7e7' : '#858585', 
                    borderBottom: `1px solid ${activeBottomTab === 'output' ? 'var(--color-primary-orange)' : 'transparent'}`, 
                    padding: '6px 0', 
                    cursor: 'pointer', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px', 
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  Output
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className="btn-icon-ghost" 
                  onClick={() => setTerminalHeight(prev => prev > 500 ? 300 : window.innerHeight - 150)} 
                  style={{ color: '#858585', padding: '4px' }} 
                  title={terminalHeight > 500 ? "Restore Panel Size" : "Maximize Panel Size"}
                >
                  {terminalHeight > 500 ? <Icons.ChevronDown width={14} height={14} /> : <Icons.ChevronUp width={14} height={14} />}
                </button>
                <button 
                  className="btn-icon-ghost" 
                  onClick={() => setIsTerminalOpen(false)} 
                  style={{ color: '#858585', padding: '4px' }} 
                  title="Close Panel"
                >
                  <Icons.X width={14} height={14} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ width: '100%', height: '100%', display: activeBottomTab === 'terminal' ? 'block' : 'none' }}>
                <IntegratedTerminal projectPath={projectPath || ''} isVisible={isTerminalOpen && activeBottomTab === 'terminal'} />
              </div>
              <div style={{ width: '100%', height: '100%', display: activeBottomTab === 'output' ? 'block' : 'none' }}>
                <LogViewer />
              </div>
            </div>
          </div>
        )}
      </div>

      <SettingsModal 
        isOpen={settingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)} 
        settings={{ fontSize, tabSize, wordWrap, autoSave }} 
        onSettingsChange={handleSettingsChange} 
      />

      <CommandPalette 
        files={files} 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        onSelect={(p) => { handleFileClick(p); setIsCommandPaletteOpen(false); }} 
      />

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div 
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              backgroundColor: '#252526',
              border: '1px solid #454545',
              borderRadius: '6px',
              padding: '6px 0',
              minWidth: '160px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="context-menu-item" onClick={() => handleCreateFile(contextMenu.path, contextMenu.isFolder || false)} style={{ padding: '6px 16px', cursor: 'pointer', fontSize: '13px', color: '#cccccc' }}>New File</div>
            <div className="context-menu-item" onClick={() => handleCreateFolder(contextMenu.path, contextMenu.isFolder || false)} style={{ padding: '6px 16px', cursor: 'pointer', fontSize: '13px', color: '#cccccc' }}>New Folder</div>
            <div style={{ height: '1px', backgroundColor: '#454545', margin: '4px 0' }} />
            <div className="context-menu-item" onClick={() => handleRename(contextMenu.path)} style={{ padding: '6px 16px', cursor: 'pointer', fontSize: '13px', color: '#cccccc' }}>Rename</div>
            <div className="context-menu-item" onClick={() => handleDelete(contextMenu.path)} style={{ padding: '6px 16px', cursor: 'pointer', fontSize: '13px', color: '#ef4444' }}>Delete</div>
          </div>
        </>
      )}
    </div>
  );
};
