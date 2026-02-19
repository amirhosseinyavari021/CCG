// client/src/components/ui/FastDiffViewer.jsx
import React, { useMemo, useState } from "react";

function splitLines(s) {
  return String(s || "").replace(/\r\n/g, "\n").split("\n");
}

function normForCompare(line, { ignoreWhitespace = false, ignoreTrailingWhitespace = true } = {}) {
  let t = String(line ?? "");
  if (ignoreTrailingWhitespace) t = t.replace(/[ \t]+$/g, "");
  if (ignoreWhitespace) t = t.replace(/\s+/g, " ").trim();
  return t;
}

export default function FastDiffViewer({
  a = "",
  b = "",
  lang = "fa",
  maxHeight = 420,
  ignoreWhitespace: ignoreWhitespaceProp,
}) {
  const fa = lang === "fa";
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(Boolean(ignoreWhitespaceProp));

  const rows = useMemo(() => {
    const A = splitLines(a);
    const B = splitLines(b);
    const n = Math.max(A.length, B.length);

    const out = [];
    for (let i = 0; i < n; i++) {
      const left = A[i] ?? "";
      const right = B[i] ?? "";

      const lCmp = normForCompare(left, { ignoreWhitespace });
      const rCmp = normForCompare(right, { ignoreWhitespace });
      const same = lCmp === rCmp;

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
  }, [a, b, ignoreWhitespace]);

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-black/30">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-200/60 dark:border-white/10 bg-black/5 dark:bg-white/[0.04]">
        <div className="grid grid-cols-2 gap-0 flex-1">
          <div className="text-xs font-semibold border-r border-gray-200/60 dark:border-white/10 pr-3">
            {fa ? "کد A" : "Code A"}
          </div>
          <div className="text-xs font-semibold pl-3">{fa ? "کد B" : "Code B"}</div>
        </div>

        <label className="flex items-center gap-2 select-none text-[11px] text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            className="accent-black dark:accent-white"
            checked={ignoreWhitespace}
            onChange={(e) => setIgnoreWhitespace(e.target.checked)}
          />
          {fa ? "نادیده‌گرفتن فاصله‌ها" : "Ignore whitespace"}
        </label>
      </div>

      <div className="overflow-auto" style={{ maxHeight: `${maxHeight}px` }}>
        <div className="min-w-[900px]">
          {rows.map((r) => (
            <div key={r.i} className="grid grid-cols-2 gap-0">
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
