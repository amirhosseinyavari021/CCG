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

function CodeBlock({ inline, className, children, lang = "fa" }) {
  const code = String(children || "").replace(/\n$/, "");
  const language = (className || "").replace("language-", "").trim();

  // inline code => بدون Copy و بدون Card
  if (inline) {
    return (
      <code
        dir="ltr"
        className="px-1 py-0.5 rounded bg-white/10 border border-white/10 text-[0.95em]"
      >
        {children}
      </code>
    );
  }

  return (
    <div className="my-3 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/30">
        <div className="text-xs opacity-80">{language ? language.toUpperCase() : "CODE"}</div>
        <CopyButton text={code} lang={lang} />
      </div>
      <pre dir="ltr" className="p-3 overflow-auto text-sm leading-6">
        <code>{code}</code>
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
  const md =
    (props?.content ?? props?.markdown ?? props?.md ?? "")?.toString?.() ?? "";

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
          code: (p) => <CodeBlock {...p} lang={lang} />,
        }}
      >
        {safeMd}
      </ReactMarkdown>
    </div>
  );
}
