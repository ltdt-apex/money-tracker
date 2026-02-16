import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Categories, Expense } from "../api";
import SpendCalendar from "./SpendCalendar";

const COLORS = [
  "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

type DateRange = "all" | "month" | "3m" | "6m" | "12m";

const RANGE_LABELS: Record<DateRange, string> = {
  month: "This Month",
  "3m": "Last 3 Months",
  "6m": "Last 6 Months",
  "12m": "Last 12 Months",
  all: "All Time",
};

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

interface TagBreakdown {
  name: string;
  color: string;
  amount: number;
  count: number;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function getRangeCutoff(range: DateRange): string | null {
  if (range === "all") return null;
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth(); // 0-indexed

  if (range === "month") {
    // Start of current month
  } else if (range === "3m") {
    m -= 2;
  } else if (range === "6m") {
    m -= 5;
  } else if (range === "12m") {
    m -= 11;
  }

  // Normalize
  while (m < 0) { m += 12; y--; }

  return `${y}-${String(m + 1).padStart(2, "0")}-01`;
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
        {data.count} transaction{data.count !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

export default function ExpenseStats({ expenses, categories, onDateClick }: Props) {
  const [range, setRange] = useState<DateRange>("month");

  const filtered = useMemo(() => {
    const cutoff = getRangeCutoff(range);
    if (!cutoff) return expenses;
    return expenses.filter((e) => e.date >= cutoff);
  }, [expenses, range]);

  const { breakdown, totalExpenses, incomeBySubcat, totalIncome } = useMemo(() => {
    const expMap = new Map<string, { amount: number; count: number }>();
    const incMap = new Map<string, { amount: number; count: number }>();
    let totalExpenses = 0;
    let totalIncome = 0;

    for (const e of filtered) {
      if (e.category === "Income") {
        totalIncome += e.amount;
        const existing = incMap.get(e.subcategory);
        if (existing) {
          existing.amount += e.amount;
          existing.count++;
        } else {
          incMap.set(e.subcategory, { amount: e.amount, count: 1 });
        }
        continue;
      }
      totalExpenses += e.amount;
      const existing = expMap.get(e.category);
      if (existing) {
        existing.amount += e.amount;
        existing.count++;
      } else {
        expMap.set(e.category, { amount: e.amount, count: 1 });
      }
    }

    const breakdown: CategoryBreakdown[] = Array.from(expMap.entries())
      .map(([name, { amount, count }]) => ({
        name,
        emoji: categories[name]?.emoji ?? "",
        amount,
        count,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const incomeSubs = categories["Income"]?.subcategories ?? {};
    const incomeBySubcat = Array.from(incMap.entries())
      .map(([name, { amount, count }]) => ({ name, emoji: incomeSubs[name] ?? "", amount, count }))
      .sort((a, b) => b.amount - a.amount);

    return { breakdown, totalExpenses, incomeBySubcat, totalIncome };
  }, [filtered, categories]);

  const tagBreakdown = useMemo(() => {
    const map = new Map<number, TagBreakdown>();

    for (const e of filtered) {
      for (const tag of e.tags) {
        const existing = map.get(tag.id);
        if (existing) {
          existing.amount += e.amount;
          existing.count++;
        } else {
          map.set(tag.id, { name: tag.name, color: tag.color, amount: e.amount, count: 1 });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  if (expenses.length === 0) {
    return (
      <div className="stats-container">
        <p className="empty-state">No transactions to analyze yet.</p>
      </div>
    );
  }

  return (
    <div className="stats-container">
      <div className="stats-range-bar">
        {(Object.keys(RANGE_LABELS) as DateRange[]).map((key) => (
          <button
            key={key}
            className={`stats-range-btn${range === key ? " stats-range-btn-active" : ""}`}
            onClick={() => setRange(key)}
          >
            {RANGE_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="stats-summary-row">
        <div className="stats-summary-col">
          <h3 className="stats-summary-heading stats-summary-heading-income">Income</h3>
          {incomeBySubcat.length > 0 ? (
            <div className="stats-summary-list">
              {incomeBySubcat.map((item) => (
                <div key={item.name} className="stats-summary-item">
                  <span className="stats-summary-name">{item.emoji} {item.name}</span>
                  <span className="stats-summary-amt stats-summary-amt-income">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="stats-summary-empty">No income</p>
          )}
          <div className="stats-summary-total">
            <span className="stats-summary-total-label">Total</span>
            <span className="stats-summary-total-amt stats-summary-amt-income">{formatCurrency(totalIncome)}</span>
          </div>
        </div>
        <div className="stats-summary-col">
          <h3 className="stats-summary-heading stats-summary-heading-expense">Expenses</h3>
          {breakdown.length > 0 ? (
            <div className="stats-summary-list">
              {breakdown.map((cat) => (
                <div key={cat.name} className="stats-summary-item">
                  <span className="stats-summary-name">{cat.emoji} {cat.name}</span>
                  <span className="stats-summary-amt stats-summary-amt-expense">{formatCurrency(cat.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="stats-summary-empty">No expenses</p>
          )}
          <div className="stats-summary-total">
            <span className="stats-summary-total-label">Total</span>
            <span className="stats-summary-total-amt stats-summary-amt-expense">{formatCurrency(totalExpenses)}</span>
          </div>
        </div>
      </div>
      <div className="stats-summary-balance">
        <span className="stats-summary-total-label">Balance</span>
        <span className={`stats-summary-total-amt ${totalIncome - totalExpenses >= 0 ? "balance-positive" : "balance-negative"}`}>
          {formatCurrency(totalIncome - totalExpenses)}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No transactions in this period.</p>
      ) : (
        <>
          <div className="stats-section-divider" />
          <div className="stats-total">
            <span className="stats-total-label">Total Spent</span>
            <span className="stats-total-amount stats-summary-amt-expense">{formatCurrency(totalExpenses)}</span>
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

          {tagBreakdown.length > 0 && (
            <div className="tag-breakdown">
              <h3 className="tag-breakdown-title">Spending by Tag</h3>
              <div className="tag-breakdown-list">
                {tagBreakdown.map((t) => (
                  <div key={t.name} className="tag-breakdown-row">
                    <span className="tag-pill tag-pill-sm" style={{ background: t.color }}>
                      {t.name}
                    </span>
                    <span className="breakdown-count">{t.count} txn{t.count !== 1 ? "s" : ""}</span>
                    <span className="breakdown-amount">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <SpendCalendar expenses={filtered} categories={categories} onDateClick={onDateClick} />
        </>
      )}
    </div>
  );
}
