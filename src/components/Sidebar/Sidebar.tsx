import React, { useState } from 'react';
import {
  Files,
  GitPullRequest,
  ListTree,
  Settings,
  Folder,
  FolderOpen,
  FileText,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  RotateCw,
  X,
  Minus
} from 'lucide-react';
import { FileEntry, GitStatus, HeadingItem } from '../../types';
import { listFiles } from '../../services/tauriService';

interface SidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  width?: number;
  workspacePath: string;
  files: FileEntry[];
  currentFilePath: string;
  openFiles: { path: string; name: string }[];
  isDirty: boolean;
  onSelectFile: (file: FileEntry) => void;
  onCloseOpenFile: (path: string) => void;
  onNewFile: () => void;
  onDeleteFile: (path: string) => void;
  onSelectWorkspaceFolder: () => void;
  onRefreshWorkspace: () => void;
  headings: HeadingItem[];
  onScrollToHeading: (id: string) => void;
  gitStatus: GitStatus | null;
  isSyncingGit: boolean;
  onGitSync: (customMsg?: string) => void;
  autoGitPushOnSave: boolean;
  onToggleAutoGitPush: () => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggleOpen,
  width,
  workspacePath,
  files,
  currentFilePath,
  openFiles,
  isDirty,
  onSelectFile,
  onCloseOpenFile,
  onNewFile,
  onDeleteFile,
  onSelectWorkspaceFolder,
  onRefreshWorkspace,
  headings,
  onScrollToHeading,
  gitStatus,
  isSyncingGit,
  onGitSync,
  autoGitPushOnSave,
  onToggleAutoGitPush,
  onOpenSettings,
}) => {
  const [activeView, setActiveView] = useState<'explorer' | 'git' | 'outline'>('explorer');
  const [searchQuery, setSearchQuery] = useState('');
  const [commitMsg, setCommitMsg] = useState('');

  // Accordion section states
  const [isOpenEditorsExpanded, setIsOpenEditorsExpanded] = useState(true);
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(true);
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);

  // Folder tree expansion & cached children
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [subfolderChildren, setSubfolderChildren] = useState<Record<string, FileEntry[]>>({});

  const workspaceRootName = workspacePath
    ? workspacePath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'WORKSPACE'
    : 'WORKSPACE';

  const handleActivityClick = (view: 'explorer' | 'git' | 'outline') => {
    if (activeView === view) {
      onToggleOpen();
    } else {
      setActiveView(view);
      if (!isOpen) {
        onToggleOpen();
      }
    }
  };

  const handleToggleFolder = async (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });

    if (!subfolderChildren[folderPath]) {
      try {
        const children = await listFiles(folderPath);
        setSubfolderChildren((prev) => ({ ...prev, [folderPath]: children }));
      } catch (e) {
        console.error('Failed to list subfolder:', folderPath, e);
      }
    }
  };

  const handleCollapseAll = () => {
    setExpandedFolders(new Set());
  };

  const handleRefresh = () => {
    setSubfolderChildren({});
    onRefreshWorkspace();
  };

  const isFileModified = (filePath: string) => {
    if (!gitStatus?.modified_files) return false;
    const fileName = filePath.split(/[\/\\]/).pop()?.toLowerCase();
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    return gitStatus.modified_files.some((mod) => {
      const modClean = mod.replace(/^[MADRCU?\s]+/, '').trim().replace(/\\/g, '/').toLowerCase();
      return (
        normalizedPath.endsWith(modClean) ||
        (fileName && modClean.endsWith(fileName))
      );
    });
  };

  const isFolderModified = (folderPath: string) => {
    if (!gitStatus?.modified_files) return false;
    const folderName = folderPath.split(/[\/\\]/).pop()?.toLowerCase();
    if (!folderName) return false;
    return gitStatus.modified_files.some((mod) => {
      const modClean = mod.replace(/^[MADRCU?\s]+/, '').trim().replace(/\\/g, '/').toLowerCase();
      return modClean.includes(`/${folderName}/`) || modClean.startsWith(`${folderName}/`);
    });
  };

  const renderFileIcon = (file: { name: string; path: string; is_dir: boolean; extension?: string }, isOpenDir?: boolean) => {
    if (file.is_dir) {
      return isOpenDir ? (
        <FolderOpen size={14} style={{ color: '#dcb67a', flexShrink: 0 }} />
      ) : (
        <Folder size={14} style={{ color: '#dcb67a', flexShrink: 0 }} />
      );
    }

    const name = file.name.toLowerCase();
    const ext = file.extension?.toLowerCase() || name.split('.').pop() || '';

    if (name === '.gitignore') {
      return <span style={{ color: '#f05032', fontWeight: 800, fontSize: '11px', width: '16px', textAlign: 'center' }}>⑂</span>;
    }
    if (ext === 'tsx' || ext === 'jsx') {
      return <span style={{ color: '#61dafb', fontWeight: 800, fontSize: '12px', width: '16px', textAlign: 'center' }}>⚛</span>;
    }
    if (ext === 'ts') {
      return <span style={{ color: '#3178c6', fontWeight: 800, fontSize: '10px', width: '16px', textAlign: 'center' }}>TS</span>;
    }
    if (ext === 'js') {
      return <span style={{ color: '#f7df1e', fontWeight: 800, fontSize: '10px', width: '16px', textAlign: 'center' }}>JS</span>;
    }
    if (ext === 'css') {
      return <span style={{ color: '#42a5f5', fontWeight: 700, fontSize: '11px', width: '16px', textAlign: 'center' }}>&#123; &#125;</span>;
    }
    if (ext === 'json') {
      return <span style={{ color: '#fbc02d', fontWeight: 700, fontSize: '11px', width: '16px', textAlign: 'center' }}>&#123; &#125;</span>;
    }
    if (ext === 'md' || ext === 'markdown') {
      return <span style={{ color: '#4fc3f7', fontWeight: 800, fontSize: '11px', width: '16px', textAlign: 'center' }}>M↓</span>;
    }
    if (ext === 'html') {
      return <span style={{ color: '#e44d26', fontWeight: 700, fontSize: '11px', width: '16px', textAlign: 'center' }}>&lt;/&gt;</span>;
    }
    if (ext === 'rs') {
      return <span style={{ color: '#dea584', fontWeight: 700, fontSize: '11px', width: '16px', textAlign: 'center' }}>🦀</span>;
    }
    return <FileText size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />;
  };

  const renderTreeItem = (item: FileEntry, depth: number = 0) => {
    const isSelected = item.path === currentFilePath;
    const isExpanded = expandedFolders.has(item.path);
    const children = subfolderChildren[item.path] || item.children || [];
    const modified = !item.is_dir && isFileModified(item.path);
    const folderHasMod = item.is_dir && isFolderModified(item.path);

    const paddingLeft = depth * 14 + 10;

    return (
      <React.Fragment key={item.path}>
        <div
          className={`vscode-tree-item ${isSelected ? 'active' : ''}`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => {
            if (item.is_dir) {
              handleToggleFolder(item.path);
            } else {
              onSelectFile(item);
            }
          }}
          title={item.path}
        >
          {item.is_dir ? (
            <span
              className={`vscode-chevron ${isExpanded ? 'expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFolder(item.path);
              }}
            >
              <ChevronRight size={12} />
            </span>
          ) : (
            <span style={{ width: '16px', flexShrink: 0 }} />
          )}

          <span className="tree-item-icon">
            {renderFileIcon(item, isExpanded)}
          </span>

          <span
            className="tree-item-label"
            style={modified ? { color: '#e5c07b' } : undefined}
          >
            {item.name}
          </span>

          {modified && (
            <span className="tree-item-git-badge modified" title="Modified">
              M
            </span>
          )}
          {folderHasMod && !isExpanded && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#e5c07b',
                marginLeft: 'auto',
                marginRight: '6px',
              }}
              title="Contains modified files"
            />
          )}

          {!item.is_dir && (
            <div className="tree-item-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`确定要删除 ${item.name} 吗？`)) {
                    onDeleteFile(item.path);
                  }
                }}
                className="vscode-header-action-btn"
                title="删除文件"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>

        {item.is_dir && isExpanded && (
          <div>
            {children.map((child) => renderTreeItem(child, depth + 1))}
            {children.length === 0 && (
              <div
                style={{
                  paddingLeft: `${paddingLeft + 24}px`,
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  paddingTop: '3px',
                  paddingBottom: '3px',
                }}
              >
                (空文件夹)
              </div>
            )}
          </div>
        )}
      </React.Fragment>
    );
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* 1. Leftmost VS Code Activity Bar */}
      <div className="flan-activity-bar">
        <div className="activity-top-group">
          <button
            className={`activity-btn ${activeView === 'explorer' && isOpen ? 'active' : ''}`}
            onClick={() => handleActivityClick('explorer')}
            title="资源管理器 (Explorer)"
          >
            <Files size={20} />
          </button>

          <button
            className={`activity-btn ${activeView === 'git' && isOpen ? 'active' : ''}`}
            onClick={() => handleActivityClick('git')}
            title="源代码管理 (Source Control)"
          >
            <GitPullRequest size={20} />
            {gitStatus && gitStatus.modified_count > 0 && (
              <span className="activity-badge">{gitStatus.modified_count}</span>
            )}
          </button>

          <button
            className={`activity-btn ${activeView === 'outline' && isOpen ? 'active' : ''}`}
            onClick={() => handleActivityClick('outline')}
            title="目录大纲 (Outline)"
          >
            <ListTree size={20} />
          </button>
        </div>

        <div className="activity-bottom-group">
          <button
            className="activity-btn"
            onClick={onOpenSettings}
            title="设置 (Settings)"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* 2. Primary VS Code Sidebar Panel */}
      <aside
        className={`flan-sidebar ${!isOpen ? 'collapsed' : ''}`}
        style={isOpen && width ? { width: `${width}px`, minWidth: `${width}px` } : undefined}
      >
        {/* VIEW 1: EXPLORER */}
        {activeView === 'explorer' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Header */}
            <div className="vscode-sidebar-header">
              <span className="vscode-sidebar-title">EXPLORER</span>
              <div className="vscode-sidebar-actions">
                <button
                  className="vscode-header-action-btn"
                  onClick={onSelectWorkspaceFolder}
                  title="切换/绑定工作区目录"
                >
                  <FolderOpen size={13} />
                </button>
                <button
                  className="vscode-header-action-btn"
                  onClick={handleRefresh}
                  title="刷新文件列表"
                >
                  <RotateCw size={12} />
                </button>
              </div>
            </div>

            {/* Accordion 1: OPEN EDITORS */}
            <div className="vscode-section">
              <div
                className="vscode-section-header"
                onClick={() => setIsOpenEditorsExpanded((prev) => !prev)}
              >
                <span className={`vscode-chevron ${isOpenEditorsExpanded ? 'expanded' : ''}`}>
                  <ChevronRight size={12} />
                </span>
                <span>OPEN EDITORS</span>
              </div>
              {isOpenEditorsExpanded && (
                <div className="vscode-section-content" style={{ maxHeight: '140px' }}>
                  {openFiles.map((f) => {
                    const isActive = f.path === currentFilePath;
                    return (
                      <div
                        key={f.path}
                        className={`vscode-open-editor-item ${isActive ? 'active' : ''}`}
                        onClick={() => onSelectFile({ name: f.name, path: f.path, is_dir: false })}
                        title={f.path}
                      >
                        <span className="tree-item-icon">
                          {renderFileIcon({ name: f.name, path: f.path, is_dir: false })}
                        </span>
                        <span
                          className="tree-item-label"
                          style={isFileModified(f.path) ? { color: '#e5c07b' } : undefined}
                        >
                          {f.name}
                        </span>
                        {isActive && isDirty && <span className="open-editor-dirty-dot" title="未保存更改" />}
                        <button
                          className="open-editor-close"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloseOpenFile(f.path);
                          }}
                          title="关闭"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                  {openFiles.length === 0 && (
                    <div style={{ padding: '6px 16px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      暂无打开的编辑器
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Accordion 2: WORKSPACE FOLDER TREE */}
            <div className="vscode-section expanded">
              <div
                className="vscode-section-header"
                style={{ justifyContent: 'space-between' }}
                onClick={() => setIsWorkspaceExpanded((prev) => !prev)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                  <span className={`vscode-chevron ${isWorkspaceExpanded ? 'expanded' : ''}`}>
                    <ChevronRight size={12} />
                  </span>
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {workspaceRootName.toUpperCase()}
                  </span>
                </div>
                <div className="vscode-sidebar-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="vscode-header-action-btn"
                    onClick={onNewFile}
                    title="新建文章/文件"
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    className="vscode-header-action-btn"
                    onClick={onSelectWorkspaceFolder}
                    title="切换/绑定工作区目录"
                  >
                    <FolderOpen size={13} />
                  </button>
                  <button
                    className="vscode-header-action-btn"
                    onClick={handleRefresh}
                    title="刷新文件树"
                  >
                    <RotateCw size={12} />
                  </button>
                  <button
                    className="vscode-header-action-btn"
                    onClick={handleCollapseAll}
                    title="折叠所有文件夹"
                  >
                    <Minus size={13} />
                  </button>
                </div>
              </div>

              {isWorkspaceExpanded && (
                <div className="vscode-section-content">
                  {/* Search filter input */}
                  <div style={{ padding: '4px 8px 6px 8px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'var(--bg-surface)',
                        borderRadius: '3px',
                        padding: '2px 6px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <Search size={11} style={{ color: 'var(--text-muted)', marginRight: '4px' }} />
                      <input
                        type="text"
                        placeholder="过滤文章或文件..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          fontSize: '11px',
                          color: 'var(--text-primary)',
                          width: '100%',
                        }}
                      />
                      {searchQuery && (
                        <X
                          size={11}
                          style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                          onClick={() => setSearchQuery('')}
                        />
                      )}
                    </div>
                  </div>

                  {/* File tree */}
                  {filteredFiles.map((file) => renderTreeItem(file, 0))}
                  {filteredFiles.length === 0 && (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                      {searchQuery ? '无匹配文件' : '工作区目录暂无文件'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Accordion 3: OUTLINE */}
            <div className="vscode-section">
              <div
                className="vscode-section-header"
                onClick={() => setIsOutlineExpanded((prev) => !prev)}
              >
                <span className={`vscode-chevron ${isOutlineExpanded ? 'expanded' : ''}`}>
                  <ChevronRight size={12} />
                </span>
                <span>OUTLINE</span>
                <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.6 }}>
                  {headings.length > 0 ? `${headings.length} 处` : ''}
                </span>
              </div>
              {isOutlineExpanded && (
                <div className="vscode-section-content" style={{ maxHeight: '180px' }}>
                  {headings.map((h, i) => (
                    <div
                      key={`${h.id}-${i}`}
                      className={`outline-item level-${h.level}`}
                      onClick={() => onScrollToHeading(h.id)}
                      style={{ paddingLeft: `${(h.level - 1) * 12 + 16}px`, fontSize: '12px' }}
                    >
                      <span style={{ opacity: 0.5, fontSize: '10px', marginRight: '4px' }}>H{h.level}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.text}
                      </span>
                    </div>
                  ))}
                  {headings.length === 0 && (
                    <div style={{ padding: '8px 16px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      当前文档暂无标题
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: SOURCE CONTROL */}
        {activeView === 'git' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="vscode-sidebar-header">
              <span className="vscode-sidebar-title">SOURCE CONTROL</span>
              <div className="vscode-sidebar-actions">
                <button
                  className="vscode-header-action-btn"
                  onClick={() => onGitSync(commitMsg)}
                  title="立即提交并推送"
                  disabled={isSyncingGit}
                >
                  <RotateCw size={13} />
                </button>
              </div>
            </div>

            <div style={{ padding: '10px 12px', flex: 1, overflowY: 'auto' }}>
              <div
                style={{
                  padding: '8px 10px',
                  background: 'var(--bg-surface)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '10px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {gitStatus?.branch ? ` ${gitStatus.branch}` : '未连接 Git 仓库'}
                  </span>
                  {gitStatus?.is_repo ? (
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                      <CheckCircle2 size={11} /> 关联就绪
                    </span>
                  ) : (
                    <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                      <AlertCircle size={11} /> 非 Git 目录
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                  待提交变更: <strong style={{ color: '#e5c07b' }}>{gitStatus?.modified_count || 0} 个文件</strong>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={autoGitPushOnSave}
                    onChange={onToggleAutoGitPush}
                  />
                  <span>保存 (Ctrl+S) 时自动推送 (Auto Push)</span>
                </label>
              </div>

              {gitStatus?.is_repo && (
                <div style={{ marginBottom: '14px' }}>
                  <textarea
                    className="form-input"
                    rows={3}
                    style={{
                      width: '100%',
                      fontSize: '12px',
                      padding: '6px 8px',
                      marginBottom: '8px',
                      resize: 'none',
                      fontFamily: 'inherit',
                    }}
                    placeholder="Message (输入提交信息，Ctrl+Enter 快速提交)"
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        onGitSync(commitMsg);
                      }
                    }}
                  />
                  <button
                    className="btn-primary"
                    style={{ width: '100%', padding: '6px 12px', fontSize: '12px', fontWeight: 600 }}
                    onClick={() => onGitSync(commitMsg)}
                    disabled={isSyncingGit}
                  >
                    {isSyncingGit ? '正在提交与推送...' : '✓ 提交并推送 (Commit & Push)'}
                  </button>
                </div>
              )}

              <div className="vscode-section" style={{ borderBottom: 'none' }}>
                <div className="vscode-section-header">
                  <ChevronDown size={12} />
                  <span>CHANGES</span>
                  <span className="activity-badge" style={{ position: 'static', marginLeft: 'auto', transform: 'none', height: '14px', minWidth: '14px', fontSize: '9px' }}>
                    {gitStatus?.modified_count || 0}
                  </span>
                </div>
                <div style={{ padding: '4px 0' }}>
                  {gitStatus?.modified_files && gitStatus.modified_files.length > 0 ? (
                    gitStatus.modified_files.map((file, i) => {
                      const statusChar = file.trim().charAt(0);
                      const fileName = file.replace(/^[MADRCU?\s]+/, '').trim();
                      return (
                        <div
                          key={i}
                          className="vscode-tree-item"
                          style={{ paddingLeft: '16px', fontSize: '12px' }}
                        >
                          <span className="tree-item-icon">
                            {renderFileIcon({ name: fileName, path: fileName, is_dir: false })}
                          </span>
                          <span className="tree-item-label" style={{ color: '#e5c07b' }}>
                            {fileName}
                          </span>
                          <span className="tree-item-git-badge modified">
                            {statusChar || 'M'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      工作树很干净，无待同步修改
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: OUTLINE */}
        {activeView === 'outline' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="vscode-sidebar-header">
              <span className="vscode-sidebar-title">OUTLINE</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {headings.length} 处标题
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
              {headings.map((h, i) => (
                <div
                  key={`${h.id}-${i}`}
                  className={`outline-item level-${h.level}`}
                  onClick={() => onScrollToHeading(h.id)}
                  style={{ paddingLeft: `${(h.level - 1) * 14 + 16}px`, fontSize: '12px' }}
                >
                  <span style={{ opacity: 0.5, fontSize: '11px', marginRight: '4px' }}>H{h.level}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.text}
                  </span>
                </div>
              ))}
              {headings.length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  暂未检测到标题，可在编辑区输入 # 标题 自动生成大纲
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
