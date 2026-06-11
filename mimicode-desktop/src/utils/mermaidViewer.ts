/**
 * Global Mermaid Viewer
 * 
 * Attaches a global event listener to handle clicks on the "Fullscreen" button 
 * inside `.mermaid-wrapper` components. It clones the SVG and displays it in a 
 * fixed, full-screen overlay with panning and zooming support via mouse interactions.
 */

export const initMermaidViewer = () => {
  // Prevent multiple initializations
  if ((window as any).__mermaidViewerInitialized) return;
  (window as any).__mermaidViewerInitialized = true;

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const fullscreenBtn = target.closest('.mermaid-btn-fullscreen');
    
    if (fullscreenBtn) {
      e.preventDefault();
      e.stopPropagation();
      
      const wrapper = fullscreenBtn.closest('.mermaid-wrapper');
      if (!wrapper) return;
      
      const renderNode = wrapper.querySelector('.mermaid-render');
      if (!renderNode) return;
      
      const svgElement = renderNode.querySelector('svg');
      if (!svgElement) return;

      openFullscreenViewer(svgElement);
    }
  });
};

const openFullscreenViewer = (sourceSvg: SVGSVGElement) => {
  // 1. Create Overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(11, 19, 41, 0.95)';
  overlay.style.backdropFilter = 'blur(10px)';
  overlay.style.zIndex = '999999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.overflow = 'hidden';

  // 2. Clone SVG
  const svgWrapper = document.createElement('div');
  svgWrapper.style.width = '100%';
  svgWrapper.style.height = '100%';
  svgWrapper.style.display = 'flex';
  svgWrapper.style.alignItems = 'center';
  svgWrapper.style.justifyContent = 'center';
  svgWrapper.style.cursor = 'grab';

  const clonedSvg = sourceSvg.cloneNode(true) as SVGSVGElement;
  clonedSvg.style.maxWidth = 'none';
  clonedSvg.style.height = 'auto';
  clonedSvg.style.transition = 'transform 0.1s ease-out';
  // Remove any explicit dimensions so it can scale freely
  clonedSvg.removeAttribute('width');
  clonedSvg.removeAttribute('height');

  svgWrapper.appendChild(clonedSvg);
  overlay.appendChild(svgWrapper);

  // 3. Add Close Button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '24px';
  closeBtn.style.right = '24px';
  closeBtn.style.background = 'rgba(255,255,255,0.1)';
  closeBtn.style.border = '1px solid rgba(255,255,255,0.2)';
  closeBtn.style.borderRadius = '50%';
  closeBtn.style.width = '48px';
  closeBtn.style.height = '48px';
  closeBtn.style.color = '#fff';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.display = 'flex';
  closeBtn.style.alignItems = 'center';
  closeBtn.style.justifyContent = 'center';
  closeBtn.style.zIndex = '10';
  closeBtn.style.transition = 'background 0.2s';
  closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
  closeBtn.onmouseleave = () => closeBtn.style.background = 'rgba(255,255,255,0.1)';
  closeBtn.onclick = () => document.body.removeChild(overlay);
  overlay.appendChild(closeBtn);

  // 4. Add Zoom Controls
  const controls = document.createElement('div');
  controls.style.position = 'absolute';
  controls.style.bottom = '40px';
  controls.style.display = 'flex';
  controls.style.alignItems = 'center';
  controls.style.gap = '8px';
  controls.style.background = 'rgba(15, 23, 42, 0.7)';
  controls.style.backdropFilter = 'blur(12px)';
  controls.style.padding = '6px 8px';
  controls.style.borderRadius = '16px';
  controls.style.border = '1px solid rgba(255,255,255,0.1)';
  controls.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)';

  const createBtn = (iconHtml: string, title: string, onClick: () => void) => {
    const btn = document.createElement('button');
    btn.innerHTML = iconHtml;
    btn.title = title;
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.color = 'rgba(255,255,255,0.85)';
    btn.style.padding = '8px 12px';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '10px';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
    
    btn.onmouseenter = () => {
      btn.style.background = 'rgba(255,255,255,0.15)';
      btn.style.color = '#fff';
      btn.style.transform = 'translateY(-1px)';
    };
    btn.onmouseleave = () => {
      btn.style.background = 'transparent';
      btn.style.color = 'rgba(255,255,255,0.85)';
      btn.style.transform = 'translateY(0)';
    };
    btn.onmousedown = () => btn.style.transform = 'translateY(1px)';
    btn.onmouseup = () => btn.style.transform = 'translateY(-1px)';
    
    btn.onclick = (e) => {
      e.stopPropagation();
      onClick();
    };
    return btn;
  };

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  const updateTransform = () => {
    clonedSvg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  };

  const zoomOutIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>';
  const resetIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
  const zoomInIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>';

  controls.appendChild(createBtn(zoomOutIcon, '缩小 (Zoom Out)', () => { scale /= 1.25; updateTransform(); }));
  
  // Add a divider
  const divider = document.createElement('div');
  divider.style.width = '1px';
  divider.style.height = '16px';
  divider.style.background = 'rgba(255,255,255,0.15)';
  controls.appendChild(divider);

  controls.appendChild(createBtn(resetIcon, '重置大小与位置 (Reset)', () => { scale = 1; translateX = 0; translateY = 0; updateTransform(); }));
  
  const divider2 = document.createElement('div');
  divider2.style.width = '1px';
  divider2.style.height = '16px';
  divider2.style.background = 'rgba(255,255,255,0.15)';
  controls.appendChild(divider2);

  controls.appendChild(createBtn(zoomInIcon, '放大 (Zoom In)', () => { scale *= 1.25; updateTransform(); }));
  
  overlay.appendChild(controls);

  // 5. Pan and Zoom Interactions
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  svgWrapper.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'button' || (e.target as HTMLElement).closest('button')) {
      return;
    }
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    svgWrapper.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    svgWrapper.style.cursor = 'grab';
  });

  svgWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.max(0.1, Math.min(scale * Math.exp(delta), 10));
    scale = newScale;
    updateTransform();
  }, { passive: false });

  // 6. Mount to body
  document.body.appendChild(overlay);

  // Focus and handle Esc key
  overlay.tabIndex = -1;
  overlay.focus();
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }
  });
};
