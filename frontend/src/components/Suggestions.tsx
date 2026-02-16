import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { fetchSuggestions } from "../api";
import { Lightbulb, RefreshCw } from "lucide-react";

export default function Suggestions() {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    setLoading(true);
    setError(null);
    try {
      const text = await fetchSuggestions();
      setSuggestion(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get suggestions");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="suggestions-container">
      {!suggestion && !loading && !error && (
        <div className="suggestions-empty">
          <Lightbulb size={40} className="suggestions-empty-icon" />
          <p>Get personalized financial advice based on your spending and income data.</p>
          <button className="suggestions-btn" onClick={handleFetch}>
            Get Suggestions
          </button>
        </div>
      )}

      {loading && (
        <div className="suggestions-loading">
          <RefreshCw size={24} className="suggestions-spinner" />
          <p>Analyzing your finances...</p>
        </div>
      )}

      {error && (
        <div className="suggestions-error">
          <p>{error}</p>
          <button className="suggestions-btn" onClick={handleFetch}>
            Try Again
          </button>
        </div>
      )}

      {suggestion && !loading && (
        <>
          <div className="suggestions-content">
            <ReactMarkdown>{suggestion}</ReactMarkdown>
          </div>
          <div className="suggestions-footer">
            <button className="suggestions-btn suggestions-btn-sm" onClick={handleFetch}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
}
