import { useEffect, useMemo, useState } from "react";
import { fetchExpenses, fetchCategories, createExpense, deleteExpense, buildEmojiMap } from "./api";
import type { Categories, Expense, ExpenseCreate } from "./api";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseTimeline from "./components/ExpenseTimeline";

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Categories>({});

  const emojiMap = useMemo(() => buildEmojiMap(categories), [categories]);

  useEffect(() => {
    fetchExpenses().then(setExpenses).catch(console.error);
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  async function handleAdd(data: ExpenseCreate) {
    const created = await createExpense(data);
    setExpenses((prev) =>
      [created, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    );
  }

  async function handleDelete(id: number) {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Money Tracker</h1>
      </header>
      <main className="container">
        <ExpenseForm categories={categories} onSubmit={handleAdd} />
        <ExpenseTimeline expenses={expenses} emojiMap={emojiMap} onDelete={handleDelete} />
      </main>
    </div>
  );
}
