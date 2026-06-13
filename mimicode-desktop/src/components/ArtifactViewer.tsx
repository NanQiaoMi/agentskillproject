import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Highlight, themes } from 'prism-react-renderer';
import { Icons } from './Icons';

export interface Artifact {
  name: string;
  content: string;
}

interface ArtifactViewerProps {
  artifacts: Artifact[];
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({ artifacts }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!artifacts || artifacts.length === 0) return null;

  const activeArtifact = artifacts[activeIndex] || artifacts[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0D1117', color: '#C9D1D9', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', backgroundColor: '#010409', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icons.Monitor style={{ width: '16px', height: '16px', color: '#58A6FF' }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#E6EDF3', letterSpacing: '0.5px' }}>ARTIFACT VIEWER</span>
      </div>
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #30363D', backgroundColor: '#161B22', flexShrink: 0 }}>
        {artifacts.map((a, i) => (
          <div
            key={a.name}
            onClick={() => setActiveIndex(i)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              borderRight: '1px solid #30363D',
              borderBottom: activeIndex === i ? '2px solid #58A6FF' : '2px solid transparent',
              backgroundColor: activeIndex === i ? '#0D1117' : '#161B22',
              color: activeIndex === i ? '#C9D1D9' : '#8B949E',
              fontSize: '13px',
              fontFamily: '"Fira Code", monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Icons.FileText style={{ width: '14px', height: '14px' }} />
            {a.name}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', fontFamily: '"Fira Code", monospace', fontSize: '13px', lineHeight: '1.6' }}>
        <ReactMarkdown
          components={{
            code(props) {
              const { children, className, node, ...rest } = props;
              const match = /language-(\w+)/.exec(className || '');
              return match ? (
                <Highlight theme={themes.vsDark} code={String(children).replace(/\n$/, '')} language={match[1]}>
                  {({ className, style, tokens, getLineProps, getTokenProps }) => (
                    <pre className={className} style={{ ...style, padding: '16px', borderRadius: '8px', overflowX: 'auto', margin: '12px 0', border: '1px solid #30363D' }}>
                      {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })}>
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              ) : (
                <code {...rest} className={className} style={{ background: '#161B22', color: '#58A6FF', padding: '2px 4px', borderRadius: '4px', border: '1px solid #30363D' }}>
                  {children}
                </code>
              );
            },
            h1: ({node, ...props}) => <h1 style={{ color: '#58A6FF', borderBottom: '1px solid #30363D', paddingBottom: '8px', marginTop: '24px' }} {...props} />,
            h2: ({node, ...props}) => <h2 style={{ color: '#E6EDF3', marginTop: '20px' }} {...props} />,
            h3: ({node, ...props}) => <h3 style={{ color: '#E6EDF3', marginTop: '16px' }} {...props} />,
            p: ({node, ...props}) => <p style={{ marginBottom: '16px', color: '#8B949E' }} {...props} />,
            ul: ({node, ...props}) => <ul style={{ paddingLeft: '24px', marginBottom: '16px', color: '#8B949E' }} {...props} />,
            li: ({node, ...props}) => <li style={{ marginBottom: '4px' }} {...props} />,
            a: ({node, ...props}) => <a style={{ color: '#58A6FF', textDecoration: 'none' }} {...props} />,
            blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '4px solid #30363D', margin: '0 0 16px 0', padding: '0 16px', color: '#8B949E', fontStyle: 'italic' }} {...props} />,
          }}
        >
          {activeArtifact.content}
        </ReactMarkdown>
      </div>
    </div>
  );
};
