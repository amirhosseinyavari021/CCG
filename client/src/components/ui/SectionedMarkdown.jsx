import { useMemo } from "react";
import MarkdownBox from "./MarkdownBox";

/**
 * TDZ-safe SectionedMarkdown:
 * - pure helpers (no closures referencing const before init)
 */
function splitByHeadings(md) {
  const raw = String(md || "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  const sections = [];
  let currentTitle = null;
  let currentBody = [];

  function push() {
    const body = currentBody.join("\n").trim();
    if (!currentTitle && !body) return;
    sections.push({ title: currentTitle, body });
  }

  for (const line of lines) {
    const m = line.match(/^(#{2,6})\s+(.+)\s*$/);
    if (m) {
      if (currentTitle !== null || currentBody.length) push();
      currentTitle = m[2].trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  push();

  if (!sections.length && raw.trim()) return [{ title: null, body: raw.trim() }];
  return sections;
}

export default function SectionedMarkdown({ markdown, content, lang = "fa", defaultTitle }) {
  const md = content ?? markdown ?? "";
  const sections = useMemo(() => splitByHeadings(md), [md]);

  if (!String(md).trim()) return <MarkdownBox markdown={""} lang={lang} />;

  if (sections.length === 1 && !sections[0].title) {
    return <MarkdownBox markdown={sections[0].body} lang={lang} />;
  }

  return (
    <div className="ccg-section-grid">
      {sections.map((sec, idx) => {
        const title =
          sec.title ||
          defaultTitle ||
          (lang === "fa" ? `بخش ${idx + 1}` : `Section ${idx + 1}`);
        return (
          <div key={idx} className="ccg-card p-4 sm:p-5">
            <div className="font-semibold mb-3">{title}</div>
            <MarkdownBox markdown={sec.body} lang={lang} />
          </div>
        );
      })}
    </div>
  );
}
