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
  getCurrentDir,
  openFolderPicker,
  openFilePicker,
  saveFilePicker,
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
  const [openFiles, setOpenFiles] = useState<{ path: string; name: string }[]>([]);
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

  // Font Size Scaling State (Ctrl + MouseWheel)
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('flanmd_font_size');
    return saved ? parseInt(saved, 10) : 17;
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty(
      '--preview-font-size',
      `${(fontSize * 1.03).toFixed(1)}px`
    );
  }, [fontSize]);

  // Ctrl + MouseWheel Zoom Handler
  useEffect(() => {
    let toastTimer: any = null;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1 : -1;
        setFontSize((prev) => {
          const next = Math.max(12, Math.min(36, prev + delta));
          localStorage.setItem('flanmd_font_size', String(next));
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => {
            showToast(`🔍 字体缩放: ${next}px (${Math.round((next / 17) * 100)}%)`);
          }, 100);
          return next;
        });
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      clearTimeout(toastTimer);
    };
  }, []);



  // Apply theme to root document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load files in workspace
  const loadWorkspace = async (dirPath: string) => {
    try {
      let targetPath = dirPath;
      if (!targetPath || targetPath === '/blog/_posts') {
        const cur = await getCurrentDir();
        if (cur) {
          targetPath = cur;
          setSettings((s) => {
            const updated = { ...s, workspacePath: targetPath };
            localStorage.setItem('flanmd_settings', JSON.stringify(updated));
            return updated;
          });
        }
      }
      const fileList = await listFiles(targetPath);
      setFiles(fileList);

      // Check Git status
      const status = await getGitStatus(targetPath);
      setGitStatus(status);

      // Auto-open first file if none open
      if (!currentFilePath && fileList.length > 0) {
        const firstFile = fileList.find((f) => !f.is_dir) || fileList[0];
        if (firstFile && !firstFile.is_dir) {
          setCurrentFilePath(firstFile.path);
          const text = await readFile(firstFile.path);
          setContent(text);
          setIsDirty(false);
        }
      }
    } catch (e) {
      console.error('Failed to load workspace:', e);
    }
  };

  useEffect(() => {
    loadWorkspace(settings.workspacePath);
  }, [settings.workspacePath]);

  // Track open files in open editors tab
  useEffect(() => {
    if (currentFilePath) {
      const name = currentFilePath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || currentFilePath;
      setOpenFiles((prev) => {
        if (prev.some((f) => f.path === currentFilePath)) return prev;
        return [...prev, { path: currentFilePath, name }];
      });
    }
  }, [currentFilePath]);

  const handleCloseOpenFile = (path: string) => {
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.path !== path);
      if (currentFilePath === path) {
        if (next.length > 0) {
          handleSelectFile({ name: next[0].name, path: next[0].path, is_dir: false });
        } else {
          setCurrentFilePath('');
          setContent('');
          setIsDirty(false);
        }
      }
      return next;
    });
  };

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
      handleSaveFileAs();
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

  const handleNewTextFile = async () => {
    const fileName = prompt('请输入新建文件名（例如: notes.md 或 test.txt）：', 'untitled.md');
    if (!fileName || !fileName.trim()) return;

    let targetDir = settings.workspacePath;
    if (!targetDir || targetDir === '/blog/_posts') {
      targetDir = await getCurrentDir();
    }
    const newPath = `${targetDir}/${fileName.trim()}`;

    try {
      await saveFile(newPath, '');
      await loadWorkspace(targetDir);
      setCurrentFilePath(newPath);
      setContent('');
      setIsDirty(false);
      showToast(`📄 文件 ${fileName} 创建成功`);
    } catch (e) {
      console.error('Create file error:', e);
      showToast(`❌ 创建文件失败`);
    }
  };

  const handleNewBlogPost = async () => {
    const title = prompt('请输入新文章标题：', '我的新博文');
    if (!title) return;

    const initialText = generateFrontmatterTemplate(title, settings.frontmatterRules);
    const fileName = `${new Date().toISOString().slice(0, 10)}-${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    let targetDir = settings.workspacePath;
    if (!targetDir || targetDir === '/blog/_posts') {
      targetDir = await getCurrentDir();
    }
    const newPath = `${targetDir}/${fileName}`;

    try {
      await saveFile(newPath, initialText);
      await loadWorkspace(targetDir);
      setCurrentFilePath(newPath);
      setContent(initialText);
      setIsDirty(false);
      showToast(`📝 博文 ${fileName} 创建成功`);
    } catch (e) {
      console.error('New blog post error:', e);
    }
  };

  const handleOpenFile = async () => {
    const filePath = await openFilePicker();
    if (filePath && filePath.trim()) {
      try {
        const text = await readFile(filePath.trim());
        const fileName = filePath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || filePath;
        setCurrentFilePath(filePath.trim());
        setContent(text);
        setIsDirty(false);
        showToast(`📂 已打开: ${fileName}`);
      } catch (e) {
        console.error('Failed to open file:', e);
        showToast('❌ 打开文件失败');
      }
    }
  };

  const handleSaveFileAs = async () => {
    const curName = currentFilePath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'untitled.md';
    const targetPath = await saveFilePicker(curName);
    if (targetPath && targetPath.trim()) {
      try {
        await saveFile(targetPath.trim(), content);
        const fileName = targetPath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || targetPath;
        setCurrentFilePath(targetPath.trim());
        setIsDirty(false);
        if (settings.workspacePath) {
          loadWorkspace(settings.workspacePath);
        }
        showToast(`💾 已另存为: ${fileName}`);
      } catch (e) {
        console.error('Save as failed:', e);
        showToast('❌ 另存为失败');
      }
    }
  };

  const handleCloseEditor = () => {
    if (currentFilePath) {
      handleCloseOpenFile(currentFilePath);
    } else {
      setContent('');
      setIsDirty(false);
    }
  };

  const handleZoomIn = () => {
    setFontSize((prev) => {
      const next = Math.min(36, prev + 1);
      localStorage.setItem('flanmd_font_size', String(next));
      showToast(`🔍 字体缩放: ${next}px`);
      return next;
    });
  };

  const handleZoomOut = () => {
    setFontSize((prev) => {
      const next = Math.max(12, prev - 1);
      localStorage.setItem('flanmd_font_size', String(next));
      showToast(`🔍 字体缩放: ${next}px`);
      return next;
    });
  };

  const handleResetZoom = () => {
    setFontSize(17);
    localStorage.setItem('flanmd_font_size', '17');
    showToast(`🔍 字体重置: 17px (100%)`);
  };

  // Auto-save effect
  useEffect(() => {
    if (!settings.autoSave || !isDirty || !currentFilePath) return;
    const timer = setTimeout(() => {
      handleSaveFile();
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, settings.autoSave, isDirty, currentFilePath]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'n' && !e.shiftKey) {
          e.preventDefault();
          handleNewTextFile();
        } else if (key === 'o' && !e.shiftKey) {
          e.preventDefault();
          handleOpenFile();
        } else if (key === 's' && e.shiftKey) {
          e.preventDefault();
          handleSaveFileAs();
        } else if (key === 's' && !e.shiftKey) {
          e.preventDefault();
          handleSaveFile();
        } else if (key === 'b') {
          e.preventDefault();
          setSidebarOpen((prev) => !prev);
        } else if (key === 'w') {
          e.preventDefault();
          handleCloseEditor();
        } else if (key === '0') {
          e.preventDefault();
          handleResetZoom();
        } else if (key === '=' || key === '+') {
          e.preventDefault();
          handleZoomIn();
        } else if (key === '-') {
          e.preventDefault();
          handleZoomOut();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFilePath, content, settings]);

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
    const dir = await openFolderPicker();
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

  // Global hotkeys (Ctrl+S for save, Ctrl+0 for zoom reset)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveFile();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '0' || e.key === 'NumPad0')) {
        e.preventDefault();
        setFontSize(17);
        localStorage.setItem('flanmd_font_size', '17');
        showToast('🔍 字体大小已重置为默认 (100%)');
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
        onNewTextFile={handleNewTextFile}
        onNewBlogPost={handleNewBlogPost}
        onOpenFile={handleOpenFile}
        onOpenFolder={handleSelectWorkspaceFolder}
        onSaveFile={handleSaveFile}
        onSaveFileAs={handleSaveFileAs}
        onCloseEditor={handleCloseEditor}
        onInsertMarkdown={handleInsertMarkdown}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDirty={isDirty}
        currentFileName={currentFileName}
        autoSave={settings.autoSave}
        onToggleAutoSave={() => {
          const val = !settings.autoSave;
          const updated = { ...settings, autoSave: val };
          setSettings(updated);
          localStorage.setItem('flanmd_settings', JSON.stringify(updated));
          showToast(val ? '✓ 已开启自动保存' : '已关闭自动保存');
        }}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
      />

      {/* Workspace Body */}
      <div className="flan-workspace-body">
        {/* Left Sidebar & Activity Bar */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggleOpen={() => setSidebarOpen((prev) => !prev)}
          width={sidebarWidth}
          workspacePath={settings.workspacePath}
          files={files}
          currentFilePath={currentFilePath}
          openFiles={openFiles}
          isDirty={isDirty}
          onSelectFile={handleSelectFile}
          onCloseOpenFile={handleCloseOpenFile}
          onNewFile={handleNewTextFile}
          onDeleteFile={handleDeleteFile}
          onSelectWorkspaceFolder={handleSelectWorkspaceFolder}
          onRefreshWorkspace={() => loadWorkspace(settings.workspacePath)}
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
          onOpenSettings={() => setIsSettingsOpen(true)}
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
                fontSize={fontSize}
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
