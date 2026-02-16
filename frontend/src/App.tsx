import { useCallback, useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, RedirectToSignIn, UserButton, useAuth } from "@clerk/clerk-react";
import {
  fetchExpenses, fetchCategories, fetchTags, fetchProfiles,
  createExpense, updateExpense, deleteExpense, createTag,
  createProfile, deleteProfile, migrateLegacyData,
  buildEmojiMap, setAuthTokenGetter,
} from "./api";
import type { Categories, Expense, ExpenseCreate, Tag, TagCreate, ProfileSummary } from "./api";
import { Receipt, ChartPie, Lightbulb, Menu, Trash2 } from "lucide-react";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseTimeline from "./components/ExpenseTimeline";
import ExpenseStats from "./components/ExpenseStats";
import Suggestions from "./components/Suggestions";
import Sidebar from "./components/Sidebar";
import HomeView from "./components/HomeView";
import ProfileForm from "./components/ProfileForm";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function AppContent() {
  const { getToken } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Categories>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState<"expenses" | "stats" | "suggestions">("expenses");

  // Profile state
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  const emojiMap = useMemo(() => buildEmojiMap(categories), [categories]);

  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, [getToken]);

  const { income, spent, balance } = useMemo(() => {
    let income = 0;
    let spent = 0;
    for (const e of expenses) {
      if (e.category === "Income") income += e.amount;
      else spent += e.amount;
    }
    return { income, spent, balance: income - spent };
  }, [expenses]);

  // Load profiles on mount, auto-migrate if needed
  useEffect(() => {
    fetchProfiles()
      .then(async (ps) => {
        if (ps.length === 0) {
          // Auto-migrate legacy data
          await migrateLegacyData();
          const migrated = await fetchProfiles();
          setProfiles(migrated);
          if (migrated.length > 0) {
            setActiveProfileId(migrated[0].id);
          }
        } else {
          setProfiles(ps);
        }
        setProfilesLoaded(true);
      })
      .catch(console.error);
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  // Load profile-scoped data when activeProfileId changes
  useEffect(() => {
    if (!profilesLoaded) return;
    fetchExpenses(activeProfileId).then(setExpenses).catch(console.error);
    fetchTags(activeProfileId).then(setTags).catch(console.error);
  }, [activeProfileId, profilesLoaded]);

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
      const created = await createExpense(activeProfileId, data);
      setExpenses((prev) =>
        [created, ...prev].sort((a, b) => b.date.localeCompare(a.date))
      );
    }
    closeForm();
    // Refresh profile summaries
    fetchProfiles().then(setProfiles).catch(console.error);
  }

  async function handleCreateTag(data: TagCreate): Promise<Tag> {
    const tag = await createTag(activeProfileId, data);
    setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
    return tag;
  }

  async function handleDelete(id: number) {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    closeForm();
    fetchProfiles().then(setProfiles).catch(console.error);
  }

  async function handleCreateProfile(name: string, emoji: string) {
    await createProfile({ name, emoji });
    const ps = await fetchProfiles();
    setProfiles(ps);
    setShowProfileForm(false);
    // Select the newly created profile (last one by created_at)
    const newProfile = ps.find((p) => p.name === name);
    if (newProfile) setActiveProfileId(newProfile.id);
  }

  async function handleDeleteProfile(id: number) {
    await deleteProfile(id);
    const ps = await fetchProfiles();
    setProfiles(ps);
    if (activeProfileId === id) {
      setActiveProfileId(null);
    }
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

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  return (
    <div className="app">
      <div className="mobile-topbar">
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu size={20} />
        </button>
        <span className="mobile-topbar-title">Cashboard</span>
        <div className="mobile-topbar-account">
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
      <div className="app-layout">
        <Sidebar
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelectProfile={setActiveProfileId}
          onNewProfile={() => setShowProfileForm(true)}
          sidebarOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
        <main className="app-main">
          <div className="app-topright">
            <UserButton afterSignOutUrl="/" />
          </div>
          <div className="container">
            {activeProfileId === null ? (
              <HomeView
                profiles={profiles}
                onSelectProfile={setActiveProfileId}
                onNewProfile={() => setShowProfileForm(true)}
                onDeleteProfile={handleDeleteProfile}
              />
            ) : (
              <>
                <div className="group-header">
                  <div className="group-info">
                    <div className="group-icon">{activeProfile?.emoji ?? "$"}</div>
                    <div className="group-text">
                      <h2 className="group-title">{activeProfile?.name ?? "Money Tracker"}</h2>
                      <div className="header-summary">
                        <span className="header-summary-item">
                          <span className="header-summary-label">Income</span>
                          <span className="header-summary-value header-summary-income">{formatCurrency(income)}</span>
                        </span>
                        <span className="header-summary-item">
                          <span className="header-summary-label">Expenses</span>
                          <span className="header-summary-value header-summary-expense">{formatCurrency(spent)}</span>
                        </span>
                        <span className="header-summary-item">
                          <span className="header-summary-label">Balance</span>
                          <span className={`header-summary-value ${balance >= 0 ? "balance-positive" : "balance-negative"}`}>{formatCurrency(balance)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="group-header-actions">
                    <button className="new-expense-btn" onClick={openNew}>
                      New expense
                    </button>
                    <button
                      className="delete-profile-btn"
                      title="Delete profile"
                      onClick={() => {
                        if (activeProfile && window.confirm(`Delete "${activeProfile.name}"? Expenses and tags will become unassigned.`)) {
                          handleDeleteProfile(activeProfile.id);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
                  <button
                    className={`tab${activeTab === "suggestions" ? " tab-active" : ""}`}
                    onClick={() => setActiveTab("suggestions")}
                  >
                    <Lightbulb size={16} /> Suggestions
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

                {activeTab === "suggestions" && <Suggestions profileId={activeProfileId} />}
              </>
            )}
          </div>
        </main>
      </div>

      {showProfileForm && (
        <ProfileForm
          onSubmit={handleCreateProfile}
          onClose={() => setShowProfileForm(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <AppContent />
      </SignedIn>
    </>
  );
}
