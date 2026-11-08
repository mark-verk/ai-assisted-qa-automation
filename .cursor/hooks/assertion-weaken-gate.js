#!/usr/bin/env node
/**
 * Assertion-weaken gate for Playwright specs under tests/**.
 * Exit 2 = block: edit removed or commented out one or more expect( calls.
 * Exit 0 = allow (or skip non-tests paths / non-weakening edits).
 *
 * Path filter is in-script: afterFileEdit matchers run against the tool type
 * (Write), not the file path — see Cursor hooks docs.
 */
const fs = require('fs');

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);
  });
}

function isUnderTests(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  return /(^|\/)tests\//.test(normalized);
}

/** Strip line and block comments so commented-out expect( no longer counts. */
function stripComments(content) {
  return String(content || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function countExpect(content) {
  const matches = stripComments(content).match(/\bexpect\s*\(/g);
  return matches ? matches.length : 0;
}

function editWeakensAssertions(edit) {
  const oldString = edit.old_string ?? edit.oldString ?? '';
  const newString = edit.new_string ?? edit.newString ?? '';
  const before = countExpect(oldString);
  const after = countExpect(newString);
  if (after < before) {
    return { weakened: true, before, after, kind: 'fewer_or_commented_out' };
  }
  return { weakened: false, before, after };
}

async function main() {
  const raw = await readStdin();
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    console.error('[assertion-weaken-gate] invalid JSON on stdin');
    process.exit(2);
  }

  const filePath = payload.file_path || payload.filePath || '';
  if (!isUnderTests(filePath)) {
    process.exit(0);
  }

  const edits = Array.isArray(payload.edits) ? payload.edits : [];
  for (const edit of edits) {
    const result = editWeakensAssertions(edit);
    if (result.weakened) {
      console.error(
        `[assertion-weaken-gate] BLOCK: ${filePath} weakened assertions ` +
          `(expect( count ${result.before} → ${result.after}). ` +
          `Refuse deleting or commenting out expect(; fix the locator/wait or report the bug.`
      );
      process.exit(2);
    }
  }

  // Full-file Write may omit useful edit hunks — compare prior content if present.
  const prior =
    payload.old_content ?? payload.oldContent ?? payload.previous_content ?? null;
  if (typeof prior === 'string' && fs.existsSync(filePath)) {
    const next = fs.readFileSync(filePath, 'utf8');
    const before = countExpect(prior);
    const after = countExpect(next);
    if (after < before) {
      console.error(
        `[assertion-weaken-gate] BLOCK: ${filePath} weakened assertions ` +
          `(expect( count ${before} → ${after}). ` +
          `Refuse deleting or commenting out expect(; fix the locator/wait or report the bug.`
      );
      process.exit(2);
    }
  }

  console.error(`[assertion-weaken-gate] allow: ${filePath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(
    `[assertion-weaken-gate] error: ${err && err.message ? err.message : err}`
  );
  process.exit(2);
});
