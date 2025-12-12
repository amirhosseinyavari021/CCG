// client/src/utils/formatter.js

export function parseAIResponse(output) {
  const parts = output.split('|||');
  const explanation = parts[0]?.trim() || '';
  const command = parts[1]?.trim() || '';
  const suggestions = parts[2]?.trim() || '';

  return {
    explanation,
    command,
    suggestions,
    html: `
      <div class="explanation mb-4">
        <h4 class="font-medium text-amber-300 mb-2">💡 توضیح:</h4>
        <p class="text-slate-300">${explanation}</p>
      </div>
      <div class="command mb-4">
        <h4 class="font-medium text-blue-300 mb-2">💻 دستور:</h4>
        <pre class="bg-slate-900 p-3 rounded text-green-400 text-sm overflow-x-auto"><code>${command}</code></pre>
      </div>
      <div class="suggestions">
        <h4 class="font-medium text-green-300 mb-2">✨ پیشنهادات:</h4>
        <p class="text-slate-300">${suggestions}</p>
      </div>
    `
  };
}
