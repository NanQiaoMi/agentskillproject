import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';

interface CommandPaletteProps {
  files: string[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  files,
  isOpen,
  onClose,
  onSelect
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter files based on query (simple fuzzy match)
  const filteredFiles = React.useMemo(() => {
    if (!query) return files.slice(0, 50); // Show max 50 initially
    
    const lowerQuery = query.toLowerCase();
    const matches = files.filter(f => f.toLowerCase().includes(lowerQuery));
    
    // Sort by exact matches or matches closer to the start
    return matches.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aIndex = aLower.indexOf(lowerQuery);
      const bIndex = bLower.indexOf(lowerQuery);
      
      // If one matches earlier, it ranks higher
      if (aIndex !== bIndex) return aIndex - bIndex;
      // Shorter strings rank higher
      return a.length - b.length;
    }).slice(0, 50); // Limit to 50 results for performance
  }, [files, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small timeout to ensure the element is mounted before focusing
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Ensure selected item is visible
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filteredFiles]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredFiles[selectedIndex]) {
        onSelect(filteredFiles[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 9999,
        }}
        onClick={onClose}
      />
      <div 
        style={{
          position: 'fixed',
          top: '15vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          maxWidth: '90vw',
          backgroundColor: '#1e1e1e', // VS Code dark background
          borderRadius: '6px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #3c3c3c', // VS Code dark border
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '8px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search files by name (e.g. index.tsx)"
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#252526', // VS Code input background
                border: '1px solid #007fd4', // VS Code focus border color
                borderRadius: '4px',
                color: '#cccccc',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
        </div>

        {filteredFiles.length > 0 && (
          <div 
            ref={listRef}
            style={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              paddingBottom: '8px'
            }}
          >
            {filteredFiles.map((file, index) => {
              const fileName = file.split(/[/\\]/).pop();
              const dirName = file.substring(0, file.length - (fileName?.length || 0));
              const isSelected = index === selectedIndex;
              
              return (
                <div
                  key={file}
                  onClick={() => onSelect(file)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    padding: '4px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#04395e' : 'transparent', // VS Code selection color
                    color: isSelected ? '#ffffff' : '#cccccc',
                    transition: 'background-color 0.1s',
                  }}
                >
                  <Icons.FileText 
                    width={14} 
                    height={14} 
                    color={isSelected ? '#ffffff' : '#519aba'} 
                    style={{ marginRight: '8px', flexShrink: 0 }} 
                  />
                  <div style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {fileName}
                    </span>
                    {dirName && (
                      <span 
                        style={{ 
                          fontSize: '11px', 
                          color: isSelected ? 'rgba(255,255,255,0.7)' : '#858585', 
                          marginLeft: '8px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {dirName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {filteredFiles.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', color: '#858585', fontSize: '13px' }}>
            No matching files
          </div>
        )}
      </div>
    </>
  );
};
