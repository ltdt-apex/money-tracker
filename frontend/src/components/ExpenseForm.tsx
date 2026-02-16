import { useState } from "react";
import type { Categories, Expense, ExpenseCreate } from "../api";
import CategoryPicker from "./CategoryPicker";

interface Props {
  categories: Categories;
  editing?: Expense;
  onSubmit: (data: ExpenseCreate) => void;
  onDelete?: (id: number) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpenseForm({ categories, editing, onSubmit, onDelete }: Props) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [subcategory, setSubcategory] = useState(editing?.subcategory ?? "");
  const [date, setDate] = useState(editing?.date ?? todayISO());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!title.trim() || isNaN(parsed) || parsed <= 0) return;
    onSubmit({
      title: title.trim(),
      amount: parsed,
      subcategory: subcategory || "Uncategorized",
      date,
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
      <div className="form-actions">
        {editing && onDelete && (
          <button type="button" className="form-delete-btn" onClick={() => onDelete(editing.id)}>
            Delete
          </button>
        )}
        <button type="submit">{editing ? "Save changes" : "Add expense"}</button>
      </div>
    </form>
  );
}
