#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
FILE="$ROOT/client/src/components/ui/MarkdownBox.jsx"

if [ ! -f "$FILE" ]; then
  echo "❌ Not found: $FILE"
  exit 1
fi

cp -a "$FILE" "$FILE.bak_$(date +%Y%m%d_%H%M%S)"
echo "🧷 Backup created."

cat > "$FILE" <<'EOF'
// client/src/components/ui/MarkdownBox.jsx
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CopyMini({ value, labelCopy, labelCopied }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="ccg-btn ccg-btn-ghost ccg-btn-xs"
      title={labelCopy}
    >
      {copied ? labelCopied : labelCopy}
    </button>
  );
}

/**
 * ✅ Backward-compatible:
 * - accepts `markdown` prop (preferred)
 * - also accepts `content` prop (legacy usage in your pages)
 */
export default function MarkdownBox({ markdown, content, lang = "fa" }) {
  const t = useMemo(() => {
    const fa = { copy: "کپی", copied: "کپی شد" };
    const en = { copy: "Copy", copied: "Copied" };
    return lang === "fa" ? fa : en;
  }, [lang]);

  const md = (typeof markdown === "string" ? markdown : "") || (typeof content === "string" ? content : "") || "";

  return (
    <div className={`ccg-markdown ${lang === "fa" ? "rtl" : "ltr"}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children }) {
            const raw = String(children ?? "");
            const value = raw.replace(/\n$/, "");
            const isBlock = !inline;

            if (!isBlock) return <code className="ccg-inline-code">{children}</code>;

            return (
              <div className="ccg-codeblock">
                <div className="ccg-codeblock-head">
                  <div className="ccg-codeblock-title">
                    {(className || "").replace("language-", "") || "CODE"}
                  </div>
                  <CopyMini value={value} labelCopy={t.copy} labelCopied={t.copied} />
                </div>
                <pre className="ccg-pre">
                  <code dir="ltr">{value}</code>
                </pre>
              </div>
            );
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
EOF

echo "✅ Patched: $FILE"
echo "Now run: cd client && npm run build"
