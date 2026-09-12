import React, { useState, useEffect, useRef, useMemo } from 'react';
import './styles/theme.css';
import './styles/layout.css';
import {
  EditorMode,
  ThemeMode,
  FileEntry,
  GitStatus,
  AppSettings,
} from './types';
import {
  listFiles,
  readFile,
  saveFile,
  deleteFile,
  getGitStatus,
  gitSync,
} from './services/tauriService';
import { parseFrontmatter, generateFrontmatterTemplate } from './services/frontmatterService';
import { renderMarkdown, calculateStats } from './services/markdownService';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { EditorPane } from './components/Editor/EditorPane';
import { PreviewPane } from './components/Preview/PreviewPane';
import { StatusBar } from './components/StatusBar/StatusBar';
import { SettingsModal } from './components/SettingsModal/SettingsModal';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  editorMode: 'split',
  workspacePath: '/blog/_posts',
  autoSave: false,
  autoGitPushOnSave: true,
  gitCommitTemplate: 'blog: update {title} ({time})',
  frontmatterRules: {
    autoDate: true,
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    defaultDraft: false,
    defaultTags: ['Blog', 'FlanMD'],
    defaultCategory: '博客文章',
    customFields: [
      { key: 'author', value: 'Flan' },
    ],
  },
  fontSize: 15,
};

