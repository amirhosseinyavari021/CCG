import ReactMarkdown from "react-markdown";

export default function MarkdownRenderer({ content }) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");
