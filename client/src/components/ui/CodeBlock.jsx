// client/src/components/ui/CodeBlock.jsx
import { useState } from 'react';

export default function CodeBlock({ code, language = 'bash' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative bg-slate-900 rounded-lg overflow-hidden">
      <div className="flex justify-between items-center bg-slate-800 px-4 py-2 text-xs text-slate-400">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-white transition"
        >
          {copied ? '✓ کپی شد' : 'کپی'}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto">
        <code className="text-green-400">{code}</code>
      </pre>
    </div>
  );
}
