// client/src/components/ui/LazyMonacoDiff.jsx
import { DiffEditor } from "@monaco-editor/react";

export default function LazyMonacoDiff({ original, modified, language, theme = "vs-dark" }) {
  return (
    <DiffEditor
      height="260px"
      original={original ?? ""}
      modified={modified ?? ""}
      language={language}
      theme={theme}
      options={{
        readOnly: true,
        renderSideBySide: true,
        minimap: { enabled: false },
        wordWrap: "on",
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        automaticLayout: true,
      }}
    />
  );
}
