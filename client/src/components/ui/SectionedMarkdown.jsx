import { useMemo } from "react";
import MarkdownBox from "./MarkdownBox";

function splitByHeadings(md) {
  const raw = String(md || "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");

  const sections = [];
  let current = { title: null, body: [] };

  const pushCurrent = () => {
    const body = current.body.join("\n").trim();
    if (!current.title && !body) return;
    sections.push({ title: current.title, body });
  };

  for (const line of lines) {
    const m = line.match(/^(#{2,6})\s+(.+)\s*$/);
    if (m) {
      if (current.title !== null || current.body.length) pushCurrent();
      current = { title: m[2].trim(), body: [] };
      continue;
    }
    current.body.push(line);
  }

  pushCurrent();

  if (!sections.length && raw.trim()) return [{ title: null, body: raw.trim() }];

  return sections.filter((s) => (s.title || s.body).toString().trim().length > 0);
}

export default function SectionedMarkdown({ markdown, content, lang = "fa", defaultTitle }) {
  const md = content ?? markdown ?? "";
  const sections = useMemo(() => splitByHeadings(md), [md]);

  if (!md || !String(md).trim()) return <MarkdownBox markdown={""} lang={lang} />;

  if (sections.length === 1 && !sections[0].title) {
    return <MarkdownBox markdown={sections[0].body} lang={lang} />;
  }

  return (
    <div className="ccg-section-grid">
      {sections.map((sec, idx) => {
        const title = sec.title || defaultTitle || (lang === "fa" ? "خروجی" : "Result");
        
        const isWarnTitle = /^(هشدارها|هشدار|warnings?|warning)$/i.test(String(title || "").trim());
        const cardClass = isWarnTitle ? "ccg-section-card ccg-warn" : "ccg-section-card";
return (
          <div key={`${title}-${idx}`} className={cardClass}>
            <div className="ccg-section-title">{title}</div>
            <div className="ccg-section-body">
              <MarkdownBox markdown={sec.body} lang={lang} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");
