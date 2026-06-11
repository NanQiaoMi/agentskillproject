import { getCachedSvg } from './mermaidRunner';

export const renderHtmlTable = (rows: string[]): string => {
  if (rows.length === 0) return '';
  
  const parseRow = (row: string) => {
    const cells = row.split('|').map(c => c.trim());
    if (cells[0] === '') cells.shift();
    if (cells[cells.length - 1] === '') cells.pop();
    return cells;
  };

  const headerCells = parseRow(rows[0]);
  
  let dataStartIndex = 1;
  if (rows.length > 1 && rows[1].includes('-')) {
    dataStartIndex = 2;
  }

  const ths = headerCells.map(cell => {
    return `<th style="padding: 10px 14px; border-bottom: 2px solid var(--color-border); background-color: var(--bg-hover); color: var(--color-text-main); font-weight: 600; text-align: left; font-size: 13px;">${cell}</th>`;
  }).join('');
  
  const trs = rows.slice(dataStartIndex).map((row, idx) => {
    const cells = parseRow(row);
    while (cells.length < headerCells.length) {
      cells.push('');
    }
    const tds = cells.map(cell => {
      return `<td style="padding: 10px 14px; border-bottom: 1px solid var(--color-border); font-size: 13px; color: var(--color-text-secondary);">${cell}</td>`;
    }).join('');
    const rowBg = idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)';
    return `<tr style="background-color: ${rowBg};">${tds}</tr>`;
  }).join('');

  return `
    <div style="overflow-x: auto; margin: 24px 0; border: 1px solid var(--color-border); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); max-width: 100%;">
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>
  `;
};

