const BASE = ((import.meta.env.VITE_API_URL as string) || "http://localhost:8000") + "/api";

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

export interface Profile {
  id: number;
  clerk_user_id: string;
  name: string;
  emoji: string;
  created_at: string;
  disabled_subcategories: string[];
}

export interface ProfileSummary extends Profile {
  income: number;
  expenses: number;
  balance: number;
}

export interface ProfileCreate {
  name: string;
  emoji: string;
}

export interface ProfileSettings {
  disabled_subcategories: string[];
}

// --- Profile API ---

export async function fetchProfiles(): Promise<ProfileSummary[]> {
  const res = await authFetch(`${BASE}/profiles`);
  if (!res.ok) throw new Error("Failed to fetch profiles");
  return res.json();
}

export async function createProfile(data: ProfileCreate): Promise<Profile> {
  const res = await authFetch(`${BASE}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create profile");
  return res.json();
}

export async function updateProfile(id: number, data: ProfileCreate): Promise<Profile> {
  const res = await authFetch(`${BASE}/profiles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

export async function deleteProfile(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/profiles/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete profile");
}

export async function updateProfileSettings(id: number, data: ProfileSettings): Promise<Profile> {
  const res = await authFetch(`${BASE}/profiles/${id}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update profile settings");
  return res.json();
}

export async function migrateLegacyData(): Promise<Profile> {
  const res = await authFetch(`${BASE}/profiles/migrate-legacy`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to migrate legacy data");
  return res.json();
}

// --- Expense API ---

function profileParam(profileId: number | null, hasExisting?: boolean): string {
  if (profileId === null) return "";
  const sep = hasExisting ? "&" : "?";
  return `${sep}profile_id=${profileId}`;
}

export async function fetchExpenses(profileId: number | null): Promise<Expense[]> {
  const res = await authFetch(`${BASE}/expenses${profileParam(profileId, false)}`);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export async function createExpense(profileId: number | null, data: ExpenseCreate): Promise<Expense> {
  const res = await authFetch(`${BASE}/expenses${profileParam(profileId, false)}`, {
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

export async function fetchCategories(profileId: number | null = null): Promise<Categories> {
  const res = await authFetch(`${BASE}/categories${profileParam(profileId, false)}`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

// --- Custom Subcategory API ---

export interface CustomSubcategory {
  id: number;
  clerk_user_id: string;
  profile_id: number;
  category: string;
  subcategory: string;
  emoji: string;
  created_at: string;
}

export interface CustomSubcategoryCreate {
  category: string;
  subcategory: string;
  emoji: string;
}

export async function fetchCustomSubcategories(profileId: number): Promise<CustomSubcategory[]> {
  const res = await authFetch(`${BASE}/custom-subcategories?profile_id=${profileId}`);
  if (!res.ok) throw new Error("Failed to fetch custom subcategories");
  return res.json();
}

export async function createCustomSubcategory(profileId: number, data: CustomSubcategoryCreate): Promise<CustomSubcategory> {
  const res = await authFetch(`${BASE}/custom-subcategories?profile_id=${profileId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create custom subcategory");
  return res.json();
}

export async function deleteCustomSubcategory(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/custom-subcategories/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete custom subcategory");
}

// --- Tag API ---

export async function fetchTags(profileId: number | null): Promise<Tag[]> {
  const res = await authFetch(`${BASE}/tags${profileParam(profileId, false)}`);
  if (!res.ok) throw new Error("Failed to fetch tags");
  return res.json();
}

export async function createTag(profileId: number | null, data: TagCreate): Promise<Tag> {
  const res = await authFetch(`${BASE}/tags${profileParam(profileId, false)}`, {
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

// --- Suggestions API ---

export async function fetchSuggestions(profileId: number | null): Promise<string> {
  const res = await authFetch(`${BASE}/suggestions${profileParam(profileId, false)}`);
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
