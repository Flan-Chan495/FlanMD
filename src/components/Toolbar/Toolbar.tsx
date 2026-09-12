import React, { useState, useEffect, useRef } from 'react';
import {
  FilePlus,
  Save,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Code,
  Quote,
  List,
  CheckSquare,
  Table,
  Link,
  Image,
  Calculator,
  GitBranch,
  RefreshCw,
  Sun,
  Moon,
  Coffee,
  Settings,
  Columns,
  Eye,
  Edit3,
  BookOpen,
  PanelLeft,
  Check,
  FileText,
  FolderOpen
} from 'lucide-react';
import { EditorMode, ThemeMode, GitStatus } from '../../types';

interface ToolbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  editorMode: EditorMode;
  onChangeEditorMode: (mode: EditorMode) => void;
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  gitStatus: GitStatus | null;
  isSyncingGit: boolean;
  onGitSync: () => void;
  onNewTextFile: () => void;
  onNewBlogPost: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
  onCloseEditor: () => void;
  onInsertMarkdown: (prefix: string, suffix?: string, defaultText?: string) => void;
  onOpenSettings: () => void;
  isDirty: boolean;
  currentFileName: string;
  autoSave: boolean;
  onToggleAutoSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  sidebarOpen,
  onToggleSidebar,
  editorMode,
  onChangeEditorMode,
  theme,
  onChangeTheme,
  gitStatus,
  isSyncingGit,
  onGitSync,
  onNewTextFile,
  onNewBlogPost,
  onOpenFile,
  onOpenFolder,
  onSaveFile,
  onSaveFileAs,
  onCloseEditor,
  onInsertMarkdown,
  onOpenSettings,
  isDirty,
  currentFileName,
  autoSave,
  onToggleAutoSave,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  const [activeMenu, setActiveMenu] = useState<'file' | 'edit' | 'selection' | 'view' | 'terminal' | 'help' | null>(null);
  const menubarRef = useRef<HTMLDivElement | null>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menubarRef.current && !menubarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenu]);

  const handleMenuClick = (menu: 'file' | 'edit' | 'selection' | 'view' | 'terminal' | 'help') => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  const handleMenuHover = (menu: 'file' | 'edit' | 'selection' | 'view' | 'terminal' | 'help') => {
    if (activeMenu !== null) {
      setActiveMenu(menu);
    }
  };

  const closeMenu = () => {
    setActiveMenu(null);
  };

  const cycleTheme = () => {
    if (theme === 'dark') onChangeTheme('light');
    else if (theme === 'light') onChangeTheme('sepia');
    else onChangeTheme('dark');
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon size={15} />;
    if (theme === 'light') return <Sun size={15} />;
    return <Coffee size={15} />;
  };

  return (
    <header className="flan-toolbar">
      {/* Left: Brand & VS Code Menu Bar */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${sidebarOpen ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title="切换侧边栏 (Ctrl+B)"
        >
          <PanelLeft size={16} />
        </button>

        <div className="app-brand-badge" style={{ marginRight: '8px' }}>
          <div className="brand-icon">🍧</div>
          <span style={{ fontSize: '0.95rem' }}>FlanMD</span>
        </div>

        {/* Top Menubar */}
        <div className="flan-menubar" ref={menubarRef}>
          {/* 1. File Menu */}
          <div className="menubar-item">
            <button
              className={`menubar-btn ${activeMenu === 'file' ? 'active' : ''}`}
              onClick={() => handleMenuClick('file')}
              onMouseEnter={() => handleMenuHover('file')}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div className="vscode-menu-dropdown">
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onNewTextFile();
                  }}
                >
                  <span className="menu-item-label">
                    <FileText size={13} style={{ opacity: 0.7 }} />
                    New Text File (新建文件)
                  </span>
                  <span className="menu-item-shortcut">Ctrl+N</span>
                </div>

                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onNewBlogPost();
                  }}
                >
                  <span className="menu-item-label">
                    <FilePlus size={13} style={{ opacity: 0.7 }} />
                    New Blog Post (新建博文模板)...
                  </span>
                </div>

                <div className="menu-divider" />

                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onOpenFile();
                  }}
                >
                  <span className="menu-item-label">
                    <FileText size={13} style={{ opacity: 0.7 }} />
                    Open File (打开文件)...
                  </span>
                  <span className="menu-item-shortcut">Ctrl+O</span>
                </div>

                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onOpenFolder();
                  }}
                >
                  <span className="menu-item-label">
                    <FolderOpen size={13} style={{ opacity: 0.7 }} />
                    Open Folder (打开文件夹)...
                  </span>
                  <span className="menu-item-shortcut">Ctrl+K Ctrl+O</span>
                </div>

                <div className="menu-divider" />

                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onSaveFile();
                  }}
                >
                  <span className="menu-item-label">
                    <Save size={13} style={{ opacity: 0.7 }} />
                    Save (保存)
                  </span>
                  <span className="menu-item-shortcut">Ctrl+S</span>
                </div>

                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onSaveFileAs();
                  }}
                >
                  <span className="menu-item-label">Save As (另存为)...</span>
                  <span className="menu-item-shortcut">Ctrl+Shift+S</span>
                </div>

                <div className="menu-divider" />

                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onToggleAutoSave();
                  }}
                >
                  <span className="menu-item-label">
                    {autoSave ? <Check size={12} style={{ color: '#10b981' }} /> : <span style={{ width: '12px' }} />}
                    Auto Save (自动保存)
                  </span>
                </div>

                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onOpenSettings();
                  }}
                >
                  <span className="menu-item-label">
                    <Settings size={13} style={{ opacity: 0.7 }} />
                    Preferences (偏好设置)...
                  </span>
                </div>

                <div className="menu-divider" />

                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onCloseEditor();
                  }}
                >
                  <span className="menu-item-label">Close Editor (关闭文件)</span>
                  <span className="menu-item-shortcut">Ctrl+W</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Edit Menu */}
          <div className="menubar-item">
            <button
              className={`menubar-btn ${activeMenu === 'edit' ? 'active' : ''}`}
              onClick={() => handleMenuClick('edit')}
              onMouseEnter={() => handleMenuHover('edit')}
            >
              Edit
            </button>
            {activeMenu === 'edit' && (
              <div className="vscode-menu-dropdown">
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    document.execCommand('undo');
                  }}
                >
                  <span className="menu-item-label">Undo (撤销)</span>
                  <span className="menu-item-shortcut">Ctrl+Z</span>
                </div>
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    document.execCommand('redo');
                  }}
                >
                  <span className="menu-item-label">Redo (重做)</span>
                  <span className="menu-item-shortcut">Ctrl+Y</span>
                </div>

                <div className="menu-divider" />

                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onInsertMarkdown('**', '**', '粗体文字');
                  }}
                >
                  <span className="menu-item-label">
                    <Bold size={12} style={{ opacity: 0.7 }} />
                    Bold (粗体)
                  </span>
                  <span className="menu-item-shortcut">Ctrl+B</span>
                </div>
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onInsertMarkdown('*', '*', '斜体文字');
                  }}
                >
                  <span className="menu-item-label">
                    <Italic size={12} style={{ opacity: 0.7 }} />
                    Italic (斜体)
                  </span>
                  <span className="menu-item-shortcut">Ctrl+I</span>
                </div>
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onInsertMarkdown('```ts\n', '\n```', '// 代码');
                  }}
                >
                  <span className="menu-item-label">
                    <Code size={12} style={{ opacity: 0.7 }} />
                    Code Block (代码块)
                  </span>
                </div>
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onInsertMarkdown('| 标题 1 | 标题 2 |\n| :--- | :--- |\n| 内容 1 | 内容 2 |\n', '');
                  }}
                >
                  <span className="menu-item-label">
                    <Table size={12} style={{ opacity: 0.7 }} />
                    Table (插入表格)
                  </span>
                </div>
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onInsertMarkdown('$$ \n', '\n $$', 'E = mc^2');
                  }}
                >
                  <span className="menu-item-label">
                    <Calculator size={12} style={{ opacity: 0.7 }} />
                    Math Formula (KaTeX 公式)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Selection Menu */}
          <div className="menubar-item">
            <button
              className={`menubar-btn ${activeMenu === 'selection' ? 'active' : ''}`}
              onClick={() => handleMenuClick('selection')}
              onMouseEnter={() => handleMenuHover('selection')}
            >
              Selection
            </button>
            {activeMenu === 'selection' && (
              <div className="vscode-menu-dropdown">
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    document.execCommand('selectAll');
                  }}
                >
                  <span className="menu-item-label">Select All (全选)</span>
                  <span className="menu-item-shortcut">Ctrl+A</span>
                </div>
              </div>
            )}
          </div>

          {/* 4. View Menu */}
          <div className="menubar-item">
            <button
              className={`menubar-btn ${activeMenu === 'view' ? 'active' : ''}`}
              onClick={() => handleMenuClick('view')}
              onMouseEnter={() => handleMenuHover('view')}
            >
              View
            </button>
            {activeMenu === 'view' && (
              <div className="vscode-menu-dropdown">
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onToggleSidebar();
                  }}
                >
                  <span className="menu-item-label">Toggle Side Bar (侧边栏)</span>
                  <span className="menu-item-shortcut">Ctrl+B</span>
                </div>

                <div className="menu-divider" />

                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onChangeEditorMode('split');
                  }}
                >
                  <span className="menu-item-label">
                    {editorMode === 'split' && <Check size={12} style={{ color: '#10b981' }} />}
                    Split View (双栏对照)
                  </span>
                </div>
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onChangeEditorMode('live');
                  }}
                >
                  <span className="menu-item-label">
                    {editorMode === 'live' && <Check size={12} style={{ color: '#10b981' }} />}
                    Live Preview (实时预览)
                  </span>
                </div>
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onChangeEditorMode('editor');
                  }}
                >
                  <span className="menu-item-label">
                    {editorMode === 'editor' && <Check size={12} style={{ color: '#10b981' }} />}
                    Editor Only (纯净编辑)
                  </span>
                </div>
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onChangeEditorMode('reader');
                  }}
                >
                  <span className="menu-item-label">
                    {editorMode === 'reader' && <Check size={12} style={{ color: '#10b981' }} />}
                    Reader Mode (沉浸阅读)
                  </span>
                </div>

                <div className="menu-divider" />

                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onZoomIn();
                  }}
                >
                  <span className="menu-item-label">Zoom In (放大字体)</span>
                  <span className="menu-item-shortcut">Ctrl +</span>
                </div>
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onZoomOut();
                  }}
                >
                  <span className="menu-item-label">Zoom Out (缩小字体)</span>
                  <span className="menu-item-shortcut">Ctrl -</span>
                </div>
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onResetZoom();
                  }}
                >
                  <span className="menu-item-label">Reset Zoom (重置字体)</span>
                  <span className="menu-item-shortcut">Ctrl 0</span>
                </div>

                <div className="menu-divider" />

                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onChangeTheme('dark');
                  }}
                >
                  <span className="menu-item-label">
                    {theme === 'dark' && <Check size={12} style={{ color: '#10b981' }} />}
                    Dark Theme (深色主题)
                  </span>
                </div>
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onChangeTheme('light');
                  }}
                >
                  <span className="menu-item-label">
                    {theme === 'light' && <Check size={12} style={{ color: '#10b981' }} />}
                    Light Theme (浅色主题)
                  </span>
                </div>
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onChangeTheme('sepia');
                  }}
                >
                  <span className="menu-item-label">
                    {theme === 'sepia' && <Check size={12} style={{ color: '#10b981' }} />}
                    Sepia Theme (护眼羊皮纸)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 5. Terminal / Git Menu */}
          <div className="menubar-item">
            <button
              className={`menubar-btn ${activeMenu === 'terminal' ? 'active' : ''}`}
              onClick={() => handleMenuClick('terminal')}
              onMouseEnter={() => handleMenuHover('terminal')}
            >
              Terminal
            </button>
            {activeMenu === 'terminal' && (
              <div className="vscode-menu-dropdown">
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    onGitSync();
                  }}
                >
                  <span className="menu-item-label">
                    <GitBranch size={13} style={{ opacity: 0.7 }} />
                    Git: Commit & Push (提交并推送)
                  </span>
                  <span className="menu-item-shortcut">Ctrl+Shift+G</span>
                </div>
              </div>
            )}
          </div>

          {/* 6. Help Menu */}
          <div className="menubar-item">
            <button
              className={`menubar-btn ${activeMenu === 'help' ? 'active' : ''}`}
              onClick={() => handleMenuClick('help')}
              onMouseEnter={() => handleMenuHover('help')}
            >
              Help
            </button>
            {activeMenu === 'help' && (
              <div className="vscode-menu-dropdown">
                <div
                  className="menu-item-row"
                  onClick={() => {
                    closeMenu();
                    alert('FlanMD 是一款专为独立博主与创作者打造的轻量级桌面 Markdown 写作工作台。\n支持：KaTeX数学公式、Mermaid流程图、GitHub Callout、VitePress容器语法、Git一键同步与推送！');
                  }}
                >
                  <span className="menu-item-label">About FlanMD (关于)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center: Current Document Title */}
      <div className="toolbar-window-title" title={currentFileName || 'untitled.md'}>
        {currentFileName || 'untitled.md'}
        {isDirty && ' •'}
      </div>

      {/* Right: Markdown Quick Tools & Controls */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('**', '**', '粗体文字')}
          title="粗体 (Ctrl+B)"
        >
          <Bold size={14} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('*', '*', '斜体文字')}
          title="斜体 (Ctrl+I)"
        >
          <Italic size={14} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('~~', '~~', '删除线文字')}
          title="删除线"
        >
          <Strikethrough size={14} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('# ', '', '一级标题')}
          title="一级标题 H1"
        >
          <Heading1 size={14} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('## ', '', '二级标题')}
          title="二级标题 H2"
        >
          <Heading2 size={14} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('```ts\n', '\n```', '// 编写代码')}
          title="代码块"
        >
          <Code size={14} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('> ', '', '引用内容')}
          title="引用内容"
        >
          <Quote size={14} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('- ', '', '无序列表项')}
          title="无序列表"
        >
          <List size={14} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('- [ ] ', '', '待办任务')}
          title="任务清单"
        >
          <CheckSquare size={14} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() =>
            onInsertMarkdown(
              '| 标题 1 | 标题 2 |\n| :--- | :--- |\n| 内容 1 | 内容 2 |\n',
              ''
            )
          }
          title="表格"
        >
          <Table size={14} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('[', '](https://example.com)', '链接描述')}
          title="插入链接"
        >
          <Link size={14} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('![', '](https://example.com/image.png)', '图片描述')}
          title="插入图片"
        >
          <Image size={14} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('$$ \n', '\n $$', 'E = mc^2')}
          title="KaTeX 数学公式"
        >
          <Calculator size={14} />
        </button>

        <div className="toolbar-divider" />

        {/* Mode Segmented Control */}
        <div className="mode-segmented-control">
          <button
            className={`mode-tab-btn ${editorMode === 'split' ? 'active' : ''}`}
            onClick={() => onChangeEditorMode('split')}
            title="双栏分栏模式"
          >
            <Columns size={12} />
            <span>双栏</span>
          </button>
          <button
            className={`mode-tab-btn ${editorMode === 'live' ? 'active' : ''}`}
            onClick={() => onChangeEditorMode('live')}
            title="实时渲染预览"
          >
            <Eye size={12} />
            <span>预览</span>
          </button>
          <button
            className={`mode-tab-btn ${editorMode === 'editor' ? 'active' : ''}`}
            onClick={() => onChangeEditorMode('editor')}
            title="纯净编辑模式"
          >
            <Edit3 size={12} />
            <span>编辑</span>
          </button>
          <button
            className={`mode-tab-btn ${editorMode === 'reader' ? 'active' : ''}`}
            onClick={() => onChangeEditorMode('reader')}
            title="沉浸阅读模式"
          >
            <BookOpen size={12} />
            <span>阅读</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Git Sync Button */}
        {gitStatus?.is_repo && (
          <button
            className={`git-sync-btn ${isSyncingGit ? 'syncing' : ''}`}
            onClick={onGitSync}
            title={`Git 同步 (${gitStatus.branch}) - 点击推送到 GitHub`}
          >
            <span
              className={`git-badge-dot ${
                gitStatus.modified_count > 0 ? 'has-changes' : ''
              }`}
            />
            <GitBranch size={12} />
            <span>{gitStatus.branch || 'main'}</span>
            <RefreshCw size={11} className={isSyncingGit ? 'animate-spin' : ''} />
          </button>
        )}

        {/* Theme Switcher */}
        <button
          className="toolbar-btn"
          onClick={cycleTheme}
          title={`当前主题: ${theme} (点击切换深色/浅色/护眼)`}
        >
          {getThemeIcon()}
        </button>

        {/* Settings button */}
        <button className="toolbar-btn" onClick={onOpenSettings} title="设置与规则">
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
