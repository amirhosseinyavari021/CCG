// server/utils/formatter.js

export function formatAIResponse(output, error) {
  return {
    output: output || "",
    error: error || null
  };
}
