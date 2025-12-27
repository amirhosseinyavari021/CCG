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
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="ccg-btn ccg-btn-ghost px-3 py-1 text-xs"
      title={labelCopy}
    >
      {copied ? labelCopied : labelCopy}
    </button>
  );
}

/**
 * ✅ Fix 1: پشتیبانی از هر دو prop:
 * - content
 * - markdown
 *
 * ✅ Fix 2: Section boxing
 * اگر خروجی با Heading های مشخص بیاد (Command/Explanation/Warnings/Alternatives و ...)
 * هر بخش توی یک کادر جدا نمایش داده میشه.
 */
export default function MarkdownBox({ content, markdown, lang = "fa" }) {
  const t = useMemo(() => {
    const fa = { copy: "کپی", copied: "کپی شد" };
    const en = { copy: "Copy", copied: "Copied" };
    return lang === "fa" ? fa : en;
  }, [lang]);

  const raw = (typeof content === "string" ? content : "") || (typeof markdown === "string" ? markdown : "");
  const text = raw || "";

  const sections = useMemo(() => {
    // split by headings (## or #)
    // keep heading with its body
    const lines = text.split("\n");
    const out = [];
    let cur = { title: "", body: [] };

    function pushCur() {
      const body = cur.body.join("\n").trim();
      if (cur.title || body) out.push({ title: cur.title.trim(), body });
    }

    for (const line of lines) {
      const m = line.match(/^(#{1,3})\s+(.*)$/);
      if (m) {
        pushCur();
        cur = { title: m[2] || "", body: [] };
      } else {
        cur.body.push(line);
      }
    }
    pushCur();

    // اگر هیچ heading نبود → یک سکشن
    if (out.length === 0) return [{ title: "", body: text }];
    // اگر heading اول خالیه و body خیلی کوچیکه → حذف
    return out;
  }, [text]);

  if (!text.trim()) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
        {lang === "fa" ? "خروجی اینجا نمایش داده می‌شود." : "Output will appear here."}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${lang === "fa" ? "rtl" : "ltr"}`}>
      {sections.map((s, idx) => {
        const value = (s.body || "").replace(/\n$/, "");
        return (
          <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm font-semibold text-slate-100">
                {s.title || (lang === "fa" ? "خروجی" : "Result")}
              </div>
              <CopyMini value={value} labelCopy={t.copy} labelCopied={t.copied} />
            </div>

            <div className="prose prose-invert max-w-none text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children }) {
                    const raw = String(children ?? "");
                    const v = raw.replace(/\n$/, "");
                    const isBlock = !inline;
                    if (!isBlock) return <code className="px-1 py-0.5 rounded bg-black/30">{children}</code>;

                    const langName = (className || "").replace("language-", "") || "CODE";
                    return (
                      <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                          <div className="text-xs font-semibold text-slate-200">{langName}</div>
                          <CopyMini value={v} labelCopy={t.copy} labelCopied={t.copied} />
                        </div>
                        <pre className="overflow-auto p-3 text-xs leading-6">
                          <code dir="ltr">{v}</code>
                        </pre>
                      </div>
                    );
                  },
                }}
              >
                {s.body || ""}
              </ReactMarkdown>
            </div>
          </div>
        );
      })}
    </div>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");
