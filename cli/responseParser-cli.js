/**
 * responseParser-cli.js
 *
 * - parseGenerateOutput(text, cli): parses LLM output in the exact format:
 *   command|||short_explanation|||warning_or_empty
 *   returns array of { command, explanation, warning }
 *
 * - validateScript(scriptText, cli): simple script validation for common patterns
 *
 * Goal: detect LLM format mistakes and help callApi decide to retry.
 */

function normalizeLines(text) {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

function removeNumbering(line) {
  return line.replace(/^\d+\.\s*/, '').replace(/^\d+\)\s*/, '').trim();
}

function parseGenerateOutput(text, cli = 'bash') {
  if (!text || typeof text !== 'string') return [];

  // Normalize newlines and trim
  const lines = normalizeLines(text);

  // Clean numbering
  const cleanedLines = lines.map(removeNumbering);

  // Candidate detection: lines containing delimiter
  const candidateLines = cleanedLines.filter(l => l.includes('|||'));

  // If exactly 3 candidate lines, prefer them. Otherwise, attempt heuristics.
  let useLines = [];
  if (candidateLines.length === 3) {
    useLines = candidateLines;
  } else {
    // If there are more than 3 cleaned lines, try to select the most likely 3:
    // - Prefer lines that contain pipes "|||" or look like commands (contain spaces, slashes, keywords)
    const likely = cleanedLines.filter(l => l.includes('|||') || /[\/\\]|[\w-]+\s+[\w-]+/.test(l));
    if (likely.length >= 3) {
      useLines = likely.slice(0, 3);
    } else {
      useLines = cleanedLines.slice(0, 3);
    }
  }

  const results = [];
  for (const line of useLines) {
    // If the line contains the delimiter, split; else attempt to heuristically split into 3 parts.
    let parts = [];
    if (line.includes('|||')) {
      parts = line.split('|||').map(p => p.trim());
    } else {
      // Heuristic: split by " - " or " -- " or " : " as fallback
      const splitBy = line.split(' - ');
      if (splitBy.length >= 2) {
        parts = [splitBy[0].trim(), splitBy.slice(1).join(' - ').trim(), ''];
      } else {
        // last resort: split into [command, explanation]
        const firstSpace = line.indexOf(' ');
        if (firstSpace > 0) {
          parts = [line.slice(0, firstSpace).trim(), line.slice(firstSpace + 1).trim(), ''];
        } else {
          parts = [line.trim(), '', ''];
        }
      }
    }

    const command = (parts[0] || '').replace(/^["'`]+|["'`]+$/g, '').trim();
    const explanation = parts[1] || '';
    const warning = (parts[2] || '').trim();

    results.push({
      command,
      explanation,
      warning
    });
  }

  // Only accept exactly 3 results with non-empty command strings
  if (results.length !== 3) return [];
  const validated = results.filter(item => item.command && item.command.length > 0);
  if (validated.length !== 3) return [];
  return results;
}

function validateScript(scriptText, cli = 'bash') {
  if (!scriptText || typeof scriptText !== 'string') return false;
  const trimmed = scriptText.trim();
  if (trimmed.length === 0) return false;
  const lower = trimmed.toLowerCase();

  if (cli && cli.toLowerCase().includes('bash')) {
    // Prefer shebang or presence of common commands; be permissive but catch empty/obviously wrong outputs
    if (trimmed.startsWith('#!')) return true;
    if (lower.includes('echo') || lower.includes('tar') || lower.includes('rsync') || lower.includes('find') || lower.includes('cp') || lower.includes('mv')) return true;
    // If script is multi-line and contains typical separators, accept
    if (trimmed.includes('\n')) return true;
    return false;
  }

  if (cli && cli.toLowerCase().includes('powershell')) {
    if (lower.includes('get-childitem') || lower.includes('get-process') || lower.includes('start-service') || lower.includes('write-host')) return true;
    if (trimmed.includes('\n')) return true;
    return false;
  }

  // default: accept non-empty multi-line or commands
  if (trimmed.length > 10) return true;
  return false;
}

module.exports = {
  parseGenerateOutput,
  validateScript
};