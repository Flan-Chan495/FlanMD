import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { AppSettings, FrontmatterTemplateRule } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [tagsInput, setTagsInput] = useState(
    (settings.frontmatterRules.defaultTags || []).join(', ')
  );

  if (!isOpen) return null;

  const handleRulesChange = (partial: Partial<FrontmatterTemplateRule>) => {
    setLocalSettings((prev) => ({
      ...prev,
      frontmatterRules: {
        ...prev.frontmatterRules,
        ...partial,
      },
    }));
  };

  const handleAddCustomField = () => {
    const list = [...localSettings.frontmatterRules.customFields, { key: '', value: '' }];
    handleRulesChange({ customFields: list });
  };

  const handleRemoveCustomField = (index: number) => {
    const list = localSettings.frontmatterRules.customFields.filter((_, i) => i !== index);
    handleRulesChange({ customFields: list });
  };

  const handleCustomFieldChange = (index: number, key: string, value: string) => {
    const list = [...localSettings.frontmatterRules.customFields];
    list[index] = { key, value };
    handleRulesChange({ customFields: list });
  };

  const handleSave = () => {
    const tags = tagsInput
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const updated: AppSettings = {
      ...localSettings,
      frontmatterRules: {
        ...localSettings.frontmatterRules,
        defaultTags: tags,
      },
    };
    onSaveSettings(updated);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">⚙️ 设置与文章模板配置</span>
          <button className="toolbar-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Section 1: Frontmatter Rules */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.85rem' }}>
              📝 新建文章 Frontmatter 属性规则
            </h4>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="autoDate"
                checked={localSettings.frontmatterRules.autoDate}
                onChange={(e) => handleRulesChange({ autoDate: e.target.checked })}
              />
              <label htmlFor="autoDate" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>
                自动填充当前时间戳 (YYYY-MM-DD HH:mm:ss)
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">默认分类 (Category)</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如: 技术随笔"
                value={localSettings.frontmatterRules.defaultCategory}
                onChange={(e) => handleRulesChange({ defaultCategory: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">默认标签 (Tags，逗号分隔)</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如: Markdown, 博客, 记录"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="defaultDraft"
                checked={localSettings.frontmatterRules.defaultDraft}
                onChange={(e) => handleRulesChange({ defaultDraft: e.target.checked })}
              />
              <label htmlFor="defaultDraft" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>
                新建文章默认为草稿 (draft: true)
              </label>
            </div>

            {/* Custom Frontmatter Key-Values */}
            <div style={{ marginTop: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <span className="form-label" style={{ marginBottom: 0 }}>自定义 Frontmatter 字段</span>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={handleAddCustomField}
                  style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={12} /> 添加字段
                </button>
              </div>

              {localSettings.frontmatterRules.customFields.map((field, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  <input
                    type="text"
                    placeholder="键 (如 author)"
                    className="form-input"
                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem' }}
                    value={field.key}
                    onChange={(e) =>
                      handleCustomFieldChange(idx, e.target.value, field.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="默认值"
                    className="form-input"
                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem' }}
                    value={field.value}
                    onChange={(e) =>
                      handleCustomFieldChange(idx, field.key, e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => handleRemoveCustomField(idx)}
                    style={{ padding: '4px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '1.25rem 0' }} />

          {/* Section 2: Git Auto Push settings */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.85rem' }}>
              🔄 Git 自动化同步配置
            </h4>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="autoPush"
                checked={localSettings.autoGitPushOnSave}
                onChange={(e) =>
                  setLocalSettings((prev) => ({ ...prev, autoGitPushOnSave: e.target.checked }))
                }
              />
              <label htmlFor="autoPush" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>
                保存文章 (Ctrl+S) 时自动执行 Git Commit 并推送 (Push) 到远程 GitHub
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Git 默认 Commit 提交模版</label>
              <input
                type="text"
                className="form-input"
                value={localSettings.gitCommitTemplate}
                onChange={(e) =>
                  setLocalSettings((prev) => ({ ...prev, gitCommitTemplate: e.target.value }))
                }
                placeholder="例如: blog: update article"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={handleSave}>
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};
