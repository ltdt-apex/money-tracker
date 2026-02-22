import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  value: number;
  onApply: (value: number) => void;
  onClose: () => void;
}

function safeEval(expr: string): number | null {
  const sanitized = expr.replace(/[^0-9+\-*/.() ]/g, "");
  if (!sanitized || /[+\-*/.]$/.test(sanitized)) return null;
  try {
    const result = new Function(`"use strict"; return (${sanitized});`)();
    if (typeof result !== "number" || !isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

export default function Calculator({ value, onApply, onClose }: Props) {
  const [expr, setExpr] = useState(value ? String(value) : "");
  const [copied, setCopied] = useState(false);

  const result = safeEval(expr);

  const append = useCallback((ch: string) => {
    setExpr((prev) => prev + ch);
  }, []);

  const handleClear = useCallback(() => setExpr(""), []);

  const handleBackspace = useCallback(() => {
    setExpr((prev) => prev.slice(0, -1));
  }, []);

  const handleEquals = useCallback(() => {
    if (result !== null) setExpr(String(result));
  }, [result]);

  const handleApply = useCallback(() => {
    if (result !== null) onApply(result);
  }, [result, onApply]);

  const handleCopy = useCallback(() => {
    if (result !== null) {
      navigator.clipboard.writeText(String(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [result]);

  const buttons = [
    { label: "C", action: handleClear, className: "calc-btn-action" },
    { label: "(", action: () => append("("), className: "calc-btn-op" },
    { label: ")", action: () => append(")"), className: "calc-btn-op" },
    { label: "/", action: () => append("/"), className: "calc-btn-op" },
    { label: "7", action: () => append("7"), className: "calc-btn" },
    { label: "8", action: () => append("8"), className: "calc-btn" },
    { label: "9", action: () => append("9"), className: "calc-btn" },
    { label: "*", action: () => append("*"), className: "calc-btn-op", display: "\u00d7" },
    { label: "4", action: () => append("4"), className: "calc-btn" },
    { label: "5", action: () => append("5"), className: "calc-btn" },
    { label: "6", action: () => append("6"), className: "calc-btn" },
    { label: "-", action: () => append("-"), className: "calc-btn-op" },
    { label: "1", action: () => append("1"), className: "calc-btn" },
    { label: "2", action: () => append("2"), className: "calc-btn" },
    { label: "3", action: () => append("3"), className: "calc-btn" },
    { label: "+", action: () => append("+"), className: "calc-btn-op" },
    { label: "\u232b", action: handleBackspace, className: "calc-btn-action" },
    { label: "0", action: () => append("0"), className: "calc-btn" },
    { label: ".", action: () => append("."), className: "calc-btn" },
    { label: "=", action: handleEquals, className: "calc-btn-op calc-btn-equals" },
  ];

  return (
    <div className="calculator-popover" onClick={(e) => e.stopPropagation()}>
      <div className="calculator-display">
        <div className="calculator-expr">{expr || "0"}</div>
        {expr && result !== null && expr !== String(result) && (
          <div className="calculator-preview">= {result}</div>
        )}
      </div>
      <div className="calculator-grid">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            className={btn.className}
            onClick={btn.action}
          >
            {btn.display ?? btn.label}
          </button>
        ))}
      </div>
      <div className="calculator-actions">
        <button type="button" className="calc-copy-btn" onClick={handleCopy} disabled={result === null}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className="calc-cancel-btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="calc-apply-btn" onClick={handleApply} disabled={result === null}>
          Apply
        </button>
      </div>
    </div>
  );
}
