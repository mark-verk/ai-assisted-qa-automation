#!/usr/bin/env node
/**
 * Records AskQuestion (ask) events for eval-report ask-vs-guess.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const TELEMETRY = path.join(ROOT, '.cursor/eval/telemetry.jsonl');

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const raw = await readStdin();
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    process.exit(0);
  }

  const toolName =
    payload.tool_name ||
    payload.toolName ||
    payload.tool ||
    payload.name ||
    '';
  if (!/AskQuestion/i.test(toolName)) {
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(TELEMETRY), { recursive: true });
  const line = JSON.stringify({
    type: 'ask',
    at: new Date().toISOString(),
    tool: toolName,
    session_id: payload.session_id || payload.conversation_id || null,
  });
  fs.appendFileSync(TELEMETRY, `${line}\n`, 'utf8');
  process.exit(0);
}

main().catch(() => process.exit(0));
