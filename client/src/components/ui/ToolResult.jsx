// CCG_PATCH_STABILIZE_WEB_003
import MarkdownBox from "./MarkdownBox";

export default function ToolResult({ tool, lang = "fa" }) {
  if (!tool || typeof tool !== "object") return null;

  const primary = tool.primary || tool.tool || tool;

  const command =
    primary.command ||
    primary.cmd ||
    tool.command ||
    tool.cmd ||
    "";

  const python =
    primary.python ||
    tool.python ||
    "";

  const explanation =
    tool.explanation ||
    primary.explanation ||
    "";

  return (
    <div className="space-y-4">
      {command ? (
        <div className="ccg-codeblock">
          <div className="ccg-codeblock-head">
            <div className="ccg-codeblock-title">command</div>
          </div>
          <pre className="ccg-pre">
            <code dir="ltr">{command}</code>
          </pre>
        </div>
      ) : null}

      {python ? (
        <div className="ccg-codeblock">
          <div className="ccg-codeblock-head">
            <div className="ccg-codeblock-title">python</div>
          </div>
          <pre className="ccg-pre">
            <code dir="ltr">{python}</code>
          </pre>
        </div>
      ) : null}

      {explanation ? (
        <div className="ccg-card p-4 sm:p-5">
          <MarkdownBox markdown={String(explanation)} lang={lang} />
        </div>
      ) : null}
    </div>
  );
}
