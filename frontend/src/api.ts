const BASE = "http://localhost:8000/api";

let getTokenFn: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(fn: () => Promise<string | null>) {
  getTokenFn = fn;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getTokenFn ? await getTokenFn() : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

export interface CategoryData {
  emoji: string;
  subcategories: Record<string, string>; // name -> emoji
}

export type Categories = Record<string, CategoryData>;

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
}

export interface TagCreate {
  name: string;
  color: string;
}

export interface Expense {
  id: number;
  user_id: number;
  title: string;
  amount: number;
  category: string;
  subcategory: string;
  date: string;
  created_at: string;
  tags: Tag[];
}

export interface ExpenseCreate {
  title: string;
  amount: number;
  subcategory: string;
  date: string;
  tag_ids: number[];
}

export async function fetchExpenses(): Promise<Expense[]> {
  const res = await authFetch(`${BASE}/expenses`);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export async function createExpense(data: ExpenseCreate): Promise<Expense> {
  const res = await authFetch(`${BASE}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create expense");
  return res.json();
}

export async function updateExpense(id: number, data: ExpenseCreate): Promise<Expense> {
  const res = await authFetch(`${BASE}/expenses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update expense");
  return res.json();
}

export async function deleteExpense(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/expenses/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete expense");
}

export async function fetchCategories(): Promise<Categories> {
  const res = await fetch(`${BASE}/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function fetchTags(): Promise<Tag[]> {
  const res = await authFetch(`${BASE}/tags`);
  if (!res.ok) throw new Error("Failed to fetch tags");
  return res.json();
}

export async function createTag(data: TagCreate): Promise<Tag> {
  const res = await authFetch(`${BASE}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create tag");
  return res.json();
}

export async function updateTag(id: number, data: TagCreate): Promise<Tag> {
  const res = await authFetch(`${BASE}/tags/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update tag");
  return res.json();
}

export async function deleteTag(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/tags/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete tag");
}

export async function fetchSuggestions(): Promise<string> {
  const res = await authFetch(`${BASE}/suggestions`);
  if (!res.ok) throw new Error("Failed to fetch suggestions");
  const data = await res.json();
  return data.suggestion;
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
