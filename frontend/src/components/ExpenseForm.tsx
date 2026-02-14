import { useState } from "react";
import type { ExpenseCreate } from "../api";

interface Props {
  categories: string[];
  onSubmit: (data: ExpenseCreate) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpenseForm({ categories, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Other");
  const [date, setDate] = useState(todayISO);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!title.trim() || isNaN(parsed) || parsed <= 0) return;
    onSubmit({ title: title.trim(), amount: parsed, category, date });
    setTitle("");
    setAmount("");
    setDate(todayISO());
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Expense title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        type="text"
        inputMode="decimal"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <button type="submit">New Expense</button>
    </form>
  );
}
