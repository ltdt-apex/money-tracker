const BASE = "http://localhost:8000/api";

export interface CategoryData {
  emoji: string;
  subcategories: Record<string, string>; // name -> emoji
}

export type Categories = Record<string, CategoryData>;

export interface Expense {
  id: number;
  user_id: number;
  title: string;
  amount: number;
  category: string;
  subcategory: string;
  date: string;
  created_at: string;
}

export interface ExpenseCreate {
  title: string;
  amount: number;
  subcategory: string;
  date: string;
}

export async function fetchExpenses(): Promise<Expense[]> {
  const res = await fetch(`${BASE}/expenses`);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export async function createExpense(data: ExpenseCreate): Promise<Expense> {
  const res = await fetch(`${BASE}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create expense");
  return res.json();
}

export async function updateExpense(id: number, data: ExpenseCreate): Promise<Expense> {
  const res = await fetch(`${BASE}/expenses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update expense");
  return res.json();
}

export async function deleteExpense(id: number): Promise<void> {
  const res = await fetch(`${BASE}/expenses/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete expense");
}

export async function fetchCategories(): Promise<Categories> {
  const res = await fetch(`${BASE}/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

// Build a flat lookup: subcategory name -> its emoji
export function buildEmojiMap(categories: Categories): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cat of Object.values(categories)) {
    for (const [name, emoji] of Object.entries(cat.subcategories)) {
      map[name] = emoji;
    }
  }
  return map;
}
