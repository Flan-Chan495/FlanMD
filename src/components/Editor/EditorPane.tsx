import React, { useRef, useEffect } from 'react';

interface EditorPaneProps {
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  onCursorChange?: (line: number, col: number) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  fontSize?: number;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  value,
  onChange,
  onSave,
  onCursorChange,
  textareaRef,
  onScroll,
  fontSize = 17,
}) => {
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = value.split('\n');
  const lineCount = Math.max(lines.length, 1);

  // Sync line numbers scroll with textarea scroll
  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = textareaRef.current;
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
    if (onScroll) {
      onScroll(scrollTop, scrollHeight, clientHeight);
    }
  };

  const handleSelectionChange = () => {
    if (!textareaRef.current || !onCursorChange) return;
    const pos = textareaRef.current.selectionStart;
    const textBefore = value.substring(0, pos);
    const lineList = textBefore.split('\n');
    const currentLine = lineList.length;
    const currentCol = lineList[lineList.length - 1].length + 1;
    onCursorChange(currentLine, currentCol);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Ctrl+S / Cmd+S: Save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      onSave();
      return;
    }

    // Ctrl+B: Bold
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertWrapper('**', '**');
      return;
    }

    // Ctrl+I: Italic
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertWrapper('*', '*');
      return;
    }

    // Tab key: Insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
      return;
    }

    // Auto close brackets & quotes
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '`': '`',
      '"': '"',
      "'": "'",
    };

    if (pairs[e.key]) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const closing = pairs[e.key];

      // If text selected, wrap it
      if (start !== end) {
        e.preventDefault();
        const selected = value.substring(start, end);
        const newValue = value.substring(0, start) + e.key + selected + closing + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = start + 1;
          textarea.selectionEnd = end + 1;
        }, 0);
      }
    }
  };

  const insertWrapper = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || '文字';
    const replacement = prefix + selected + suffix;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + selected.length;
    }, 0);
  };

  useEffect(() => {
    handleSelectionChange();
  }, [value]);

  const digits = Math.max(2, String(lineCount).length);
  const charWidth = Math.round(fontSize * 0.6);
  const lineNumWidth = Math.max(38, digits * charWidth + 20);

  return (
    <div className="pane-editor">
      <div className="raw-editor-container">
        {/* Line numbers column */}
        <div
          className="raw-line-numbers"
          ref={lineNumbersRef}
          style={{ width: `${lineNumWidth}px`, minWidth: `${lineNumWidth}px` }}
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i} className="line-num">{i + 1}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="raw-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleSelectionChange}
          onClick={handleSelectionChange}
          onScroll={handleScroll}
          spellCheck={false}
          autoFocus
          placeholder="在此输入 Markdown 内容..."
        />
      </div>
    </div>
  );
};
