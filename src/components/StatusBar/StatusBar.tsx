import React from 'react';
import { GitBranch, Clock, AlignLeft, Hash } from 'lucide-react';
import { GitStatus } from '../../types';

interface StatusBarProps {
  currentFileName: string;
  isDirty: boolean;
  line: number;
  col: number;
  charCount: number;
  wordCount: number;
  readingTimeMin: number;
  gitStatus: GitStatus | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentFileName,
  isDirty,
  line,
  col,
  charCount,
  wordCount,
  readingTimeMin,
  gitStatus,
}) => {
  return (
    <footer className="flan-statusbar">
      {/* Left items: File name & Dirty indicator */}
      <div className="status-group">
        <div className="status-item">
          <span className={`status-dot ${isDirty ? 'dirty' : ''}`} />
          <span>{currentFileName || '未命名文件'}</span>
          <span>{isDirty ? '(未保存)' : '(已保存)'}</span>
        </div>

        {gitStatus?.is_repo && (
          <div className="status-item" title="当前 Git 分支">
            <GitBranch size={12} />
            <span>{gitStatus.branch}</span>
            {gitStatus.modified_count > 0 && (
              <span style={{ color: '#f59e0b' }}>({gitStatus.modified_count} 更改)</span>
            )}
          </div>
        )}
      </div>

      {/* Right items: Stats & Cursor */}
      <div className="status-group">
        <div className="status-item" title="光标位置">
          <span>
            第 {line} 行, 第 {col} 列
          </span>
        </div>

        <div className="status-item" title="词数统计 (汉字+英文词)">
          <AlignLeft size={12} />
          <span>{wordCount} 词</span>
        </div>

        <div className="status-item" title="总字符数">
          <Hash size={12} />
          <span>{charCount} 字符</span>
        </div>

        <div className="status-item" title="预计阅读时长">
          <Clock size={12} />
          <span>约 {readingTimeMin} 分钟</span>
        </div>

        <div className="status-item">
          <span>UTF-8</span>
        </div>
      </div>
    </footer>
  );
};
