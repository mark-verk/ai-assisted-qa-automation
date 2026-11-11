#!/usr/bin/env node
/**
 * After agent/orchestrator stop: refresh eval-report.md (best-effort, non-blocking).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/generate-eval-report.mjs');

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
  await readStdin();
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 300_000,
  });
  if (result.stderr) {
    console.error('[run-eval-report]', result.stderr.slice(0, 500));
  }
  process.exit(0);
}

main().catch(() => process.exit(0));