export const App: React.FC = () => {
  // Settings & Theme
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('flanmd_settings');
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SETTINGS;
  });

  const [theme, setTheme] = useState<ThemeMode>(settings.theme);
  const [editorMode, setEditorMode] = useState<EditorMode>(settings.editorMode);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // File & Content State
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Git state
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [isSyncingGit, setIsSyncingGit] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Cursor & Scrolling Refs
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const isScrollingRef = useRef<'editor' | 'preview' | null>(null);
  const editorAreaRef = useRef<HTMLElement | null>(null);

  // Panel Resizing State
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('flanmd_sidebar_width');
    return saved ? parseInt(saved, 10) : 260;
  });
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    const saved = localStorage.getItem('flanmd_split_ratio');
    return saved ? parseFloat(saved) : 50;
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState<boolean>(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(180, Math.min(550, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      setIsDraggingSidebar(false);
      const delta = upEvent.clientX - startX;
      const newWidth = Math.max(180, Math.min(550, startWidth + delta));
      localStorage.setItem('flanmd_sidebar_width', String(newWidth));
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!editorAreaRef.current) return;
      const rect = editorAreaRef.current.getBoundingClientRect();
      const relativeX = moveEvent.clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;
      const clamped = Math.max(15, Math.min(85, percentage));
      setSplitRatio(clamped);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      setIsDraggingSplit(false);
      if (editorAreaRef.current) {
        const rect = editorAreaRef.current.getBoundingClientRect();
        const relativeX = upEvent.clientX - rect.left;
        const percentage = (relativeX / rect.width) * 100;
        const clamped = Math.max(15, Math.min(85, percentage));
        localStorage.setItem('flanmd_split_ratio', String(clamped));
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };


  // Apply theme to root document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load files in workspace
  const loadWorkspace = async (dirPath: string) => {
    try {
      const fileList = await listFiles(dirPath);
      setFiles(fileList);

      // Check Git status
      const status = await getGitStatus(dirPath);
      setGitStatus(status);

      // Auto-open first file if none open
      if (!currentFilePath && fileList.length > 0) {
        const first = fileList[0];
        setCurrentFilePath(first.path);
        const text = await readFile(first.path);
        setContent(text);
        setIsDirty(false);
      }
    } catch (e) {
      console.error('Failed to load workspace:', e);
    }
  };

  useEffect(() => {
    loadWorkspace(settings.workspacePath);
  }, [settings.workspacePath]);

  // Parse frontmatter & render markdown
  const { frontmatter, body } = useMemo(() => parseFrontmatter(content), [content]);
  const { html, headings } = useMemo(() => renderMarkdown(body), [body]);
  const stats = useMemo(() => calculateStats(content), [content]);

  // File Operations
  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    setIsDirty(true);
  };

  const handleSaveFile = async () => {
    if (!currentFilePath) {
      handleNewFile();
      return;
    }
    try {
      await saveFile(currentFilePath, content);
      setIsDirty(false);

      // Refresh git status
      if (settings.workspacePath) {
        const status = await getGitStatus(settings.workspacePath);
        setGitStatus(status);
      }

      // Auto Git push if enabled
      if (settings.autoGitPushOnSave && gitStatus?.is_repo) {
        handleGitSync();
      } else {
        showToast('✅ 文件已保存');
      }
    } catch (e) {
      console.error('Save failed:', e);
      showToast('❌ 保存失败');
    }
  };

  const handleSelectFile = async (file: FileEntry) => {
    if (file.path === currentFilePath) return;
    try {
      const text = await readFile(file.path);
      setCurrentFilePath(file.path);
      setContent(text);
      setIsDirty(false);
    } catch (e) {
      console.error('Failed to read file:', e);
    }
  };

  const handleNewFile = async () => {
    const title = prompt('请输入新文章标题：', '我的新博文');
    if (!title) return;

    const initialText = generateFrontmatterTemplate(title, settings.frontmatterRules);
    const fileName = `${new Date().toISOString().slice(0, 10)}-${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    const newPath = `${settings.workspacePath}/${fileName}`;

    try {
      await saveFile(newPath, initialText);
      await loadWorkspace(settings.workspacePath);
      setCurrentFilePath(newPath);
      setContent(initialText);
      setIsDirty(false);
      showToast(`📝 文章 ${fileName} 创建成功`);
    } catch (e) {
      console.error('New file error:', e);
    }
  };

  const handleDeleteFile = async (path: string) => {
    try {
      await deleteFile(path);
      await loadWorkspace(settings.workspacePath);
      if (currentFilePath === path) {
        setCurrentFilePath('');
        setContent('');
        setIsDirty(false);
      }
      showToast('🗑️ 文件已删除');
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const handleSelectWorkspaceFolder = async () => {
    const dir = prompt(
      '请输入本地博客/文章目录绝对路径 (例如 H:/Files/MyBlog/source/_posts)：',
      settings.workspacePath
    );
    if (dir && dir.trim()) {
      const updated = { ...settings, workspacePath: dir.trim() };
      setSettings(updated);
      localStorage.setItem('flanmd_settings', JSON.stringify(updated));
      loadWorkspace(dir.trim());
    }
  };

  // Git Sync
  const handleGitSync = async (customMsg?: string) => {
    if (!settings.workspacePath) return;
    setIsSyncingGit(true);
    showToast('🔄 正在执行 Git 同步并推送至 GitHub...');

    const articleTitle = frontmatter?.title || currentFilePath.split(/[\/\\]/).pop() || '文章';
    const commitMsg =
      customMsg ||
      settings.gitCommitTemplate
        .replace('{title}', articleTitle)
        .replace('{time}', new Date().toLocaleTimeString());

    try {
      const res = await gitSync(settings.workspacePath, commitMsg);
      if (res.success) {
        showToast('🚀 推送成功：已同步至 GitHub 博客仓库！');
      } else {
        showToast(`⚠️ 同步提醒: ${res.message}`);
      }
      const updatedStatus = await getGitStatus(settings.workspacePath);
      setGitStatus(updatedStatus);
    } catch (e: any) {
      showToast(`❌ 同步失败: ${e?.message || e}`);
    } finally {
      setIsSyncingGit(false);
    }
  };

  // Toast helper
  const showToast = (msg: string) => {
    setSyncToast(msg);
    setTimeout(() => {
      setSyncToast(null);
    }, 3500);
  };

  // Insert markdown shortcut helper
  const handleInsertMarkdown = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setIsDirty(true);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + selected.length;
    }, 0);
  };

  // Scroll to heading anchor
  const handleScrollToHeading = (id: string) => {
    if (previewRef.current) {
      const el = previewRef.current.querySelector(`#${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Synchronized scrolling (Editor -> Preview)
  const handleEditorScroll = (scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (isScrollingRef.current === 'preview') return;
    isScrollingRef.current = 'editor';
    if (previewRef.current) {
      const maxEditorScroll = scrollHeight - clientHeight;
      if (maxEditorScroll > 0) {
        const ratio = scrollTop / maxEditorScroll;
        const maxPreviewScroll = previewRef.current.scrollHeight - previewRef.current.clientHeight;
        previewRef.current.scrollTop = ratio * maxPreviewScroll;
      }
    }
    setTimeout(() => {
      if (isScrollingRef.current === 'editor') isScrollingRef.current = null;
    }, 50);
  };

  // Synchronized scrolling (Preview -> Editor)
  const handlePreviewScroll = (scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (isScrollingRef.current === 'editor') return;
    isScrollingRef.current = 'preview';
    if (textareaRef.current) {
      const maxPreviewScroll = scrollHeight - clientHeight;
      if (maxPreviewScroll > 0) {
        const ratio = scrollTop / maxPreviewScroll;
        const maxEditorScroll = textareaRef.current.scrollHeight - textareaRef.current.clientHeight;
        textareaRef.current.scrollTop = ratio * maxEditorScroll;
      }
    }
    setTimeout(() => {
      if (isScrollingRef.current === 'preview') isScrollingRef.current = null;
    }, 50);
  };

  // Global hotkeys (Ctrl+S, Ctrl+B for sidebar toggle)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [content, currentFilePath, settings]);

  const currentFileName = currentFilePath.split(/[\/\\]/).pop() || '';

  return (
    <div className="flan-app-container">
      {/* Toast notification banner */}
      {syncToast && (
        <div
          style={{
            position: 'fixed',
            top: '56px',
            right: '24px',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-lg)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          {syncToast}
        </div>
      )}

      {/* Top Navigation & Formatting Toolbar */}
      <Toolbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        editorMode={editorMode}
        onChangeEditorMode={(mode) => {
          setEditorMode(mode);
          setSettings((s) => ({ ...s, editorMode: mode }));
        }}
        theme={theme}
        onChangeTheme={(t) => {
          setTheme(t);
          setSettings((s) => ({ ...s, theme: t }));
        }}
        gitStatus={gitStatus}
        isSyncingGit={isSyncingGit}
        onGitSync={() => handleGitSync()}
        onNewFile={handleNewFile}
        onSaveFile={handleSaveFile}
        onInsertMarkdown={handleInsertMarkdown}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDirty={isDirty}
      />

      {/* Workspace Body */}
      <div className="flan-workspace-body">
        {/* Left Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          width={sidebarWidth}
          workspacePath={settings.workspacePath}
          files={files}
          currentFilePath={currentFilePath}
          onSelectFile={handleSelectFile}
          onNewFile={handleNewFile}
          onDeleteFile={handleDeleteFile}
          onSelectWorkspaceFolder={handleSelectWorkspaceFolder}
          headings={headings}
          onScrollToHeading={handleScrollToHeading}
          gitStatus={gitStatus}
          isSyncingGit={isSyncingGit}
          onGitSync={handleGitSync}
          autoGitPushOnSave={settings.autoGitPushOnSave}
          onToggleAutoGitPush={() => {
            const val = !settings.autoGitPushOnSave;
            const updated = { ...settings, autoGitPushOnSave: val };
            setSettings(updated);
            localStorage.setItem('flanmd_settings', JSON.stringify(updated));
          }}
        />

        {/* Sidebar Resizer Bar */}
        {sidebarOpen && (
          <div
            className={`sidebar-resizer ${isDraggingSidebar ? 'resizing' : ''}`}
            onMouseDown={handleSidebarMouseDown}
            onDoubleClick={() => {
              setSidebarWidth(260);
              localStorage.setItem('flanmd_sidebar_width', '260');
            }}
            title="拖拽调整侧边栏宽度 (双击恢复默认 260px)"
          />
        )}

        {/* Center Panes */}
        <main
          className="flan-editor-area"
          ref={editorAreaRef}
          style={{ userSelect: isDraggingSidebar || isDraggingSplit ? 'none' : 'auto' }}
        >
          {/* Editor Pane: Shown in 'split' and 'editor' modes */}
          {(editorMode === 'split' || editorMode === 'editor') && (
            <div
              style={{
                width: editorMode === 'split' ? `${splitRatio}%` : '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <EditorPane
                value={content}
                onChange={handleContentChange}
                onSave={handleSaveFile}
                onCursorChange={(line, col) => setCursorPos({ line, col })}
                textareaRef={textareaRef}
                onScroll={handleEditorScroll}
              />
            </div>
          )}

          {/* Divider between panes in split mode */}
          {editorMode === 'split' && (
            <div
              className={`pane-divider ${isDraggingSplit ? 'resizing' : ''}`}
              onMouseDown={handleSplitMouseDown}
              onDoubleClick={() => {
                setSplitRatio(50);
                localStorage.setItem('flanmd_split_ratio', '50');
              }}
              title="拖拽调整编辑器与预览比例 (双击恢复 50:50)"
            />
          )}

          {/* Preview Pane: Shown in 'split', 'live', and 'reader' modes */}
          {(editorMode === 'split' || editorMode === 'live' || editorMode === 'reader') && (
            <div
              style={{
                width: editorMode === 'split' ? `${100 - splitRatio}%` : '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                flex: 1,
              }}
            >
              <PreviewPane
                html={html}
                frontmatter={frontmatter}
                theme={theme}
                isReaderMode={editorMode === 'reader'}
                previewRef={previewRef}
                onScroll={handlePreviewScroll}
              />
            </div>
          )}
        </main>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        currentFileName={currentFileName}
        isDirty={isDirty}
        line={cursorPos.line}
        col={cursorPos.col}
        charCount={stats.charCount}
        wordCount={stats.wordCount}
        readingTimeMin={stats.readingTimeMin}
        gitStatus={gitStatus}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          setTheme(newSettings.theme);
          setEditorMode(newSettings.editorMode);
          localStorage.setItem('flanmd_settings', JSON.stringify(newSettings));
          showToast('⚙️ 设置已更新');
        }}
      />
    </div>
  );
};

export default App;
