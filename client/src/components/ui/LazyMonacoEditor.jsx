// client/src/components/ui/LazyMonacoEditor.jsx
import Editor from "@monaco-editor/react";

export default function LazyMonacoEditor({ value, onChange, language, theme = "vs-dark" }) {
  return (
    <Editor
      height="320px"
      language={language}
      theme={theme}
      value={value ?? ""}
      onChange={(v) => onChange?.(v ?? "")}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: "on",
        wordWrap: "on",
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        renderWhitespace: "selection",
        bracketPairColorization: { enabled: true },
        padding: { top: 10, bottom: 10 },
        automaticLayout: true,
      }}
    />
  );
}
