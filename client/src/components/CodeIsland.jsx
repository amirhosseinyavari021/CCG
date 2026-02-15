// client/src/components/CodeIsland.jsx
import React from "react";

/**
 * CodeIsland: a hard LTR island for code/editors inside an RTL app.
 * This is the "forever fix" pattern: isolate bidi context.
 */
export default function CodeIsland({ children, className = "", style = {} }) {
  return (
    <div
      dir="ltr"
      lang="en"
      className={`code-island ${className}`}
      style={{
        direction: "ltr",
        textAlign: "left",
        unicodeBidi: "isolate", // <- key: isolate from RTL context
        ...style,
      }}
    >
      {children}
    </div>
  );
}