export const parseMarkdown = (md: string, emptyMessage: string = '此内容为空。'): string => {
  if (!md) return `<div class="text-muted" style="padding:20px;text-align:center;">${emptyMessage}</div>`;
  
  // Hide embedded json diagram
  let text = md.replace(/<!--\s*architecture_diagram[\s\S]*?-->/g, '');
  
  // Normalize windows newlines
  text = text.replace(/\r\n/g, '\n');

  // Prefix salt for code blocks (Regex Placeholder Salting)
  const salt = Math.random().toString(36).substring(2, 9);
  const getPlaceholder = (idx: number) => `__CODE_BLOCK_${salt}_${idx}__`;

  // 1. Extract code blocks BEFORE escaping HTML to keep Mermaid syntax intact
  const codeBlocks: string[] = [];
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, codeContent) => {
    const placeholder = getPlaceholder(codeBlocks.length);
    
    const isMermaid = lang?.trim().toLowerCase() === 'mermaid' || 
                      codeContent.trim().startsWith('graph ') || 
                      codeContent.trim().startsWith('flowchart ');
    
    if (isMermaid) {
      // Escape HTML entities so the browser doesn't eat '<' / '>' inside the hidden <pre>
      const safeMermaid = codeContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const trimmedSource = codeContent.trim();

      // Check if we already have a rendered SVG for this exact source
      const cached = getCachedSvg(trimmedSource);

      let innerContent: string;
      if (cached) {
        // Inject the cached SVG directly — no post-render needed
        innerContent = `
          <pre class="mermaid-code" style="display: none;">${safeMermaid.trim()}</pre>
          <div class="mermaid-render" style="width: 100%; display: flex; justify-content: center;">${cached}</div>`;
      } else {
        // First time — leave render div empty; runMermaidSafely will fill it
        innerContent = `
          <pre class="mermaid-code" style="display: none;">${safeMermaid.trim()}</pre>
          <div class="mermaid-render" style="width: 100%; display: flex; justify-content: center;"></div>`;
      }

      const html = `
        <div class="mermaid-wrapper" ${cached ? 'data-mermaid-done="true"' : ''} style="position: relative; background-color: #0b1329; border: 1px solid var(--color-border); border-radius: 12px; padding: 32px 24px 24px; margin: 24px 0; display: flex; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow-x: auto; color: #E2E8F0;">
          <button class="mermaid-btn-fullscreen hover-scale" title="全屏查看 (Fullscreen)" style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--color-text-secondary); transition: all 0.2s;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
          </button>
          ${innerContent}
        </div>
      `.trim();
      codeBlocks.push(html);
    } else {
      // For normal code blocks, escape HTML entities
      let escapedCode = codeContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const html = `
        <div style="background-color: var(--bg-panel); border: 1px solid var(--color-border); border-radius: 12px; margin: 24px 0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); background-color: rgba(255,255,255,0.015);">
            <div style="display: flex; gap: 6px;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #FF5F56; opacity: 0.8;"></div>
              <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #FFBD2E; opacity: 0.8;"></div>
              <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #27C93F; opacity: 0.8;"></div>
            </div>
            <div style="font-family: var(--font-mono, 'Fira Code', Consolas, monospace); font-size: 11px; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
              ${lang || 'CODE'}
            </div>
          </div>
          <pre style="margin: 0; padding: 20px; overflow-x: auto; background-color: #0f172a; font-family: var(--font-mono, 'Fira Code', Consolas, monospace); font-size: 13px; line-height: 1.6; color: #E2E8F0;">
            <code class="language-${lang || ''}" style="font-family: inherit;">${escapedCode}</code>
          </pre>
        </div>
      `.trim();
      codeBlocks.push(html);
    }
    
    return `\n\n${placeholder}\n\n`;
  });

  // 2. Escape HTML tags for the rest of the text
  text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 3. Parse tables
  const lines = text.split('\n');
  let inTable = false;
  let tableRows: string[] = [];
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(lines[i]);
    } else {
      if (inTable) {
        processedLines.push(renderHtmlTable(tableRows));
        inTable = false;
      }
      processedLines.push(lines[i]);
    }
  }
  if (inTable) {
    processedLines.push(renderHtmlTable(tableRows));
  }
  text = processedLines.join('\n');

  // Preprocess input text to ensure headers and lists are parsed correctly as block elements
  text = text.replace(/^(#+ .*?)$/gm, '\n\n$1\n\n');
  text = text.replace(/^(- .*?)$/gm, '\n\n$1\n\n');
  text = text.replace(/^(\d+\.\s*.*?)$/gm, '\n\n$1\n\n');
  text = text.replace(/^(---)$/gm, '\n\n$1\n\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  // 4. Perform other markdown conversions
  let html = text
    .replace(/^# (.*?)$/gm, '<h1 class="markdown-h1" style="font-size: 20px; font-weight: 600; color: var(--color-text-main); margin-bottom: 16px; border-bottom: 1px solid var(--color-border); padding-bottom: 8px; margin-top: 16px;">$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2 class="markdown-h2" style="font-size: 16px; font-weight: 600; color: var(--color-text-main); margin-top: 24px; margin-bottom: 12px;">$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3 class="markdown-h3" style="font-size: 14px; font-weight: 600; color: var(--color-text-main); margin-top: 16px; margin-bottom: 8px;">$1</h3>')
    .replace(/^#### (.*?)$/gm, '<h4 class="markdown-h4" style="font-size: 13px; font-weight: 600; color: var(--color-text-main); margin-top: 12px; margin-bottom: 6px;">$1</h4>')
    .replace(/^- \[ \] (.*?)$/gm, '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><input type="checkbox" disabled style="accent-color:var(--color-primary-orange)" /><span>$1</span></div>')
    .replace(/^- \[x\] (.*?)$/gm, '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;opacity:0.6;text-decoration:line-through;"><input type="checkbox" checked disabled style="accent-color:var(--color-primary-orange)" /><span>$1</span></div>')
    .replace(/^- (.*?)$/gm, '<li style="margin-left: 20px; margin-bottom: 6px; color: var(--color-text-secondary);">$1</li>')
    .replace(/^\d+\.\s*(.*?)$/gm, '<li style="margin-left: 20px; margin-bottom: 6px; color: var(--color-text-secondary); list-style-type: decimal;">$1</li>')
    .replace(/^&gt;\s*(.*?)$/gm, '<blockquote style="border-left: 4px solid var(--color-primary-orange); padding-left: 16px; margin: 16px 0; color: var(--color-text-muted); font-style: italic;">$1</blockquote>')
    .replace(/^---$/gm, '<hr style="border: 0; border-top: 1px solid var(--color-border); margin: 24px 0;" />')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--color-text-main); font-weight: 600;">$1</strong>')
    .replace(/`(.*?)`/g, '<code style="font-family: var(--font-mono, &quot;Fira Code&quot;, Consolas, monospace); font-size: 12px; background-color: var(--bg-hover); padding: 2px 6px; border-radius: 4px; color: var(--color-primary-orange);">$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, (_, linkText, url) => {
      const escapedUrl = url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const sanitizedUrl = escapedUrl.trim().toLowerCase().startsWith('javascript:') ? '#' : escapedUrl;
      return `<a href="${sanitizedUrl}" target="_blank" style="color: var(--color-primary-orange); text-decoration: none;">${linkText}</a>`;
    });

  // 5. Paragraph wrapping for loose lines
  html = html.split('\n\n').map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<div') || trimmed.startsWith('<li') || trimmed.startsWith('<pre') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr') || trimmed.startsWith('<table') || trimmed.startsWith(`__CODE_BLOCK_${salt}_`)) {
      return trimmed;
    }
    const withBreaks = trimmed.replace(/\n/g, '<br/>');
    return `<p style="margin-bottom: 12px; line-height: 1.6; color: var(--color-text-secondary);">${withBreaks}</p>`;
  }).join('\n');

  // 6. Restore code blocks
  codeBlocks.forEach((codeHtml, idx) => {
    const placeholder = getPlaceholder(idx);
    html = html.replace(placeholder, codeHtml);
  });

  return html;
};
