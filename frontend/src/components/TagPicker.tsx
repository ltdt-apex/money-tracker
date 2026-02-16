import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import type { Tag, TagCreate } from "../api";

const PALETTE = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6",
  "#3B82F6", "#6366F1", "#A855F7", "#EC4899", "#6B7280",
];

interface Props {
  tags: Tag[];
  selected: number[];
  onChange: (ids: number[]) => void;
  onCreateTag: (data: TagCreate) => Promise<Tag>;
}

export default function TagPicker({ tags, selected, onChange, onCreateTag }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openDropdown() {
    setOpen(true);
    setCreating(false);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
    setQuery("");
    inputRef.current?.focus();
  }

  function removeTag(id: number) {
    onChange(selected.filter((s) => s !== id));
  }

  async function handleCreate(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const tag = await onCreateTag({ name: trimmed, color: newColor });
    onChange([...selected, tag.id]);
    setQuery("");
    setNewColor(PALETTE[0]);
    setCreating(false);
    inputRef.current?.focus();
  }

  const selectedTags = tags.filter((t) => selected.includes(t.id));
  const q = query.toLowerCase();
  const filtered = tags.filter(
    (t) => !selected.includes(t.id) && t.name.toLowerCase().includes(q)
  );
  const exactMatch = tags.some((t) => t.name.toLowerCase() === q);

  return (
    <div className="tag-picker" ref={ref}>
      <div className="tag-picker-selected">
        {selectedTags.map((t) => (
          <span key={t.id} className="tag-pill" style={{ background: t.color }}>
            {t.name}
            <button
              type="button"
              className="tag-pill-remove"
              onClick={() => removeTag(t.id)}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <button
          type="button"
          className="tag-add-btn"
          onClick={() => (open ? setOpen(false) : openDropdown())}
        >
          <Plus size={14} />
        </button>
      </div>

      {open && (
        <div className="tag-picker-dropdown">
          <input
            ref={inputRef}
            type="text"
            className="tag-search-input"
            placeholder="Search or create tag..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCreating(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && creating && query.trim()) {
                e.preventDefault();
                handleCreate(query);
              } else if (e.key === "Enter" && filtered.length === 1) {
                e.preventDefault();
                toggle(filtered[0].id);
              }
            }}
          />

          {filtered.length > 0 && (
            <div className="tag-picker-list">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="tag-picker-option"
                  onClick={() => toggle(t.id)}
                >
                  <span className="tag-color-dot" style={{ background: t.color }} />
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {q && !exactMatch && !creating && (
            <button
              type="button"
              className="tag-create-btn"
              onClick={() => setCreating(true)}
            >
              <Plus size={12} /> Create "{query.trim()}"
            </button>
          )}

          {creating && (
            <div className="tag-create-row">
              <div className="tag-palette">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`tag-palette-swatch${c === newColor ? " tag-palette-swatch-active" : ""}`}
                    style={{ background: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="tag-create-confirm"
                onClick={() => handleCreate(query)}
                disabled={!query.trim()}
              >
                Add "{query.trim()}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
