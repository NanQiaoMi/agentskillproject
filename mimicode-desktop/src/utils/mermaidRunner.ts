import mermaid from 'mermaid';

// ── Global Mermaid Configuration ──────────────────────────────────────────
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  themeVariables: {
    // Background and fonts
    background: 'transparent',
    fontFamily: 'var(--font-mono), "Cascadia Code", "MiSans", monospace',
    fontSize: '14px',

    // Primary Colors (Nodes) - Brighter for contrast
    primaryColor: '#1e293b', 
    primaryTextColor: '#ffffff',
    primaryBorderColor: 'rgba(255, 255, 255, 0.25)', 
    
    // Line / Edge styles - Brighter by default
    lineColor: '#94a3b8', 
    
    // Secondary / Tertiary Colors
    secondaryColor: '#334155',
    tertiaryColor: '#1e293b',

    // Specific node types
    nodeBorder: 'rgba(255, 255, 255, 0.25)',
    
    // Clusters (Subgraphs) - Light translucent
    clusterBkg: 'rgba(255, 255, 255, 0.03)', 
    clusterBorder: 'rgba(255, 255, 255, 0.15)', 
    titleColor: '#cbd5e1',
    edgeLabelBackground: '#1e293b',

    // Shapes
    rectRadius: '8px', 
  },
  themeCSS: `
    /* Node styling - Brighter cards */
    .node rect, .node circle, .node ellipse, .node polygon, .node path {
      fill: #1e293b !important; 
      stroke: rgba(255, 255, 255, 0.2) !important;
      stroke-width: 1.5px !important;
      transition: all 0.2s ease;
      filter: drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.3));
    }
    
    /* Node Hover */
    .node:hover rect, .node:hover circle, .node:hover ellipse, .node:hover polygon, .node:hover path {
      stroke: rgba(255, 255, 255, 0.6) !important;
      fill: #27344a !important;
      transform: translateY(-2px);
      filter: drop-shadow(0px 8px 16px rgba(0, 0, 0, 0.4));
    }
    
    /* Cluster styling */
    .cluster rect {
      stroke-width: 1px;
      stroke-dasharray: 4 4;
      rx: 12px !important;
      ry: 12px !important;
      fill: rgba(255, 255, 255, 0.04) !important;
      stroke: rgba(255, 255, 255, 0.15) !important;
    }
    
    /* Edge styling - Clean and visible */
    .edgePath .path {
      stroke-width: 2px;
      stroke: #718096 !important;
      opacity: 0.8;
      transition: all 0.3s ease;
    }
    .edgePath:hover .path {
      opacity: 1;
      stroke-width: 2.5px;
      stroke: #38BDF8 !important;
      filter: drop-shadow(0px 0px 8px rgba(56, 189, 248, 0.8));
    }
    
    /* Arrowheads */
    .arrowheadPath {
      fill: #718096 !important;
    }
    .edgePath:hover ~ .arrowheadPath, .edgePath:hover .arrowheadPath {
      fill: #38BDF8 !important;
    }
    
    /* Text styling */
    .node .label {
      font-weight: 500;
      font-family: var(--font-mono) !important;
      letter-spacing: 0.5px;
      color: #ffffff !important;
    }
    .cluster-label text {
      font-weight: 600 !important;
      font-family: var(--font-mono) !important;
      font-size: 14px !important;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      fill: #94a3b8 !important;
    }
  `,
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    nodeSpacing: 70,
    rankSpacing: 70,
    padding: 24
  }
});

// ── Global SVG cache ──────────────────────────────────────────────────────
// Key: trimmed mermaid source code, Value: rendered SVG string
const svgCache = new Map<string, string>();

/**
 * Look up a previously rendered SVG by its source code.
 */
export const getCachedSvg = (source: string): string | undefined => {
  return svgCache.get(source.trim());
};

// ── Mutex for serialising mermaid.render (it is NOT thread-safe) ──────────
let busy = false;
const queue: (() => void)[] = [];

const lock = (): Promise<void> => {
  if (!busy) { busy = true; return Promise.resolve(); }
  return new Promise<void>(r => queue.push(r));
};

const unlock = () => {
  if (queue.length) { const next = queue.shift(); if (next) next(); }
  else { busy = false; }
};

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Walk every `.mermaid-wrapper` that has NOT been processed yet,
 * render its hidden source code with Mermaid, and inject the SVG.
 *
 * Successfully rendered SVGs are cached so that `parseMarkdown` can
 * embed them directly on the next pass (avoiding the flash-of-empty).
 */
export const runMermaidSafely = async (
  containerSelector: string = '.mermaid-wrapper',
) => {
  const nodes = document.querySelectorAll(
    `${containerSelector}:not([data-mermaid-done="true"])`,
  );
  if (nodes.length === 0) return;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as HTMLElement;

    // Mark immediately so no other invocation picks up the same node
    node.setAttribute('data-mermaid-done', 'true');

    const codeNode = node.querySelector('.mermaid-code') as HTMLElement | null;
    const renderNode = node.querySelector('.mermaid-render') as HTMLElement | null;
    if (!codeNode || !renderNode) continue;

    const source = (codeNode.textContent || '').trim();
    if (!source) continue;

    // Fast path: if we already rendered this exact source, reuse the SVG
    const cached = svgCache.get(source);
    if (cached) {
      renderNode.innerHTML = cached;
      continue;
    }

    // Slow path: call mermaid.render (serialised via mutex)
    const id = `mermaid-r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${i}`;
    await lock();
    try {
      const { svg } = await mermaid.render(id, source);
      svgCache.set(source, svg);
      renderNode.innerHTML = svg;
    } catch (err) {
      console.warn('Mermaid render failed for block', i, err);
      renderNode.innerHTML =
        `<div style="color:#94a3b8;padding:16px;border:1px dashed #334155;border-radius:8px;font-family:monospace;font-size:12px;white-space:pre-wrap;">${source}</div>`;
    } finally {
      unlock();
    }
  }
};
