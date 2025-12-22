import { useState } from "react";

export default function ErrorHelper({ onAnalyze }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [context, setContext] = useState("");

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-blue-400 underline"
      >
        اگر هنگام اجرای دستور خطا گرفتی
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <textarea
            placeholder="Error message"
            value={error}
            onChange={(e) => setError(e.target.value)}
            className="w-full rounded-xl bg-slate-950 p-2 text-sm text-slate-100"
          />

          <textarea
            placeholder="توضیح اختیاری (چه اتفاقی افتاد؟)"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full rounded-xl bg-slate-950 p-2 text-sm text-slate-100"
          />

          <button
            onClick={() => onAnalyze({ error, context })}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Analyze Error
          </button>
        </div>
      )}
    </div>
  );
}
