import React, { useState } from 'react';
import {
  FolderOpen,
  FileText,
  ListTree,
  GitPullRequest,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { FileEntry, GitStatus, HeadingItem } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  workspacePath: string;
  files: FileEntry[];
  currentFilePath: string;
  onSelectFile: (file: FileEntry) => void;
  onNewFile: () => void;
  onDeleteFile: (path: string) => void;
  onSelectWorkspaceFolder: () => void;
  headings: HeadingItem[];
  onScrollToHeading: (id: string) => void;
  gitStatus: GitStatus | null;
  isSyncingGit: boolean;
  onGitSync: (customMsg?: string) => void;
  autoGitPushOnSave: boolean;
  onToggleAutoGitPush: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  workspacePath,
  files,
  currentFilePath,
  onSelectFile,
  onNewFile,
  onDeleteFile,
  onSelectWorkspaceFolder,
  headings,
  onScrollToHeading,
  gitStatus,
  isSyncingGit,
  onGitSync,
  autoGitPushOnSave,
  onToggleAutoGitPush,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'outline' | 'git'>('files');
  const [searchQuery, setSearchQuery] = useState('');
  const [commitMsg, setCommitMsg] = useState('');

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className={`flan-sidebar ${!isOpen ? 'collapsed' : ''}`}>
      {/* Top tab navigation */}
      <div className="sidebar-tab-nav">
        <button
          className={`sidebar-nav-tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <FileText size={14} />
          <span>博客文章</span>
        </button>
        <button
          className={`sidebar-nav-tab ${activeTab === 'outline' ? 'active' : ''}`}
          onClick={() => setActiveTab('outline')}
        >
          <ListTree size={14} />
          <span>目录大纲</span>
        </button>
        <button
          className={`sidebar-nav-tab ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => setActiveTab('git')}
        >
          <GitPullRequest size={14} />
          <span>Git 同步</span>
        </button>
      </div>

      {/* Pane 1: File Explorer */}
      {activeTab === 'files' && (
        <div className="sidebar-content-pane">
          {/* Workspace Path Header */}
          <div
            style={{
              padding: '6px 8px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '180px',
              }}
              title={workspacePath || '未绑定工作区目录'}
            >
              {workspacePath ? `📁 ${workspacePath.split(/[\/\\]/).pop() || workspacePath}` : '未绑定博客目录'}
            </div>
            <button
              onClick={onSelectWorkspaceFolder}
              className="toolbar-btn"
              style={{ padding: '2px 6px', fontSize: '0.75rem' }}
              title="切换/绑定本地博客仓库目录"
            >
              <FolderOpen size={13} />
            </button>
          </div>

          {/* Search bar & New article button */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Search size={12} style={{ color: 'var(--text-muted)', marginRight: '4px' }} />
              <input
                type="text"
                placeholder="搜索文章..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  width: '100%',
                }}
              />
            </div>
            <button
              onClick={onNewFile}
              className="toolbar-btn"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              title="新建文章"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* File list */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredFiles.map((file) => {
              const isSelected = file.path === currentFilePath;
              return (
                <div
                  key={file.path}
                  className={`file-tree-item ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectFile(file)}
                >
                  <FileText size={14} style={{ flexShrink: 0 }} />
                  <span className="file-tree-name">{file.name}</span>
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`确定要删除 ${file.name} 吗？`)) {
                          onDeleteFile(file.path);
                        }
                      }}
                      className="toolbar-btn"
                      style={{ padding: '2px', opacity: 0.7 }}
                      title="删除文章"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
            {filteredFiles.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                暂无匹配文章
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pane 2: Outline TOC */}
      {activeTab === 'outline' && (
        <div className="sidebar-content-pane">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', padding: '0 4px' }}>
            当前文章目录 ({headings.length} 处标题)
          </div>
          {headings.map((h, i) => (
            <div
              key={`${h.id}-${i}`}
              className={`outline-item level-${h.level}`}
              onClick={() => onScrollToHeading(h.id)}
            >
              <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>H{h.level}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h.text}
              </span>
            </div>
          ))}
          {headings.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              暂未检测到标题，可在编辑区输入 # 标题 自动生成大纲
            </div>
          )}
        </div>
      )}

      {/* Pane 3: Git Control Center */}
      {activeTab === 'git' && (
        <div className="sidebar-content-pane">
          <div
            style={{
              padding: '10px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Git 状态</span>
              {gitStatus?.is_repo ? (
                <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> 已关联仓库
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> 非 Git 目录
                </span>
              )}
            </div>

            {gitStatus?.is_repo && (
              <>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  当前分支: <strong>{gitStatus.branch}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  待同步变更: <strong>{gitStatus.modified_count} 项</strong>
                </div>

                {/* Auto Push Toggle */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={autoGitPushOnSave}
                    onChange={onToggleAutoGitPush}
                  />
                  <span>保存 (Ctrl+S) 时自动 Push</span>
                </label>
              </>
            )}
          </div>

          {gitStatus?.is_repo && (
            <div>
              <div className="form-label" style={{ fontSize: '0.8rem' }}>提交说明 (Commit Message)</div>
              <input
                type="text"
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '6px 8px', marginBottom: '8px' }}
                placeholder="例如: blog: 更新新博文"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
              />
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '8px', fontSize: '0.82rem' }}
                onClick={() => onGitSync(commitMsg)}
                disabled={isSyncingGit}
              >
                {isSyncingGit ? '正在提交与推送...' : '一键提交并推送 (Commit & Push)'}
              </button>

              {gitStatus.modified_files.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    文件变动清单:
                  </div>
                  {gitStatus.modified_files.map((file, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)',
                        padding: '2px 0',
                      }}
                    >
                      {file}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
