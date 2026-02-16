import { useState } from "react";

const EMOJI_OPTIONS = [
  "💰", "💵", "🏦", "📊", "💳", "🏠", "✈️", "🎓",
  "🏥", "🛒", "🎮", "👔", "🎁", "🐾", "🚗", "🍔",
  "📱", "🏋️", "🎭", "🧳", "💼", "🌴", "🎉", "⭐",
];

interface ProfileFormProps {
  onSubmit: (name: string, emoji: string) => void;
  onClose: () => void;
  initialName?: string;
  initialEmoji?: string;
  title?: string;
}

export default function ProfileForm({ onSubmit, onClose, initialName = "", initialEmoji = "💰", title = "New Profile" }: ProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), emoji);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="expense-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Personal, Business..."
              autoFocus
              maxLength={50}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Emoji</label>
            <div className="emoji-grid">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`emoji-option${emoji === e ? " emoji-option-active" : ""}`}
                  onClick={() => setEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={!name.trim()}>
              {initialName ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
