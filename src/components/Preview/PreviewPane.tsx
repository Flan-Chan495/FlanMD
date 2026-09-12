import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { FrontmatterData, ThemeMode } from '../../types';
import { Calendar, Tag, Folder, AlertCircle } from 'lucide-react';

interface PreviewPaneProps {
  html: string;
  frontmatter: FrontmatterData | null;
  theme: ThemeMode;
  isReaderMode?: boolean;
  previewRef: React.RefObject<HTMLDivElement | null>;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  html,
  frontmatter,
  theme,
  isReaderMode = false,
  previewRef,
  onScroll,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize and render Mermaid diagrams
  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
      });
      if (contentRef.current) {
        const mermaidElements = contentRef.current.querySelectorAll<HTMLElement>('.mermaid');
        if (mermaidElements.length > 0) {
          mermaid.run({
            nodes: Array.from(mermaidElements),
          });
        }
      }
    } catch (e) {
      console.warn('Mermaid render warning:', e);
    }
  }, [html, theme]);

  const handleScroll = () => {
    if (!previewRef.current || !onScroll) return;
    const { scrollTop, scrollHeight, clientHeight } = previewRef.current;
    onScroll(scrollTop, scrollHeight, clientHeight);
  };

  return (
    <div className="pane-preview" ref={previewRef} onScroll={handleScroll}>
      <div className={`markdown-preview ${isReaderMode ? 'reader-mode' : ''}`} ref={contentRef}>
        {/* Frontmatter metadata card */}
        {frontmatter && Object.keys(frontmatter).length > 0 && (
          <div className="frontmatter-badge-panel">
            <div className="frontmatter-meta-row">
              {frontmatter.date && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> {String(frontmatter.date)}
                </span>
              )}
              {frontmatter.categories && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Folder size={13} /> {Array.isArray(frontmatter.categories) ? frontmatter.categories.join(', ') : String(frontmatter.categories)}
                </span>
              )}
              {frontmatter.draft && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
                  <AlertCircle size={13} /> 草稿 (Draft)
                </span>
              )}
            </div>

            {frontmatter.tags && Array.isArray(frontmatter.tags) && frontmatter.tags.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                <Tag size={13} style={{ opacity: 0.7 }} />
                {frontmatter.tags.map((tag, idx) => (
                  <span key={idx} className="frontmatter-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rendered HTML */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
};
