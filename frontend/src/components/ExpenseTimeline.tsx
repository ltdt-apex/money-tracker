import { Pencil } from "lucide-react";
import type { Expense } from "../api";

interface Props {
  expenses: Expense[];
  emojiMap: Record<string, string>;
  onEdit: (expense: Expense) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function ExpenseTimeline({ expenses, emojiMap, onEdit }: Props) {
  const grouped = new Map<string, Expense[]>();
  for (const exp of expenses) {
    const list = grouped.get(exp.date) ?? [];
    list.push(exp);
    grouped.set(exp.date, list);
  }

  if (expenses.length === 0) {
    return <p className="empty-state">No expenses yet. Add one above!</p>;
  }

  return (
    <div className="timeline">
      {[...grouped.entries()].map(([date, items]) => (
        <div key={date} className="timeline-group">
          <div className="timeline-date-bar">{formatDate(date)}</div>
          <div className="timeline-table">
            {items.map((exp) => (
              <div key={exp.id} className="timeline-row">
                <div className="expense-details">
                  <span className="expense-title">{exp.title}</span>
                  <span className="expense-category">
                    {emojiMap[exp.subcategory] ?? ""} {exp.subcategory}
                  </span>
                </div>
                <span className="expense-amount">{formatAmount(exp.amount)}</span>
                <button
                  className="edit-btn"
                  onClick={() => onEdit(exp)}
                  aria-label="Edit expense"
                >
                  <Pencil size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
