import { useState } from "react";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import type { Categories, Tag, TagCreate, ProfileSettings, CustomSubcategory, CustomSubcategoryCreate } from "../api";

const TAG_COLORS = [
  "#4F46E5", "#7C3AED", "#DB2777", "#DC2626",
  "#EA580C", "#CA8A04", "#16A34A", "#0D9488",
  "#0284C7", "#6366F1", "#9333EA", "#64748B",
];

interface Props {
  categories: Categories;
  disabledSubcategories: string[];
  tags: Tag[];
  customSubcategories: CustomSubcategory[];
  onUpdateSettings: (settings: ProfileSettings) => Promise<void>;
  onUpdateTag: (id: number, data: TagCreate) => Promise<void>;
  onDeleteTag: (id: number) => Promise<void>;
  onCreateTag: (data: TagCreate) => Promise<Tag>;
  onCreateCustomSub: (data: CustomSubcategoryCreate) => Promise<void>;
  onDeleteCustomSub: (id: number) => Promise<void>;
}

export default function SettingsTab({
  categories,
  disabledSubcategories,
  tags,
  customSubcategories,
  onUpdateSettings,
  onUpdateTag,
  onDeleteTag,
  onCreateTag,
  onCreateCustomSub,
  onDeleteCustomSub,
}: Props) {
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // Add subcategory form state
  const [showAddSub, setShowAddSub] = useState(false);
  const [newSubCategory, setNewSubCategory] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubEmoji, setNewSubEmoji] = useState("📌");
  const [newSubCustomCat, setNewSubCustomCat] = useState("");

  // Add tag form state
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const disabled = new Set(disabledSubcategories);
  const customSubNames = new Set(customSubcategories.map((s) => s.subcategory));

  function isSubDisabled(sub: string) {
    return disabled.has(sub);
  }

  function allSubsDisabled(catName: string) {
    const subs = Object.keys(categories[catName].subcategories);
    return subs.every((s) => disabled.has(s));
  }

  function someSubsDisabled(catName: string) {
    const subs = Object.keys(categories[catName].subcategories);
    return subs.some((s) => disabled.has(s)) && !allSubsDisabled(catName);
  }

  async function toggleSub(sub: string) {
    const next = new Set(disabled);
    if (next.has(sub)) next.delete(sub);
    else next.add(sub);
    await onUpdateSettings({ disabled_subcategories: [...next] });
  }

  async function toggleCategory(catName: string) {
    const subs = Object.keys(categories[catName].subcategories);
    const allOff = allSubsDisabled(catName);
    const next = new Set(disabled);
    for (const s of subs) {
      if (allOff) next.delete(s);
      else next.add(s);
    }
    await onUpdateSettings({ disabled_subcategories: [...next] });
  }

  function startEdit(tag: Tag) {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  function cancelEdit() {
    setEditingTagId(null);
    setEditName("");
    setEditColor("");
  }

  async function saveEdit(id: number) {
    if (!editName.trim()) return;
    await onUpdateTag(id, { name: editName.trim(), color: editColor });
    setEditingTagId(null);
  }

  async function handleDeleteTag(id: number) {
    if (!window.confirm("Delete this tag? It will be removed from all transactions.")) return;
    await onDeleteTag(id);
  }

  async function handleDeleteCustomSub(id: number, subName: string) {
    if (!window.confirm(`Delete "${subName}"? Existing transactions will keep this subcategory but it won't appear in the picker.`)) return;
    await onDeleteCustomSub(id);
  }

  function getCustomSubId(subName: string): number | undefined {
    return customSubcategories.find((s) => s.subcategory === subName)?.id;
  }

  const categoryNames = Object.keys(categories);
  const effectiveCategory = newSubCategory === "__new__" ? newSubCustomCat : newSubCategory;

  async function handleAddSub() {
    const cat = effectiveCategory.trim();
    const name = newSubName.trim();
    if (!cat || !name) return;
    await onCreateCustomSub({ category: cat, subcategory: name, emoji: newSubEmoji || "📌" });
    setShowAddSub(false);
    setNewSubCategory("");
    setNewSubName("");
    setNewSubEmoji("📌");
    setNewSubCustomCat("");
  }

  async function handleAddTag() {
    const name = newTagName.trim();
    if (!name) return;
    await onCreateTag({ name, color: newTagColor });
    setShowAddTag(false);
    setNewTagName("");
    setNewTagColor(TAG_COLORS[0]);
  }

  return (
    <div className="settings-container">
      <div className="settings-section">
        <h3 className="settings-section-title">Categories</h3>
        <p className="settings-section-desc">
          Uncheck subcategories to hide them from the transaction form.
        </p>
        {Object.entries(categories).map(([catName, catData]) => (
          <div key={catName} className="settings-category-group">
            <label className="settings-category-header">
              <input
                type="checkbox"
                checked={!allSubsDisabled(catName)}
                ref={(el) => {
                  if (el) el.indeterminate = someSubsDisabled(catName);
                }}
                onChange={() => toggleCategory(catName)}
              />
              <span className="settings-category-emoji">{catData.emoji}</span>
              <span className="settings-category-name">{catName}</span>
            </label>
            <div className="settings-subcategory-list">
              {Object.entries(catData.subcategories).map(([subName, subEmoji]) => (
                <label key={subName} className="settings-subcategory-item">
                  <input
                    type="checkbox"
                    checked={!isSubDisabled(subName)}
                    onChange={() => toggleSub(subName)}
                  />
                  <span>{subEmoji} {subName}</span>
                  {customSubNames.has(subName) && (
                    <button
                      className="settings-custom-delete"
                      onClick={(e) => {
                        e.preventDefault();
                        const id = getCustomSubId(subName);
                        if (id !== undefined) handleDeleteCustomSub(id, subName);
                      }}
                      title="Delete custom subcategory"
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}

        {showAddSub ? (
          <div className="settings-add-form">
            <div className="settings-add-row">
              <select
                className="settings-add-select"
                value={newSubCategory}
                onChange={(e) => setNewSubCategory(e.target.value)}
              >
                <option value="">Select category...</option>
                {categoryNames.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__new__">+ New category...</option>
              </select>
              {newSubCategory === "__new__" && (
                <input
                  className="settings-add-input"
                  placeholder="New category name"
                  value={newSubCustomCat}
                  onChange={(e) => setNewSubCustomCat(e.target.value)}
                />
              )}
            </div>
            <div className="settings-add-row">
              <input
                className="settings-add-input settings-add-input-emoji"
                value={newSubEmoji}
                onChange={(e) => setNewSubEmoji(e.target.value)}
                maxLength={4}
                title="Emoji"
              />
              <input
                className="settings-add-input"
                placeholder="Subcategory name"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddSub(); }}
                autoFocus
              />
            </div>
            <div className="settings-add-actions">
              <button
                className="settings-add-confirm"
                onClick={handleAddSub}
                disabled={!effectiveCategory.trim() || !newSubName.trim()}
              >
                <Check size={14} /> Add
              </button>
              <button className="settings-add-cancel" onClick={() => setShowAddSub(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="settings-add-btn" onClick={() => setShowAddSub(true)}>
            <Plus size={14} /> Add subcategory
          </button>
        )}
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Tags</h3>
        {tags.length === 0 && !showAddTag ? (
          <p className="settings-section-desc">No tags yet.</p>
        ) : (
          <div className="settings-tag-list">
            {tags.map((tag) => (
              <div key={tag.id} className="settings-tag-row">
                {editingTagId === tag.id ? (
                  <div className="settings-tag-edit">
                    <input
                      className="settings-tag-edit-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(tag.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                    />
                    <div className="tag-palette">
                      {TAG_COLORS.map((c) => (
                        <button
                          key={c}
                          className={`tag-palette-swatch${editColor === c ? " tag-palette-swatch-active" : ""}`}
                          style={{ background: c }}
                          onClick={() => setEditColor(c)}
                          type="button"
                        />
                      ))}
                    </div>
                    <div className="settings-tag-edit-actions">
                      <button className="settings-tag-save" onClick={() => saveEdit(tag.id)} title="Save">
                        <Check size={14} />
                      </button>
                      <button className="settings-tag-cancel" onClick={cancelEdit} title="Cancel">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="tag-color-dot" style={{ background: tag.color }} />
                    <span className="settings-tag-name">{tag.name}</span>
                    <div className="settings-tag-actions">
                      <button className="settings-tag-btn" onClick={() => startEdit(tag)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button
                        className="settings-tag-btn settings-tag-btn-danger"
                        onClick={() => handleDeleteTag(tag.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {showAddTag ? (
          <div className="settings-add-form">
            <input
              className="settings-add-input"
              placeholder="Tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddTag(); }}
              autoFocus
            />
            <div className="tag-palette">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  className={`tag-palette-swatch${newTagColor === c ? " tag-palette-swatch-active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setNewTagColor(c)}
                  type="button"
                />
              ))}
            </div>
            <div className="settings-add-actions">
              <button
                className="settings-add-confirm"
                onClick={handleAddTag}
                disabled={!newTagName.trim()}
              >
                <Check size={14} /> Add
              </button>
              <button className="settings-add-cancel" onClick={() => setShowAddTag(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="settings-add-btn" onClick={() => setShowAddTag(true)}>
            <Plus size={14} /> New tag
          </button>
        )}
      </div>
    </div>
  );
}
