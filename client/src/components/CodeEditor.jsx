// client/src/components/CodeEditor.jsx
import React, { useMemo } from "react";

/**
 * CodeEditor (LTR-forced)
 * - UI can be RTL, but code editor must ALWAYS be LTR.
 * - Works for:
 *   1) textarea (default)
 *   2) any custom editor component passed via `renderEditor`
 *
 * Usage (textarea):
 * <CodeEditor value={code} onChange={setCode} />
 *
 * Usage (Monaco/CodeMirror/etc):
 * <CodeEditor
 *   value={code}
 *   onChange={setCode}
 *   renderEditor={({ value, onChange }) => (
 *     <MyMonaco value={value} onChange={onChange} />
 *   )}
 * />
 */
export default function CodeEditor({
  value,
  onChange,
  placeholder = "Write code here…",
  rows = 12,
  className = "",
  style = {},
  renderEditor = null, // optional custom editor renderer
  disabled = false,
}) {
  const containerStyle = useMemo(
    () => ({
      direction: "ltr",
      textAlign: "left",
      unicodeBidi: "plaintext", // very important for bidi correctness
      ...style,
    }),
    [style]
  );

  const baseBoxStyle = useMemo(
    () => ({
      width: "100%",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.25)",
      padding: 12,
      color: "white",
      outline: "none",
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.6,
    }),
    []
  );

  return (
    <div
      // 🔒 Force LTR at the container level so it never follows page RTL
      dir="ltr"
      className={className}
      style={containerStyle}
    >
      {/* Optional label area / header can stay out of this component if you want */}

      {typeof renderEditor === "function" ? (
        // ✅ If you render Monaco/CodeMirror/etc, it will be inside an LTR container.
        <div
          dir="ltr"
          style={{
            direction: "ltr",
            textAlign: "left",
            unicodeBidi: "plaintext",
          }}
        >
          {renderEditor({ value, onChange, disabled })}
        </div>
      ) : (
        // ✅ Default: textarea editor (always LTR)
        <textarea
          dir="ltr"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="code-editor-textarea"
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          style={{
            ...baseBoxStyle,
            resize: "vertical",
            direction: "ltr",
            textAlign: "left",
            unicodeBidi: "plaintext",
            // Prevent RTL inheritance from parents in weird cases
            writingMode: "horizontal-tb",
            ...(disabled ? { opacity: 0.65, cursor: "not-allowed" } : {}),
          }}
        />
      )}
    </div>
  );
}
