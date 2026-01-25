import SectionedMarkdown from "./SectionedMarkdown";

/**
 * Compatibility wrapper used by some pages.
 * TDZ-safe pass-through.
 */
export default function MarkdownView({ markdown, content, lang = "fa" }) {
  return <SectionedMarkdown markdown={markdown} content={content} lang={lang} />;
}
