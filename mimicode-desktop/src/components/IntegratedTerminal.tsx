import React, { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface IntegratedTerminalProps {
  projectPath: string;
  isVisible: boolean;
}

export const IntegratedTerminal: React.FC<IntegratedTerminalProps> = ({ projectPath, isVisible }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!terminalContainerRef.current) return;

    // 1. Create and open terminal
    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#f97316',
        cursorAccent: '#1e1e1e',
        selectionBackground: 'rgba(249, 115, 22, 0.3)',
      },
      fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
      fontSize: 13,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(terminalContainerRef.current);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // 2. Set up keyboard input → PTY
    const dataDisposable = term.onData(async (data: string) => {
      if (!sessionKeyRef.current) return;
      try {
        await invoke('write_to_pty', { sessionKey: sessionKeyRef.current, data });
      } catch (e) {
        console.error('Failed to write to pty:', e);
      }
    });

    // 3. Set up resize → PTY
    let lastCols = 0;
    let lastRows = 0;
    
    const resizeDisposable = term.onResize(async (size) => {
      if (!sessionKeyRef.current) return;
      if (size.cols === lastCols && size.rows === lastRows) return;
      lastCols = size.cols;
      lastRows = size.rows;
      try {
        await invoke('resize_pty', { sessionKey: sessionKeyRef.current, cols: size.cols, rows: size.rows });
      } catch (e) {
        console.error('Failed to resize pty:', e);
      }
    });

    // 4. Set up pty-data listener
    let unlistenTauri: (() => void) | undefined;
    listen<{ session_key: string; data: string }>('pty-data', (event) => {
      if (event.payload.session_key === sessionKeyRef.current && event.payload.data) {
        term.write(event.payload.data);
      }
    }).then(fn => { unlistenTauri = fn; });

    // 5. Set up ResizeObserver for auto-fit
    const handleResize = () => {
      if (terminalContainerRef.current?.offsetParent !== null && fitAddonRef.current) {
        try { fitAddonRef.current.fit(); } catch (_) {}
      }
    };
    
    let rafId: number;
    const resizeObserver = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        handleResize();
      });
    });
    resizeObserver.observe(terminalContainerRef.current);

    // 6. Spawn PTY
    const spawn = async () => {
      try {
        await new Promise(r => setTimeout(r, 100)); // Layout wait
        try { fitAddon.fit(); } catch (_) {}

        const dims = fitAddon.proposeDimensions();
        const cols = dims?.cols || 80;
        const rows = dims?.rows || 24;

        const shellConfig = localStorage.getItem('mimi-terminal-shell') || 'powershell';
        
        const sk: string = await invoke('spawn_agent_pty', {
          cliName: shellConfig,
          projectPath,
          cols,
          rows,
        });
        sessionKeyRef.current = sk;
      } catch (e) {
        console.error('Failed to start terminal:', e);
        term.write(`\r\n\x1b[31m  Error: Failed to start shell\x1b[0m\r\n`);
      }
    };
    
    // Only spawn when visible to avoid conpty crashing initially if 0x0
    let spawned = false;
    const checkSpawn = () => {
      if (!spawned && terminalContainerRef.current?.offsetParent !== null) {
        spawned = true;
        spawn();
      }
    };
    const observer2 = new IntersectionObserver(checkSpawn);
    observer2.observe(terminalContainerRef.current);

    // Cleanup
    return () => {
      dataDisposable.dispose();
      resizeDisposable.dispose();
      if (resizeObserver) resizeObserver.disconnect();
      if (unlistenTauri) unlistenTauri();
      if (sessionKeyRef.current) invoke('kill_pty', { sessionKey: sessionKeyRef.current }).catch(() => {});
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      sessionKeyRef.current = null;
      observer2.disconnect();
    };
  }, [projectPath]);

  useEffect(() => {
    if (isVisible && fitAddonRef.current && terminalContainerRef.current?.offsetParent !== null) {
      setTimeout(() => {
        try { fitAddonRef.current?.fit(); } catch (_) {}
      }, 50);
    }
  }, [isVisible]);

  return (
    <div
      ref={terminalContainerRef}
      style={{
        width: '100%', 
        height: '100%',
        backgroundColor: '#1e1e1e',
        padding: '8px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    />
  );
};
