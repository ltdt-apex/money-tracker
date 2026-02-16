import { useMemo, useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Categories, Expense } from "../api";

interface Props {
  expenses: Expense[];
  categories: Categories;
  onDateClick?: (date: string) => void;
}

interface DayData {
  total: number;
  byCategory: Map<string, { amount: number; count: number }>;
}

function formatCurrency(n: number): string {
  if (n === 0) return "0.00";
  return n.toFixed(2);
}

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SpendCalendar({ expenses, categories, onDateClick }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const dataByDate = useMemo(() => {
    const map = new Map<string, DayData>();
    for (const e of expenses) {
      let day = map.get(e.date);
      if (!day) {
        day = { total: 0, byCategory: new Map() };
        map.set(e.date, day);
      }
      day.total += e.amount;
      const cat = day.byCategory.get(e.category);
      if (cat) {
        cat.amount += e.amount;
        cat.count++;
      } else {
        day.byCategory.set(e.category, { amount: e.amount, count: 1 });
      }
    }
    return map;
  }, [expenses]);

  const monthTotal = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    let total = 0;
    for (const [date, day] of dataByDate) {
      if (date.startsWith(prefix)) total += day.total;
    }
    return total;
  }, [dataByDate, year, month]);

  // Position tooltip near hovered cell
  useEffect(() => {
    if (hoveredDay === null || !tooltipRef.current) return;
    const cell = cellRefs.current.get(hoveredDay);
    const container = tooltipRef.current.parentElement;
    if (!cell || !container) return;

    const cellRect = cell.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const tip = tooltipRef.current;

    tip.style.top = `${cellRect.bottom - containerRect.top + 6}px`;
    tip.style.left = `${cellRect.left - containerRect.left + cellRect.width / 2}px`;
  }, [hoveredDay]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = new Array(firstDay).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  function prevMonth() {
    setHoveredDay(null);
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    setHoveredDay(null);
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function dateKey(day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const hoveredData = hoveredDay !== null ? dataByDate.get(dateKey(hoveredDay)) : null;

  return (
    <div className="cal" style={{ position: "relative" }}>
      <div className="cal-header">
        <button className="cal-nav" onClick={prevMonth}><ChevronLeft size={18} /></button>
        <span className="cal-title">{MONTH_NAMES[month]} {year}</span>
        <button className="cal-nav" onClick={nextMonth}><ChevronRight size={18} /></button>
      </div>

      {isCurrentMonth && monthTotal > 0 && (
        <div className="cal-month-total">
          Spent this month: <strong>${monthTotal.toFixed(2)}</strong>
        </div>
      )}

      <div className="cal-grid">
        {DAY_LABELS.map(d => (
          <div key={d} className="cal-day-label">{d}</div>
        ))}
        {weeks.flat().map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="cal-cell cal-cell-empty" />;
          const dayData = dataByDate.get(dateKey(day));
          const spend = dayData?.total ?? 0;
          const hasSpend = spend > 0;
          return (
            <div
              key={i}
              ref={(el) => { if (el) cellRefs.current.set(day, el); }}
              className={`cal-cell${isToday(day) ? " cal-cell-today" : ""}${hasSpend ? " cal-cell-has-spend" : ""}`}
              onMouseEnter={() => hasSpend && setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => hasSpend && onDateClick?.(dateKey(day))}
            >
              <span className="cal-cell-day">{day}</span>
              <span className={`cal-cell-amount${hasSpend ? " cal-cell-amount-active" : ""}`}>
                {formatCurrency(spend)}
              </span>
            </div>
          );
        })}
      </div>

      {hoveredDay !== null && hoveredData && (
        <div className="cal-tooltip" ref={tooltipRef}>
          <div className="cal-tooltip-header">
            {MONTH_NAMES[month]} {hoveredDay} — ${hoveredData.total.toFixed(2)}
          </div>
          {Array.from(hoveredData.byCategory.entries())
            .sort((a, b) => b[1].amount - a[1].amount)
            .map(([cat, { amount, count }]) => (
              <div key={cat} className="cal-tooltip-row">
                <span className="cal-tooltip-cat">
                  {categories[cat]?.emoji ?? ""} {cat}
                </span>
                <span className="cal-tooltip-count">{count}x</span>
                <span className="cal-tooltip-amt">${amount.toFixed(2)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
