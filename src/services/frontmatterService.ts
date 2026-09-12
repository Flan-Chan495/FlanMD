import yaml from 'js-yaml';
import { FrontmatterData, FrontmatterTemplateRule } from '../types';

export interface ParsedDocument {
  frontmatter: FrontmatterData | null;
  rawFrontmatter: string;
  body: string;
}

export const parseFrontmatter = (content: string): ParsedDocument => {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: null,
      rawFrontmatter: '',
      body: content,
    };
  }

  const rawYaml = match[1];
  const body = content.slice(match[0].length);

  try {
    const parsed = yaml.load(rawYaml) as FrontmatterData;
    return {
      frontmatter: typeof parsed === 'object' && parsed !== null ? parsed : {},
      rawFrontmatter: rawYaml,
      body,
    };
  } catch (e) {
    console.warn('Failed to parse YAML frontmatter:', e);
    return {
      frontmatter: null,
      rawFrontmatter: rawYaml,
      body,
    };
  }
};

export const formatCurrentDate = (): string => {
  const now = new Date();
  const Y = now.getFullYear();
  const M = String(now.getMonth() + 1).padStart(2, '0');
  const D = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
};

export const generateFrontmatterTemplate = (
  title: string,
  rules: FrontmatterTemplateRule
): string => {
  const data: Record<string, any> = {
    title: title || '未命名文章',
  };

  if (rules.autoDate) {
    data.date = formatCurrentDate();
  }

  if (rules.defaultTags && rules.defaultTags.length > 0) {
    data.tags = rules.defaultTags;
  } else {
    data.tags = ['Blog'];
  }

  if (rules.defaultCategory) {
    data.categories = rules.defaultCategory;
  }

  if (rules.defaultDraft !== undefined) {
    data.draft = rules.defaultDraft;
  }

  if (rules.customFields && rules.customFields.length > 0) {
    for (const item of rules.customFields) {
      if (item.key.trim()) {
        data[item.key.trim()] = item.value;
      }
    }
  }

  const yamlStr = yaml.dump(data, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
  });

  return `---\n${yamlStr}---\n\n# ${title}\n\n开始撰写您的文章...\n`;
};
