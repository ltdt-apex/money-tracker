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
      <CategoryPicker
        categories={categories}
        value={subcategory}
        onChange={setSubcategory}
      />
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
