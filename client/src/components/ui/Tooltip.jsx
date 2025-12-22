import { useState } from "react";

export default function Tooltip({ text }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
    >
      <span className="ml-1 cursor-pointer rounded-full border border-slate-500 px-1.5 text-xs text-slate-300">
        ?
      </span>

      {open && (
        <div className="absolute z-50 mt-2 w-56 rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200 shadow-xl">
          {text}
        </div>
      )}
    </span>
  );
}
