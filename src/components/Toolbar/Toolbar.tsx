import React from 'react';
import {
  PanelLeft,
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
  BookOpen
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
  onNewFile: () => void;
  onSaveFile: () => void;
  onInsertMarkdown: (prefix: string, suffix?: string, defaultText?: string) => void;
  onOpenSettings: () => void;
  isDirty: boolean;
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
  onNewFile,
  onSaveFile,
  onInsertMarkdown,
  onOpenSettings,
  isDirty,
}) => {
  const cycleTheme = () => {
    if (theme === 'dark') onChangeTheme('light');
    else if (theme === 'light') onChangeTheme('sepia');
    else onChangeTheme('dark');
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon size={16} />;
    if (theme === 'light') return <Sun size={16} />;
    return <Coffee size={16} />;
  };

  return (
    <header className="flan-toolbar">
      {/* Left group: Brand & Sidebar toggle & File ops */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${sidebarOpen ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title="切换侧边栏 (Ctrl+B)"
        >
          <PanelLeft size={18} />
        </button>

        <div className="app-brand-badge">
          <div className="brand-icon">🍧</div>
          <span>FlanMD</span>
        </div>

        <div className="toolbar-divider" />

        <button className="toolbar-btn" onClick={onNewFile} title="新建文章 (带 Frontmatter 模板)">
          <FilePlus size={17} />
        </button>
        <button
          className={`toolbar-btn ${isDirty ? 'active' : ''}`}
          onClick={onSaveFile}
          title={isDirty ? '保存更改 (Ctrl+S) - 有未保存内容' : '已保存 (Ctrl+S)'}
        >
          <Save size={17} />
        </button>
      </div>

      {/* Middle group: Markdown formatting shortcuts */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('**', '**', '粗体文字')}
          title="粗体 (Ctrl+B)"
        >
          <Bold size={15} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('*', '*', '斜体文字')}
          title="斜体 (Ctrl+I)"
        >
          <Italic size={15} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('~~', '~~', '删除线文字')}
          title="删除线"
        >
          <Strikethrough size={15} />
        </button>

        <div className="toolbar-divider" />

        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('# ', '', '一级标题')}
          title="一级标题 H1"
        >
          <Heading1 size={15} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('## ', '', '二级标题')}
          title="二级标题 H2"
        >
          <Heading2 size={15} />
        </button>

        <div className="toolbar-divider" />

        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('```ts\n', '\n```', '// 编写代码')}
          title="代码块"
        >
          <Code size={15} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('> ', '', '引用内容')}
          title="引用内容"
        >
          <Quote size={15} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('- ', '', '无序列表项')}
          title="无序列表"
        >
          <List size={15} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('- [ ] ', '', '待办任务')}
          title="任务清单"
        >
          <CheckSquare size={15} />
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
          <Table size={15} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('[', '](https://example.com)', '链接描述')}
          title="插入链接"
        >
          <Link size={15} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('![', '](https://example.com/image.png)', '图片描述')}
          title="插入图片"
        >
          <Image size={15} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onInsertMarkdown('$$ \n', '\n $$', 'E = mc^2')}
          title="KaTeX 数学公式"
        >
          <Calculator size={15} />
        </button>
      </div>

      {/* Right group: Mode Switch, Git Sync, Theme & Settings */}
      <div className="toolbar-group">
        {/* Mode Segmented Control */}
        <div className="mode-segmented-control">
          <button
            className={`mode-tab-btn ${editorMode === 'split' ? 'active' : ''}`}
            onClick={() => onChangeEditorMode('split')}
            title="双栏分栏模式"
          >
            <Columns size={13} />
            <span>双栏</span>
          </button>
          <button
            className={`mode-tab-btn ${editorMode === 'live' ? 'active' : ''}`}
            onClick={() => onChangeEditorMode('live')}
            title="实时渲染预览"
          >
            <Eye size={13} />
            <span>预览</span>
          </button>
          <button
            className={`mode-tab-btn ${editorMode === 'editor' ? 'active' : ''}`}
            onClick={() => onChangeEditorMode('editor')}
            title="纯净编辑模式"
          >
            <Edit3 size={13} />
            <span>编辑</span>
          </button>
          <button
            className={`mode-tab-btn ${editorMode === 'reader' ? 'active' : ''}`}
            onClick={() => onChangeEditorMode('reader')}
            title="沉浸阅读模式"
          >
            <BookOpen size={13} />
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
            <GitBranch size={13} />
            <span>{gitStatus.branch || 'main'}</span>
            <RefreshCw size={12} className={isSyncingGit ? 'animate-spin' : ''} />
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
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
