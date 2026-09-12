import { FileEntry, GitStatus } from '../types';

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Mock files for browser development mode
const MOCK_STORAGE_KEY = 'flanmd_mock_files_v1';

const getMockFiles = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  const initialArticles: Record<string, string> = {
    '/blog/_posts/2026-09-12-welcome-to-flanmd.md': `---
title: 欢迎使用 FlanMD 博客写作工作台
date: 2026-09-12 23:30:00
tags: [FlanMD, Markdown, 博客写作]
categories: 推荐工具
draft: false
---

# 欢迎使用 FlanMD 🍧

**FlanMD** 是一款专为**独立博主与内容创作者**打造的轻量级、高颜值桌面 Markdown 编辑器。

---

## 核心功能演示

### 1. 任务清单 (Task Lists)
- [x] 基于 Tauri 2.0 构建超轻桌面端
- [x] 多重视角随意切换（双栏对照 / 实时预览 / 纯净编辑 / 沉浸阅读）
- [x] 智能 Frontmatter 文章模板生成
- [x] 自动 Git 提交与推送
- [ ] 更多个性化主题与导出 PDF

### 2. 代码高亮 (Syntax Highlighting)
\`\`\`rust
fn main() {
    println!("Hello, FlanMD! Blazingly fast desktop app powered by Rust & React.");
}
\`\`\`

### 3. 数学公式 (KaTeX Math)
支持行内公式，例如爱因斯坦质能方程：$E = mc^2$，以及欧拉公式：$e^{i\\pi} + 1 = 0$。

同时也支持块级矩阵公式：
$$
\\begin{pmatrix}
\\cos\\theta & -\\sin\\theta \\\\
\\sin\\theta & \\cos\\theta
\\end{pmatrix}
$$

### 4. 流程图表 (Mermaid Diagrams)
\`\`\`mermaid
graph TD
    A[撰写博客 Markdown] --> B{选择发布模式}
    B -->|快捷键 Ctrl+S| C[自动更新本地文件]
    C --> D[触发自动 Git Commit]
    D --> E[推送到 GitHub Pages / Vercel]
    E --> F((博文上线 ✨))
\`\`\`

### 5. GitHub 风格 Callout 警告块
> [!NOTE]
> 这是一条重要说明：您可以点击工具栏的模式切换按钮，在双栏分栏与所见即所得之间自由切换！

> [!TIP]
> 左侧栏支持绑定您的本地 Hexo / Hugo / Astro 博客仓库目录，保存即自动 Push！

祝您写作愉快！
`,
    '/blog/_posts/2026-09-10-markdown-guide.md': `---
title: Markdown 进阶语法速查表
date: 2026-09-10 12:00:00
tags: [Markdown, 教程]
categories: 指南
draft: false
---

# Markdown 进阶语法速查

本篇介绍常用排版技巧。

## 常用表格
| 语法特性 | 支持程度 | 渲染引擎 |
| :--- | :---: | ---: |
| GFM 表格 | 完美 | Marked |
| 数学公式 | 完美 | KaTeX |
| Mermaid 流程图 | 完美 | Mermaid.js |
| 警告提示框 | 完美 | Flan Callouts |

## 引用与强调
> 优秀的文章离不开专注沉浸的写作体验与清晰的版式设计。

*斜体强调*、**加粗强调**、~~删除线效果~~、\`行内代码\`。
`
  };
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initialArticles));
  return initialArticles;
};

export const listWorkspaceFiles = async (dirPath: string): Promise<FileEntry[]> => {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<FileEntry[]>('list_files_in_dir', { dirPath });
  }

  // Browser fallback
  const mock = getMockFiles();
  const entries: FileEntry[] = Object.keys(mock).map((path) => {
    const name = path.split('/').pop() || path;
    return {
      name,
      path,
      is_dir: false,
      extension: 'md',
    };
  });
  return entries;
};

export const readTextFile = async (filePath: string): Promise<string> => {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string>('read_text_file', { filePath });
  }

  const mock = getMockFiles();
  if (mock[filePath] !== undefined) {
    return mock[filePath];
  }
  return '# Untitled\n';
};

export const saveTextFile = async (filePath: string, content: string): Promise<void> => {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('save_text_file', { filePath, content });
    return;
  }

  const mock = getMockFiles();
  mock[filePath] = content;
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mock));
};

export const deleteFile = async (filePath: string): Promise<void> => {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('delete_file', { filePath });
    return;
  }

  const mock = getMockFiles();
  delete mock[filePath];
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mock));
};

export const getGitStatus = async (dirPath: string): Promise<GitStatus> => {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<GitStatus>('git_get_status', { dirPath });
  }

  // Browser mock
  return {
    is_repo: true,
    branch: 'main',
    modified_count: 1,
    modified_files: ['M 2026-09-12-welcome-to-flanmd.md'],
  };
};

export const gitCommitAndPush = async (
  dirPath: string,
  commitMsg: string
): Promise<{ success: boolean; message: string }> => {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<{ success: boolean; message: string }>('git_commit_and_push', {
      dirPath,
      commitMsg,
    });
  }

  // Browser mock
  await new Promise((r) => setTimeout(r, 600));
  return {
    success: true,
    message: `[Simulated] Git commit & push succeeded!\nBranch: main\nMessage: ${commitMsg}`,
  };
};

export const listFiles = listWorkspaceFiles;
export const readFile = readTextFile;
export const saveFile = saveTextFile;
export const gitSync = gitCommitAndPush;

