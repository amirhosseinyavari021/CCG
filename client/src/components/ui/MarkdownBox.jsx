// client/src/components/ui/MarkdownBox.jsx
import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CopyButton({ text, labelFa = "کپی", labelEn = "Copy", lang = "fa" }) {
  const [copied, setCopied] = useState(false);
  const isFa = lang === "fa";

  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text || "");
          setCopied(true);
          setTimeout(() => setCopied(false), 900);
        } catch {}
      }}
      className="px-3 py-1 rounded-md text-sm bg-white/10 hover:bg-white/15 transition"
      type="button"
      title={isFa ? labelFa : labelEn}
    >
      {copied ? (isFa ? "کپی شد ✅" : "Copied ✅") : isFa ? labelFa : labelEn}
    </button>
  );
}

function looksLikeTinySnippet(code) {
  const t = String(code || "").trim();
  if (!t) return true;
  // تک‌خط‌های کوتاه مثل re / TypeError / text.lower() / [::-1]
  const lines = t.split("\n").filter(Boolean);
  if (lines.length > 2) return false;
  if (t.length > 120) return false;
  return true;
}

function normalizeChildrenToString(children) {
  // react-markdown sometimes passes children as array
  if (Array.isArray(children)) return children.map((x) => (x === null || x === undefined ? "" : String(x))).join("");
  return children === null || children === undefined ? "" : String(children);
}

function CodeBlock({ inline, className, children, lang = "fa", allowCodeBlocks = true }) {
  const raw = normalizeChildrenToString(children);

  // preserve newlines; only drop a single trailing newline that markdown often adds
  const code = raw.endsWith("\n") ? raw.slice(0, -1) : raw;

  const language = (className || "").replace("language-", "").trim();

  // inline code => بدون Copy و بدون Card (همان رفتار قبلی)
  if (inline) {
    return (
      <code dir="ltr" className="px-1 py-0.5 rounded bg-white/10 border border-white/10 text-[0.95em]">
        {raw}
      </code>
    );
  }

  // ✅ اگر در این بخش اجازه code-block نداریم: همان رفتار قبلی
  if (!allowCodeBlocks) {
    const tiny = looksLikeTinySnippet(code);

    if (tiny) {
      return (
        <code dir="ltr" className="px-1 py-0.5 rounded bg-white/10 border border-white/10 text-[0.95em]">
          {code}
        </code>
      );
    }

    return (
      <span dir="ltr" className="whitespace-pre-wrap font-mono text-[0.95em]">
        {code}
      </span>
    );
  }

  // ✅ حالت Merge Final (فقط اینجا را سخت‌گیرانه multiline می‌کنیم)
  // حتی اگر CSS کلی پروژه white-space را خراب کند، این styleها override می‌کنند.
  return (
    <div className="my-3 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/30">
        <div className="text-xs opacity-80">{language ? language.toUpperCase() : "CODE"}</div>
        <CopyButton text={code} lang={lang} />
      </div>

      <pre
        dir="ltr"
        className="p-3 overflow-auto text-sm leading-6"
        style={{
          whiteSpace: "pre", // CRITICAL: do not collapse newlines
          tabSize: 2,
        }}
      >
        <code
          className="whitespace-pre"
          style={{
            whiteSpace: "pre", // CRITICAL: do not collapse newlines
            display: "block",
          }}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}

/**
 * MarkdownBox
 * - رندر مارک‌دان واقعی (GFM)
 * - فارسی: متن RTL، کد LTR
 * - ورودی سازگار: content / markdown / md
 */
export default function MarkdownBox(props) {
  const lang = (props?.lang || "fa") === "en" ? "en" : "fa";
  const allowCodeBlocks = props?.allowCodeBlocks !== undefined ? Boolean(props.allowCodeBlocks) : true;

  const md = (props?.content ?? props?.markdown ?? props?.md ?? "")?.toString?.() ?? "";

  const isFa = lang === "fa";
  const wrapperDir = isFa ? "rtl" : "ltr";

  const safeMd = useMemo(() => String(md || ""), [md]);

  if (!safeMd.trim()) {
    return <div className="text-sm opacity-70">{isFa ? "خروجی خالی است." : "Empty output."}</div>;
  }

  return (
    <div dir={wrapperDir} className={isFa ? "rtl-text" : "ltr-text"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: (p) => <CodeBlock {...p} lang={lang} allowCodeBlocks={allowCodeBlocks} />,
        }}
      >
        {safeMd}
      </ReactMarkdown>
    </div>
  );
}
