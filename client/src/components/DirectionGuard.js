// client/src/components/DirectionGuard.jsx
import React, { useEffect, useRef } from "react";

/**
 * DirectionGuard
 * Forces LTR direction for code/editor areas, even if the app switches to RTL.
 *
 * Why this exists:
 * - Some editors or parent layout changes (dir=rtl) can flip direction AFTER render.
 * - CSS might not win if editor injects inline styles or re-renders internals.
 *
 * How it works:
 * - Applies dir="ltr" and inline styles on the container
 * - Injects a <style> tag with !important rules
 * - Observes DOM mutations and re-applies enforcement if anything flips
 *
 * Usage:
 * <DirectionGuard>
 *   <YourEditor .../>
 * </DirectionGuard>
 *
 * Optional:
 * <DirectionGuard scopeId="ccg-editor-scope"> ... </DirectionGuard>
 */
export default function DirectionGuard({
  children,
  className = "",
  style = {},
  scopeId = "ccg-ltr-scope",
}) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // 1) Force container direction
    const enforceOn = (el) => {
      if (!el) return;

      // dir attribute is important
      el.setAttribute("dir", "ltr");

      // inline styles (some editors override CSS)
      el.style.direction = "ltr";
      el.style.textAlign = "left";
      el.style.unicodeBidi = "plaintext";
    };

    enforceOn(root);

    // 2) Inject strong CSS once per scopeId
    const styleId = `${scopeId}-style`;
    if (!document.getElementById(styleId)) {
      const tag = document.createElement("style");
      tag.id = styleId;
      tag.textContent = `
        /* ===== DirectionGuard: force LTR in this scope ===== */
        #${scopeId}, #${scopeId} * {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: plaintext !important;
        }

        /* Common editor roots */
        #${scopeId} textarea,
        #${scopeId} input {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: plaintext !important;
        }

        #${scopeId} pre,
        #${scopeId} code {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: plaintext !important;
        }

        /* Monaco */
        #${scopeId} .monaco-editor,
        #${scopeId} .monaco-editor * {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: plaintext !important;
        }

        /* CodeMirror 6 */
        #${scopeId} .cm-editor,
        #${scopeId} .cm-editor *,
        #${scopeId} .cm-scroller {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: plaintext !important;
        }

        /* CodeMirror 5 */
        #${scopeId} .CodeMirror,
        #${scopeId} .CodeMirror * {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: plaintext !important;
        }
      `;
      document.head.appendChild(tag);
    }

    // 3) MutationObserver: if anything flips direction later, re-enforce
    const observer = new MutationObserver((mutations) => {
      // If any attribute/style/class changes happen, reapply enforcement
      for (const m of mutations) {
        if (
          m.type === "attributes" &&
          (m.attributeName === "dir" ||
            m.attributeName === "style" ||
            m.attributeName === "class")
        ) {
          enforceOn(root);
          break;
        }
        if (m.type === "childList") {
          enforceOn(root);
          // also enforce on newly added elements quickly
          m.addedNodes.forEach((n) => {
            if (n && n.nodeType === 1) enforceOn(n);
          });
          break;
        }
      }
    });

    observer.observe(root, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["dir", "style", "class"],
    });

    return () => observer.disconnect();
  }, [scopeId]);

  return (
    <div
      id={scopeId}
      ref={ref}
      dir="ltr"
      className={className}
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
