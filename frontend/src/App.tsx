import { useEffect, useMemo, useState } from "react";
import { fetchExpenses, fetchCategories, createExpense, deleteExpense, buildEmojiMap } from "./api";
import type { Categories, Expense, ExpenseCreate } from "./api";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseTimeline from "./components/ExpenseTimeline";

function formatTotal(expenses: Expense[]): string {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(total);
}

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Categories>({});
  const [showForm, setShowForm] = useState(false);

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
    setShowForm(false);
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
        <div className="group-header">
          <div className="group-info">
            <div className="group-icon">$</div>
            <div className="group-text">
              <h2 className="group-title">My Expenses</h2>
              <span className="group-total">Total spent: {formatTotal(expenses)}</span>
            </div>
          </div>
          <button className="new-expense-btn" onClick={() => setShowForm(true)}>
            New expense
          </button>
        </div>

        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>New expense</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}>
                  &times;
                </button>
              </div>
              <ExpenseForm categories={categories} onSubmit={handleAdd} />
            </div>
          </div>
        )}

        <ExpenseTimeline expenses={expenses} emojiMap={emojiMap} onDelete={handleDelete} />
      </main>
    </div>
  );
}
