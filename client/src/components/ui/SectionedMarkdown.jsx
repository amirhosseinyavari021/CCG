// client/src/components/ui/SectionedMarkdown.jsx
import { useMemo } from "react";
import MarkdownBox from "./MarkdownBox";

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
    // فقط ## تا ###### برای بخش‌ها
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
  const isFa = lang !== "en";

  if (!String(md).trim()) return <MarkdownBox content={""} lang={lang} />;

  // بدون heading => یک کارت
  if (sections.length === 1 && !sections[0].title) {
    const title =
      defaultTitle || (isFa ? "خروجی" : "Output");
    return (
      <div className="ccg-section-grid">
        <div className="ccg-card p-4 sm:p-5">
          <div className="font-semibold mb-3">{title}</div>
          <MarkdownBox content={sections[0].body} lang={lang} />
        </div>
      </div>
    );
  }

  return (
    <div className="ccg-section-grid">
      {sections.map((sec, idx) => {
        const title =
          sec.title ||
          defaultTitle ||
          (isFa ? `بخش ${idx + 1}` : `Section ${idx + 1}`);

        return (
          <div key={idx} className="ccg-card p-4 sm:p-5">
            <div className="font-semibold mb-3">{title}</div>
            <MarkdownBox content={sec.body} lang={lang} />
          </div>
        );
      })}
    </div>
  );
}
