// client/src/components/ui/FastDiffViewer.jsx
import React, { useMemo } from "react";

function splitLines(s) {
  return String(s || "").replace(/\r\n/g, "\n").split("\n");
}

export default function FastDiffViewer({
  a = "",
  b = "",
  lang = "fa",
  maxHeight = 420,
}) {
  const fa = lang === "fa";

  const rows = useMemo(() => {
    const A = splitLines(a);
    const B = splitLines(b);
    const n = Math.max(A.length, B.length);

    const out = [];
    for (let i = 0; i < n; i++) {
      const left = A[i] ?? "";
      const right = B[i] ?? "";
      const same = left === right;

      out.push({
        i,
        left,
        right,
        same,
        leftNo: i < A.length ? i + 1 : "",
        rightNo: i < B.length ? i + 1 : "",
      });
    }
    return out;
  }, [a, b]);

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-black/30">
      <div className="grid grid-cols-2 gap-0 border-b border-gray-200/60 dark:border-white/10">
        <div className="px-3 py-2 text-xs font-semibold bg-black/5 dark:bg-white/[0.04] border-r border-gray-200/60 dark:border-white/10">
          {fa ? "کد A" : "Code A"}
        </div>
        <div className="px-3 py-2 text-xs font-semibold bg-black/5 dark:bg-white/[0.04]">
          {fa ? "کد B" : "Code B"}
        </div>
      </div>

      {/* One shared scroller to keep rows aligned */}
      <div
        className="overflow-auto"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <div className="min-w-[900px]">
          {rows.map((r) => (
            <div
              key={r.i}
              className="grid grid-cols-2 gap-0"
            >
              {/* Left row */}
              <div
                className={`flex px-3 py-[2px] leading-[22px] border-r border-gray-200/60 dark:border-white/10 ${
                  r.same ? "" : "bg-amber-50 dark:bg-amber-900/20"
                }`}
              >
                <div className="w-10 text-right pr-3 select-none text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {r.leftNo}
                </div>
                <pre className="flex-1 font-mono text-sm overflow-x-auto whitespace-pre">
                  {r.left}
                </pre>
              </div>

              {/* Right row */}
              <div
                className={`flex px-3 py-[2px] leading-[22px] ${
                  r.same ? "" : "bg-emerald-50 dark:bg-emerald-900/20"
                }`}
              >
                <div className="w-10 text-right pr-3 select-none text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {r.rightNo}
                </div>
                <pre className="flex-1 font-mono text-sm overflow-x-auto whitespace-pre">
                  {r.right}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 text-[11px] text-gray-600 dark:text-gray-300 border-t border-gray-200/60 dark:border-white/10">
        {fa
          ? "خطوط تغییرکرده رنگی نمایش داده می‌شوند (A: زرد، B: سبز)."
          : "Changed lines are highlighted (A: amber, B: green)."}
      </div>
    </div>
  );
}
