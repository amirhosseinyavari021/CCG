import React, { useMemo, useState } from "react";

let ReactMarkdown = null;
let remarkGfm = null;
try {
  ReactMarkdown = require("react-markdown").default;
  remarkGfm = require("remark-gfm").default;
} catch (e) {
  // fallback mode
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
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
      title="Copy"
    >
      {copied ? "کپی شد ✅" : "کپی"}
    </button>
  );
}

function CodeBlock({ inline, className, children }) {
  const code = String(children || "").replace(/\n$/, "");
  const lang = (className || "").replace("language-", "") || "";

  if (inline) {
    return (
      <code className="px-1 py-0.5 rounded bg-white/10 border border-white/10 text-[0.95em]">
        {children}
      </code>
    );
  }

  return (
    <div className="my-3 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/30">
        <div className="text-xs opacity-80">{lang ? lang.toUpperCase() : "CODE"}</div>
        <CopyButton text={code} />
      </div>
      <pre className="p-3 overflow-auto text-sm leading-6">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function normalizeHeading(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\u200c/g, "")
    .replace(/\s+/g, " ");
}

function sectionTypeFromTitle(title) {
  const t = normalizeHeading(title);
  if (!t) return "default";
  if (t.includes("هشدار") || t.includes("warning") || t.includes("warnings")) return "warning";
  if (t.includes("دستور") || t.includes("command") || t.includes("commands")) return "command";
  if (t.includes("جایگزین") || t.includes("alternative") || t.includes("alternatives")) return "alt";
  if (t.includes("توضیح") || t.includes("explanation") || t.includes("explain")) return "explain";
  return "default";
}

function splitIntoSections(md) {
  const text = String(md || "");
  const lines = text.split(/\r?\n/);

  const sections = [];
  let current = { title: "", body: "" };

  const pushCurrent = () => {
    const body = (current.body || "").trim();
    if (current.title || body) {
      sections.push({ ...current, body });
    }
    current = { title: "", body: "" };
  };

  for (const line of lines) {
    const m = line.match(/^\s{0,3}#{2,3}\s+(.*)$/); // ## or ###
    if (m) {
      pushCurrent();
      current.title = (m[1] || "").trim();
      current.body = "";
      continue;
    }
    current.body += line + "\n";
  }
  pushCurrent();

  // if no headings at all, return single section
  if (sections.length === 1 && !sections[0].title) {
    return [{ title: "Output", body: sections[0].body }];
  }
  return sections;
}

function SectionCard({ title, type, children }) {
  const base = "rounded-2xl border p-4 mb-3";
  const styles = {
    warning: "border-red-500/30 bg-red-500/10",
    command: "border-white/10 bg-black/15",
    explain: "border-white/10 bg-white/5",
    alt: "border-white/10 bg-white/5",
    default: "border-white/10 bg-white/5"
  };

  const labelStyles = {
    warning: "text-red-200",
    command: "text-white",
    explain: "text-white",
    alt: "text-white",
    default: "text-white"
  };

  const subtitle = {
    warning: "⚠️",
    command: "💻",
    explain: "🧩",
    alt: "🔁",
    default: "📝"
  };

  return (
    <div className={`${base} ${styles[type] || styles.default}`}>
      <div className={`flex items-center gap-2 font-semibold mb-2 ${labelStyles[type] || labelStyles.default}`}>
        <span>{subtitle[type] || subtitle.default}</span>
        <span className="text-sm">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function MarkdownBox({ content = "" }) {
  const sections = useMemo(() => splitIntoSections(content), [content]);

  if (!ReactMarkdown) {
    // fallback rendering
    return (
      <div className="w-full">
        {sections.map((s, idx) => (
          <SectionCard
            key={`${s.title}-${idx}`}
            title={s.title || "Output"}
            type={sectionTypeFromTitle(s.title)}
          >
            <pre className="whitespace-pre-wrap text-sm leading-6">{s.body}</pre>
          </SectionCard>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      {sections.map((s, idx) => {
        const type = sectionTypeFromTitle(s.title);
        const title = s.title || "Output";
        const body = s.body || "";

        return (
          <SectionCard key={`${title}-${idx}`} title={title} type={type}>
            <ReactMarkdown
              remarkPlugins={remarkGfm ? [remarkGfm] : []}
              components={{ code: CodeBlock }}
            >
              {body}
            </ReactMarkdown>
          </SectionCard>
        );
      })}
    </div>
  );
}
