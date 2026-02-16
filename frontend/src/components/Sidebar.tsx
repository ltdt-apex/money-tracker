import { Home } from "lucide-react";
import type { ProfileSummary } from "../api";

interface SidebarProps {
  profiles: ProfileSummary[];
  activeProfileId: number | null;
  onSelectProfile: (id: number | null) => void;
  onNewProfile: () => void;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export default function Sidebar({ profiles, activeProfileId, onSelectProfile, onNewProfile, sidebarOpen, onCloseSidebar }: SidebarProps) {
  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={onCloseSidebar} />}
      <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <img src="/money.png" alt="Cashboard" className="sidebar-brand-icon" />
          <span className="sidebar-brand-text">Cashboard</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-item${activeProfileId === null ? " sidebar-item-active" : ""}`}
            onClick={() => { onSelectProfile(null); onCloseSidebar(); }}
          >
            <Home size={18} />
            <span>Home</span>
          </button>
        </nav>

        <div className="sidebar-divider" />

        <div className="sidebar-section-header">
          <span className="sidebar-section-title">profiles</span>
          <button className="sidebar-new-btn" onClick={() => { onNewProfile(); onCloseSidebar(); }}>
            New profile
          </button>
        </div>

        <nav className="sidebar-nav">
          {profiles.map((p) => (
            <button
              key={p.id}
              className={`sidebar-item${activeProfileId === p.id ? " sidebar-item-active" : ""}`}
              onClick={() => { onSelectProfile(p.id); onCloseSidebar(); }}
            >
              <span className="sidebar-emoji">{p.emoji}</span>
              <span className="sidebar-item-name">{p.name}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
