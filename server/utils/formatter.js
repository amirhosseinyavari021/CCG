// server/utils/formatter.js
export function formatAIResponse(output, error) {
  if (error) return { error };

  if (!output || typeof output !== "string") {
    return { error: "Empty AI output" };
  }

  const commandMatch = output.match(/```bash([\s\S]*?)```/i);
  const command = commandMatch ? commandMatch[1].trim() : null;

  let rest = output.replace(/```bash[\s\S]*?```/i, "").trim();

  let warnings = [];
  const warningMatch = rest.match(/Warning[s]?:([\s\S]*)/i);
  if (warningMatch) {
    warnings = warningMatch[1]
      .split("\n")
      .map(l => l.replace(/^[-•]/, "").trim())
      .filter(Boolean);

    rest = rest.replace(warningMatch[0], "").trim();
  }

  const explanation = rest || null;

  return {
    command,
    explanation,
    warnings,
  };
}
