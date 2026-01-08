import { useMemo, useState } from "react";



// CCG_TOOLRESULT_JSON_GUARD_V1
function tryParseToolJsonString(maybe) {
  const t = String(maybe || "").trim();
  if (!t) return null;
  if (!(t.startsWith("{") && t.endsWith("}"))) return null;
  try {
    const obj = JSON.parse(t);
    const tool = (obj && typeof obj.tool === "object") ? obj.tool : obj;
    if (!tool || typeof tool !== "object") return null;
    if (!fixedTool.primary || typeof fixedTool.primary !== "object") return null;
    if (typeof fixedTool.primary.command !== "string") return null;
    return tool;
  } catch {
    return null;
  }
}


function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setOk(true);
      setTimeout(() => setOk(false), 900);
    } catch {}
  };

  return (
    <button className="ccg-btn text-xs px-3 py-1" type="button" onClick={copy}>
      {ok ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ lang, code }) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 text-xs bg-white/5">
        <span className="opacity-80">lang: {lang || "bash"}</span>
        <CopyBtn text={code} />
      </div>
      <pre className="p-3 text-sm overflow-auto"><code>{code}</code></pre>
    </div>
  );
}

export default function ToolResult({ tool }) {
  
  const fixedTool = (() => {
    const parsed = tryParseToolJsonString(fixedTool?.explanation);
    return parsed ? { ...tool, ...parsed } : tool;
  })();
const safe = useMemo(() => {
    const t = (tool && typeof tool === "object") ? tool : {};
    const primary = (t.primary && typeof t.primary === "object") ? t.primary : {};
    return {
      primary: { command: String(primary.command || ""), lang: String(primary.lang || "bash") },
      explanation: typeof t.explanation === "string" ? t.explanation : "",
      warnings: Array.isArray(t.warnings) ? t.warnings : [],
      alternatives: Array.isArray(t.alternatives) ? t.alternatives : []
    };
  }, [tool]);

  const cmd = safe.primary.command.trim();

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold mb-2">Command</div>
        <CodeBlock lang={safe.primary.lang} code={cmd || 'echo "No command produced"'} />
      </div>

      {safe.explanation?.trim() ? (
        <div>
          <div className="text-sm font-semibold mb-2">Explanation</div>
          <div className="text-sm leading-7 opacity-90 whitespace-pre-wrap">{safe.explanation}</div>
        </div>
      ) : null}

      {safe.warnings?.length ? (
        <div>
          <div className="text-sm font-semibold mb-2">Warnings</div>
          <ul className="list-disc pl-5 text-sm leading-7 opacity-90">
            {safe.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      ) : null}

      {safe.alternatives?.length ? (
        <div>
          <div className="text-sm font-semibold mb-2">Alternatives</div>
          <div className="space-y-4">
            {safe.alternatives.slice(0,3).map((a, i) => (
              <div key={i} className="space-y-2">
                {a?.note ? <div className="text-xs opacity-75">- {a.note}</div> : null}
                <CodeBlock lang={safe.primary.lang} code={String(a.command || "").trim()} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
