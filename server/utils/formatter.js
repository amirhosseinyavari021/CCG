// server/utils/formatter.js

function pickSection(markdown, title) {
  // title like "Explanation", "Alternatives", "Warnings"
  const re = new RegExp(`^##\\s+${title}\\s*\\n([\\s\\S]*?)(?=^##\\s+|\\Z)`, "m");
  const m = markdown.match(re);
  return m ? m[1].trim() : "";
}

function extractFirstCodeBlock(markdown) {
  const re = /```(\w+)?\n([\s\S]*?)```/m;
  const m = markdown.match(re);
  if (!m) return { lang: "", code: "" };
  return { lang: (m[1] || "").trim(), code: (m[2] || "").trim() };
}

function linesToList(text) {
  if (!text) return [];
  // accept "- item" or "1. item"
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

export function formatAIResponse(output, error) {
  if (error) {
    return {
      ok: false,
      error,
      outputMarkdown: "",
      command: "",
      commandLang: "",
      explanation: "",
      alternatives: [],
      warnings: [],
    };
  }

  const outputMarkdown = String(output || "").trim();
  const { lang, code } = extractFirstCodeBlock(outputMarkdown);

  const explanation = pickSection(outputMarkdown, "Explanation") || "";
  const alternativesRaw = pickSection(outputMarkdown, "Alternatives") || "";
  const warningsRaw = pickSection(outputMarkdown, "Warnings") || "";

  return {
    ok: true,
    error: null,
    outputMarkdown,
    command: code,
    commandLang: lang,
    explanation,
    alternatives: linesToList(alternativesRaw),
    warnings: linesToList(warningsRaw),
  };
}
