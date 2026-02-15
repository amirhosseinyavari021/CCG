// client/src/components/ui/MarkdownView.jsx
import SectionedMarkdown from "./SectionedMarkdown";

/**
 * Compatibility wrapper used by pages.
 * - Accepts md / markdown / content
 * - Always passes BOTH markdown & content
 * - Forces rerender by key to avoid stale UI
 */
export default function MarkdownView(props) {
  const lang = props?.lang || "fa";
  const md = (props?.markdown ?? props?.content ?? props?.md ?? "")?.toString?.() ?? "";
  return <SectionedMarkdown key={md} markdown={md} content={md} lang={lang} />;
}
