// client/src/components/ui/CopyButton.jsx
import { useState } from "react";

export default function CopyButton({ text, lang }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  }

  return (
    <button className="ccg-btn" type="button" onClick={copy} title={lang === "fa" ? "کپی" : "Copy"}>
      {copied ? (lang === "fa" ? "کپی شد" : "Copied") : (lang === "fa" ? "کپی" : "Copy")}
    </button>
  );
}
