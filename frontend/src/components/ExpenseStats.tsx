import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Categories, Expense } from "../api";
import SpendCalendar from "./SpendCalendar";

const COLORS = [
  "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

interface Props {
  expenses: Expense[];
  categories: Categories;
  onDateClick?: (date: string) => void;
}

interface CategoryBreakdown {
  name: string;
  emoji: string;
  amount: number;
  count: number;
  percentage: number;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const data = entry.payload as CategoryBreakdown & { fill: string };
  const color = data.fill;
  return (
    <div className="pie-tooltip">
      <div className="pie-tooltip-title">
        <span className="pie-tooltip-dot" style={{ background: color }} />
        {data.emoji} {data.name}
      </div>
      <div className="pie-tooltip-line">
        Total: {formatCurrency(data.amount)} ({data.percentage.toFixed(1)}%)
      </div>
      <div className="pie-tooltip-line">
        {data.count} expense{data.count !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

export default function ExpenseStats({ expenses, categories, onDateClick }: Props) {
  const { breakdown, total } = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    let total = 0;

    for (const e of expenses) {
      total += e.amount;
      const existing = map.get(e.category);
      if (existing) {
        existing.amount += e.amount;
        existing.count++;
      } else {
        map.set(e.category, { amount: e.amount, count: 1 });
      }
    }

    const breakdown: CategoryBreakdown[] = Array.from(map.entries())
      .map(([name, { amount, count }]) => ({
        name,
        emoji: categories[name]?.emoji ?? "",
        amount,
        count,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { breakdown, total };
  }, [expenses, categories]);

  if (expenses.length === 0) {
    return (
      <div className="stats-container">
        <p className="empty-state">No expenses to analyze yet.</p>
      </div>
    );
  }

  return (
    <div className="stats-container">
      <div className="stats-total">
        <span className="stats-total-label">Total Spent</span>
        <span className="stats-total-amount">{formatCurrency(total)}</span>
      </div>

      <div className="stats-chart-row">
        <div className="stats-chart">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={breakdown}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                strokeWidth={0}
              >
                {breakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="breakdown-list">
          {breakdown.map((cat, i) => (
            <div key={cat.name} className="breakdown-row">
              <span
                className="breakdown-dot"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="breakdown-name">
                {cat.emoji} {cat.name}
              </span>
              <span className="breakdown-count">{cat.count} txn{cat.count !== 1 ? "s" : ""}</span>
              <span className="breakdown-amount">{formatCurrency(cat.amount)}</span>
              <span className="breakdown-pct">{cat.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <SpendCalendar expenses={expenses} categories={categories} onDateClick={onDateClick} />
    </div>
  );
}
