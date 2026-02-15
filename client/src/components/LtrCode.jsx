// client/src/components/LtrCode.jsx
import React from "react";

/**
 * Wrap ANY code editor / code preview with this component.
 * It forces LTR regardless of the page/app direction (RTL/LTR).
 *
 * Usage:
 * <LtrCode>
 *   <YourEditor ... />
 * </LtrCode>
 *
 * Or for textarea:
 * <LtrCode>
 *   <textarea ... />
 * </LtrCode>
 */
export default function LtrCode({ children, className = "", style = {} }) {
  return (
    <div
      dir="ltr"
      className={`ltr-code ${className}`}
      style={{
        direction: "ltr",
        textAlign: "left",
        unicodeBidi: "plaintext",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
