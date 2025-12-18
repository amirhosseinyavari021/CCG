import ReactMarkdown from "react-markdown";

export default function MarkdownView({ content }) {
  if (!content) return null;

  return (
    <div className="prose prose-invert max-w-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
