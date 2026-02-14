import { useState } from "react";
import type { Categories, ExpenseCreate } from "../api";
import CategoryPicker from "./CategoryPicker";

interface Props {
  categories: Categories;
  onSubmit: (data: ExpenseCreate) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpenseForm({ categories, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [date, setDate] = useState(todayISO);

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
    setTitle("");
    setAmount("");
    setSubcategory("");
    setDate(todayISO());
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
        <button type="submit">Add expense</button>
      </div>
    </form>
  );
}
