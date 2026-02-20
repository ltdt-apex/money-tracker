import { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import type { Categories, Expense, ExpenseCreate, Tag, TagCreate } from "../api";
import CategoryPicker from "./CategoryPicker";
import TagPicker from "./TagPicker";

interface Props {
  categories: Categories;
  tags: Tag[];
  editing?: Expense;
  onSubmit: (data: ExpenseCreate) => void;
  onDelete?: (id: number) => void;
  onCreateTag: (data: TagCreate) => Promise<Tag>;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpenseForm({ categories, tags, editing, onSubmit, onDelete, onCreateTag }: Props) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [subcategory, setSubcategory] = useState(editing?.subcategory ?? "");
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [note, setNote] = useState(editing?.note ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    editing?.tags.map((t) => t.id) ?? []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!title.trim() || isNaN(parsed) || parsed <= 0) return;
    onSubmit({
      title: title.trim(),
      amount: parsed,
      subcategory: subcategory || "Uncategorized",
      date,
      tag_ids: selectedTagIds,
      note: note.trim(),
    });
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-field form-field-grow">
          <label className="form-label">Description</label>
          <input
            type="text"
            placeholder="What did you spend on?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-field form-field-amount">
          <label className="form-label">Amount</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label className="form-label">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="form-field form-field-grow">
          <label className="form-label">Category</label>
          <CategoryPicker
            categories={categories}
            value={subcategory}
            onChange={setSubcategory}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-field form-field-grow">
          <label className="form-label">Note</label>
          <TextareaAutosize
            className="note-textarea"
            placeholder="Optional note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            minRows={1}
            maxRows={4}
          />
        </div>
      </div>
      <div className="form-field">
        <label className="form-label">Tags</label>
        <TagPicker
          tags={tags}
          selected={selectedTagIds}
          onChange={setSelectedTagIds}
          onCreateTag={onCreateTag}
        />
      </div>
      <div className="form-actions">
        {editing && onDelete && (
          <button type="button" className="form-delete-btn" onClick={() => onDelete(editing.id)}>
            Delete
          </button>
        )}
        <button type="submit">{editing ? "Save changes" : "Add transaction"}</button>
      </div>
    </form>
  );
}
