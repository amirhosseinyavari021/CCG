// client/src/components/ui/SectionedMarkdown.jsx
import { useMemo } from "react";
import MarkdownBox from "./MarkdownBox";

/**
 * Split markdown into sections by headings (##..######),
 * BUT do not treat headings inside fenced code blocks as section boundaries.
 */
function splitByHeadings(md) {
  const raw = String(md || "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");

  const sections = [];
  let currentTitle = null;
  let currentBody = [];

  let inFence = false;

  function push() {
    const body = currentBody.join("\n").trim();
    if (!currentTitle && !body) return;
    sections.push({ title: currentTitle, body });
  }

  for (const line of lines) {
    const trimmed = String(line || "");

    // Track fenced code blocks: ```lang
    if (/^\s*```/.test(trimmed)) {
      inFence = !inFence;
      currentBody.push(line);
      continue;
    }

    // Only split on headings when NOT inside a fenced block
    if (!inFence) {
      const m = trimmed.match(/^(#{2,6})\s+(.+)\s*$/);
      if (m) {
        if (currentTitle !== null || currentBody.length) push();
        currentTitle = m[2].trim();
        currentBody = [];
        continue;
      }
    }

    currentBody.push(line);
  }

  push();

  if (!sections.length && raw.trim()) return [{ title: null, body: raw.trim() }];
  return sections;
}

function isFinalCodeSectionTitle(title, lang) {
  const t = String(title || "").trim();
  if (!t) return false;

  // English
  if (lang === "en") {
    return /(final\s+merged\s+code|merged\s+code|final\s+code)/i.test(t);
  }

  // Persian (support variants)
  return (
    /کد\s*Merge\s*نهایی/i.test(t) ||
    /کد\s*مرج\s*نهایی/i.test(t) ||
    /کد\s*ادغام\s*نهایی/i.test(t) ||
    /کد\s*نهایی/i.test(t)
  );
}

function hasFencedCode(md) {
  const t = String(md || "");
  return /```[\s\S]*?```/m.test(t);
}

export default function SectionedMarkdown({ markdown, content, lang = "fa", defaultTitle }) {
  const md = content ?? markdown ?? "";
  const sections = useMemo(() => splitByHeadings(md), [md]);
  const isFa = lang !== "en";

  if (!String(md).trim()) return <MarkdownBox content={""} lang={lang} />;

  // If there is no heading at all, still allow code blocks if body contains fences.
  if (sections.length === 1 && !sections[0].title) {
    const title = defaultTitle || (isFa ? "خروجی" : "Output");
    const allowCodeBlocks = hasFencedCode(sections[0].body);

    return (
      <div className="ccg-section-grid ccg-markdown">
        <div className="ccg-card p-4 sm:p-5">
          <div className="font-semibold mb-3">{title}</div>
          <MarkdownBox content={sections[0].body} lang={lang} allowCodeBlocks={allowCodeBlocks} />
        </div>
      </div>
    );
  }

  return (
    <div className="ccg-section-grid ccg-markdown">
      {sections.map((sec, idx) => {
        const title = sec.title || defaultTitle || (isFa ? `بخش ${idx + 1}` : `Section ${idx + 1}`);

        // ✅ allow code blocks if:
        // 1) This is the final merge code section by title
        // 2) OR the body actually contains a fenced code block (robust against title mismatch)
        const allowCodeBlocks =
          isFinalCodeSectionTitle(title, lang) || hasFencedCode(sec.body);

        return (
          <div key={idx} className="ccg-card p-4 sm:p-5">
            <div className="font-semibold mb-3">{title}</div>
            <MarkdownBox content={sec.body} lang={lang} allowCodeBlocks={allowCodeBlocks} />
          </div>
        );
      })}
    </div>
  );
}
