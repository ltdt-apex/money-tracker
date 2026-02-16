import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchExpenses, fetchCategories, fetchTags, createExpense, updateExpense, deleteExpense, createTag, buildEmojiMap } from "./api";
import type { Categories, Expense, ExpenseCreate, Tag, TagCreate } from "./api";
import { Receipt, ChartPie } from "lucide-react";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseTimeline from "./components/ExpenseTimeline";
import ExpenseStats from "./components/ExpenseStats";

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
  const [tags, setTags] = useState<Tag[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState<"expenses" | "stats">("expenses");

  const emojiMap = useMemo(() => buildEmojiMap(categories), [categories]);

  useEffect(() => {
    fetchExpenses().then(setExpenses).catch(console.error);
    fetchCategories().then(setCategories).catch(console.error);
    fetchTags().then(setTags).catch(console.error);
  }, []);

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSubmit(data: ExpenseCreate) {
    if (editing) {
      const updated = await updateExpense(editing.id, data);
      setExpenses((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
          .sort((a, b) => b.date.localeCompare(a.date))
      );
    } else {
      const created = await createExpense(data);
      setExpenses((prev) =>
        [created, ...prev].sort((a, b) => b.date.localeCompare(a.date))
      );
    }
    closeForm();
  }

  async function handleCreateTag(data: TagCreate): Promise<Tag> {
    const tag = await createTag(data);
    setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
    return tag;
  }

  async function handleDelete(id: number) {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    closeForm();
  }

  const handleDateClick = useCallback((date: string) => {
    setActiveTab("expenses");
    requestAnimationFrame(() => {
      const group = document.querySelector(`.timeline-group[data-date="${date}"]`);
      if (!group) return;
      group.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstRow = group.querySelector(".timeline-row");
      if (firstRow) {
        firstRow.classList.add("timeline-row-highlight");
        setTimeout(() => firstRow.classList.remove("timeline-row-highlight"), 1500);
      }
    });
  }, []);

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
          <button className="new-expense-btn" onClick={openNew}>
            New expense
          </button>
        </div>

        <nav className="tab-bar">
          <button
            className={`tab${activeTab === "expenses" ? " tab-active" : ""}`}
            onClick={() => setActiveTab("expenses")}
          >
            <Receipt size={16} /> Expenses
          </button>
          <button
            className={`tab${activeTab === "stats" ? " tab-active" : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            <ChartPie size={16} /> Stats
          </button>
        </nav>

        {showForm && (
          <div className="modal-overlay" onClick={closeForm}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editing ? "Edit expense" : "New expense"}</h2>
                <button className="modal-close" onClick={closeForm}>
                  &times;
                </button>
              </div>
              <ExpenseForm
                key={editing?.id ?? "new"}
                categories={categories}
                tags={tags}
                editing={editing ?? undefined}
                onSubmit={handleSubmit}
                onDelete={handleDelete}
                onCreateTag={handleCreateTag}
              />
            </div>
          </div>
        )}

        {activeTab === "expenses" && (
          <ExpenseTimeline expenses={expenses} emojiMap={emojiMap} onEdit={openEdit} />
        )}

        {activeTab === "stats" && (
          <ExpenseStats expenses={expenses} categories={categories} onDateClick={handleDateClick} />
        )}
      </main>
    </div>
  );
}
