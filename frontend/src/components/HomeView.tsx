import { Plus, Trash2 } from "lucide-react";
import type { ProfileSummary } from "../api";

interface HomeViewProps {
  profiles: ProfileSummary[];
  onSelectProfile: (id: number) => void;
  onNewProfile: () => void;
  onDeleteProfile: (id: number) => void;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export default function HomeView({ profiles, onSelectProfile, onNewProfile, onDeleteProfile }: HomeViewProps) {
  function handleDelete(e: React.MouseEvent, profile: ProfileSummary) {
    e.stopPropagation();
    if (window.confirm(`Delete "${profile.name}"? Transactions and tags in this profile will become unassigned.`)) {
      onDeleteProfile(profile.id);
    }
  }

  return (
    <div className="home-view">
      <h2 className="home-title">Your Profiles</h2>
      <div className="home-cards">
        {profiles.map((p) => (
          <button key={p.id} className="home-card" onClick={() => onSelectProfile(p.id)}>
            <div className="home-card-top">
              <div className="home-card-emoji">{p.emoji}</div>
              <button
                className="home-card-delete"
                onClick={(e) => handleDelete(e, p)}
                title="Delete profile"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="home-card-name">{p.name}</div>
            <div className="home-card-stats">
              <div className="home-card-stat">
                <span className="home-card-stat-label">Income</span>
                <span className="home-card-stat-value home-card-income">{formatCurrency(p.income)}</span>
              </div>
              <div className="home-card-stat">
                <span className="home-card-stat-label">Expenses</span>
                <span className="home-card-stat-value home-card-expenses">{formatCurrency(p.expenses)}</span>
              </div>
              <div className="home-card-stat">
                <span className="home-card-stat-label">Balance</span>
                <span className={`home-card-stat-value ${p.balance >= 0 ? "home-card-income" : "home-card-expenses"}`}>
                  {formatCurrency(p.balance)}
                </span>
              </div>
            </div>
          </button>
        ))}
        <button className="home-card home-card-new" onClick={onNewProfile}>
          <Plus size={32} />
          <div className="home-card-name">New Profile</div>
        </button>
      </div>
    </div>
  );
}
