export default function CodeBlock({ title, code }) {
  if (!code) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
        <span>{title}</span>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="hover:text-blue-400"
        >
          Copy
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
