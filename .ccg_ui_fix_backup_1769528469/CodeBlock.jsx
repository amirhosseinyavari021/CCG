// client/src/components/ui/CodeBlock.jsx
import { useState } from "react";

export default function CodeBlock({ title = "Command", code = "" }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {}
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
        <div className="text-xs font-semibold text-slate-300">{title}</div>
        <button
          onClick={copy}
          className="text-xs rounded-lg border border-slate-700 px-2 py-1 text-slate-200 hover:bg-slate-800"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-auto p-4 text-sm text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");
