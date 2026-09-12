import { Marked } from 'marked';
import katex from 'katex';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-go';
import { HeadingItem } from '../types';

let headingList: HeadingItem[] = [];

// Clean slug for heading IDs
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '') // remove html tags
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '') // keep alphanumeric, chinese, spaces, hyphens
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const customMarked = new Marked({
  gfm: true,
  breaks: true,
});

// Process LaTeX math formulas ($...$ and $$...$$) safely before or inside markdown
export const processMath = (content: string): string => {
  // 1. Process block math: $$...$$
  let processed = content.replace(/\$\$([\s\S]+?)\$\$/g, (_, equation) => {
    try {
      const rendered = katex.renderToString(equation.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return `<div class="math-block">${rendered}</div>`;
    } catch (e) {
      return `<pre class="math-error">Math Error: ${equation}</pre>`;
    }
  });

  // 2. Process inline math: $...$ (ensure not preceded or followed by another $)
  processed = processed.replace(/(?<!\$)\$([^\$\n]+?)\$(?!\$)/g, (_, equation) => {
    try {
      const rendered = katex.renderToString(equation.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return `<span class="math-inline">${rendered}</span>`;
    } catch (e) {
      return `<code class="math-error">$${equation}$</code>`;
    }
  });

  return processed;
};

// Process GitHub Callouts / Alerts (> [!NOTE], > [!TIP], etc.)
export const processCallouts = (html: string): string => {
  const calloutRegex = /<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br>|\n)?([\s\S]*?)<\/blockquote>/gi;

  return html.replace(calloutRegex, (_, type: string, content: string) => {
    const alertType = type.toUpperCase();
    const iconMap: Record<string, string> = {
      NOTE: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      TIP: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
      IMPORTANT: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      WARNING: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      CAUTION: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };

    const titleMap: Record<string, string> = {
      NOTE: 'Note',
      TIP: 'Tip',
      IMPORTANT: 'Important',
      WARNING: 'Warning',
      CAUTION: 'Caution',
    };

    return `
      <div class="callout callout-${alertType.toLowerCase()}">
        <div class="callout-header">
          ${iconMap[alertType] || ''}
          <span class="callout-title">${titleMap[alertType] || alertType}</span>
        </div>
        <div class="callout-body">
          <p>${content}
        </div>
      </div>
    `;
  });
};

// Custom renderer for Marked
customMarked.use({
  renderer: {
    heading({ text, depth }) {
      const id = slugify(text) || `heading-${headingList.length + 1}`;
      headingList.push({
        id,
        text: text.replace(/<[^>]*>/g, ''),
        level: depth,
      });
      return `<h${depth} id="${id}" class="article-heading heading-h${depth}">${text}<a href="#${id}" class="heading-anchor">#</a></h${depth}>`;
    },
    code({ text, lang }) {
      const language = (lang || '').toLowerCase().trim();

      // Mermaid diagrams
      if (language === 'mermaid') {
        return `<div class="mermaid-wrapper"><div class="mermaid">${text}</div></div>`;
      }

      // Syntax highlight with Prism
      let highlighted = text;
      if (language && Prism.languages[language]) {
        try {
          highlighted = Prism.highlight(text, Prism.languages[language], language);
        } catch (e) {
          console.warn('Prism highlight error:', e);
        }
      }

      const langLabel = language ? `<span class="code-lang-tag">${language}</span>` : '';
      return `
        <div class="code-block-container">
          <div class="code-header">
            ${langLabel}
            <button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block-container').querySelector('code').innerText);this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',1500)">Copy</button>
          </div>
          <pre class="language-${language || 'text'}"><code class="language-${language || 'text'}">${highlighted}</code></pre>
        </div>
      `;
    },
  },
});

export interface RenderResult {
  html: string;
  headings: HeadingItem[];
}

export const renderMarkdown = (markdownText: string): RenderResult => {
  headingList = [];

  // 1. Math formulas preprocessing
  const mathProcessed = processMath(markdownText);

  // 2. Parse Markdown to HTML
  let rawHtml = customMarked.parse(mathProcessed) as string;

  // 3. Process GitHub Callouts
  rawHtml = processCallouts(rawHtml);

  return {
    html: rawHtml,
    headings: [...headingList],
  };
};

export const calculateStats = (text: string) => {
  const clean = text.replace(/---[\s\S]*?---/, '').trim();
  const charCount = clean.length;
  // Count words: Chinese characters count as 1 word each, English words separated by space
  const cnChars = (clean.match(/[\u4e00-\u9fa5]/g) || []).length;
  const enWords = (clean.replace(/[\u4e00-\u9fa5]/g, ' ').match(/\b[A-Za-z0-9_-]+\b/g) || []).length;
  const wordCount = cnChars + enWords;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 300));

  return {
    charCount,
    wordCount,
    readingTimeMin,
  };
};
