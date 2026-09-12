export type EditorMode = 'split' | 'live' | 'editor' | 'reader';
export type ThemeMode = 'dark' | 'light' | 'sepia';

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  extension?: string;
  children?: FileEntry[];
}

export interface GitStatus {
  is_repo: boolean;
  branch: string;
  modified_count: number;
  modified_files: string[];
}

export interface FrontmatterData {
  title?: string;
  date?: string;
  tags?: string[];
  categories?: string | string[];
  draft?: boolean;
  [key: string]: any;
}

export interface FrontmatterTemplateRule {
  autoDate: boolean;
  dateFormat: string;
  defaultDraft: boolean;
  defaultTags: string[];
  defaultCategory: string;
  customFields: { key: string; value: string }[];
}

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export interface AppSettings {
  theme: ThemeMode;
  editorMode: EditorMode;
  workspacePath: string;
  autoSave: boolean;
  autoGitPushOnSave: boolean;
  gitCommitTemplate: string;
  frontmatterRules: FrontmatterTemplateRule;
  fontSize: number;
}
