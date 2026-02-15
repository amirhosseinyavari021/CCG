// client/src/components/ui/FastCodeEditor.jsx
import React, { useEffect, useMemo, useRef, useCallback } from "react";

export default function FastCodeEditor({
  value,
  onChange,
  placeholder = "",
  disabled = false,
  minRows = 14,
}) {
  const taRef = useRef(null);

  // auto-grow
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.max(el.scrollHeight, minRows * 22);
    el.style.height = `${next}px`;
  }, [value, minRows]);

  const lineCount = useMemo(() => {
    const v = String(value || "");
    return v ? v.split("\n").length : 1;
  }, [value]);

  const lines = useMemo(() => {
    const n = Math.max(lineCount, minRows);
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [lineCount, minRows]);

  const handleChange = useCallback(
    (e) => onChange?.(e.target.value),
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;

      // Insert tab
      if (e.key === "Tab") {
        e.preventDefault();
        const el = taRef.current;
        if (!el) return;

        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;

        const v = String(value ?? "");
        const insert = "  "; // 2 spaces
        const next = v.slice(0, start) + insert + v.slice(end);

        onChange?.(next);

        // restore cursor after react state update
        requestAnimationFrame(() => {
          try {
            el.selectionStart = el.selectionEnd = start + insert.length;
          } catch {}
        });
      }
    },
    [disabled, onChange, value]
  );

  return (
    <div className="w-full">
      <div className="rounded-2xl overflow-hidden border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-black/30">
        <div className="flex">
          {/* Line numbers */}
          <div className="select-none py-3 px-3 text-xs text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/[0.04] border-r border-gray-200/60 dark:border-white/10">
            {lines.map((n) => (
              <div key={n} className="leading-[22px] text-right tabular-nums">
                {n}
              </div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            ref={taRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            spellCheck={false}
            wrap="off"
            className="w-full p-3 text-sm leading-[22px] font-mono outline-none bg-transparent text-[var(--text)] placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
            style={{ tabSize: 2 }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-300">
        <div>Lines: {lineCount}</div>
        <div className="opacity-70">Tip: Tab works, copy/paste freely</div>
      </div>
    </div>
  );
}
