import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * TDZ-safe MarkdownBox:
 * - No local const/object named "t" used in closures before initialization
 * - Copy button never throws
 */
function CopyMini({ value, labelCopy, labelCopied }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      const v = String(value || "");
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(v);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 900);
      }
    } catch (e) {
      // never crash UI
      console.error("Clipboard copy failed:", e);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="ccg-btn ccg-btn-ghost ccg-btn-xs"
      title={labelCopy}
      disabled={!value}
    >
      {copied ? labelCopied : labelCopy}
    </button>
  );
}

export default function MarkdownBox({ markdown, content, lang = "fa" }) {
  const md = content ?? markdown ?? "";

  const labels = useMemo(() => {
    const fa = { copy: "کپی", copied: "کپی شد" };
    const en = { copy: "Copy", copied: "Copied" };
    return lang === "fa" ? fa : en;
  }, [lang]);

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
                  <CopyMini
                    value={value}
                    labelCopy={labels.copy}
                    labelCopied={labels.copied}
                  />
                </div>
                <pre className="ccg-pre">
                  <code dir="ltr">{value}</code>
                </pre>
              </div>
            );
          },
        }}
      >
        {String(md)}
      </ReactMarkdown>
    </div>
  );
}
