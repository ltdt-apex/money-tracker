import { useEffect, useState } from "react";
import { fetchExpenses, fetchCategories, createExpense, deleteExpense } from "./api";
import type { Expense, ExpenseCreate } from "./api";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseTimeline from "./components/ExpenseTimeline";

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

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
        <ExpenseTimeline expenses={expenses} onDelete={handleDelete} />
      </main>
    </div>
  );
}
