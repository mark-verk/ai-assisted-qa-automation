#!/usr/bin/env node
/**
 * Constitution gate for tests/** and pages/**.
 * Exit 2 = block on introduced WON'T violations (see .cursor/rules/constitution.mdc).
 * Exit 0 = allow (or skip other paths).
 *
 * afterFileEdit matchers filter tool type (Write), not paths — path filter here.
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

function isScopedPath(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  return /(^|\/)tests\//.test(normalized) || /(^|\/)pages\//.test(normalized);
}

function stripComments(content) {
  return String(content || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function countExpect(content) {
  const matches = stripComments(content).match(/\bexpect\s*\(/g);
  return matches ? matches.length : 0;
}

/** Line-comment strip breaks strings like locator('//button') — block comments only here. */
function stripBlockComments(content) {
  return String(content || '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** @returns {Array<{ rule: string, detail: string }>} */
function findViolations(content, filePath) {
  const text = stripBlockComments(content);
  const hits = [];
  const normalized = String(filePath || '').replace(/\\/g, '/');
  const isTest = /(^|\/)tests\//.test(normalized);

  if (/\bpage\.waitForTimeout\s*\(/.test(text)) {
    hits.push({ rule: 'waitForTimeout', detail: 'page.waitForTimeout(...)' });
  }

  const xpathRe =
    /\.locator\s*\(\s*['"`]([^'"`]*\/\/[^'"`]*)['"`]/g;
  let m;
  while ((m = xpathRe.exec(text)) !== null) {
    hits.push({ rule: 'xpath', detail: `XPath locator: ${m[1].slice(0, 60)}` });
  }

  if (/:\s*any\b/.test(text) || /\bas\s+any\b/.test(text) || /<any>/.test(text)) {
    hits.push({ rule: 'any-type', detail: 'TypeScript any' });
  }

  const credRe =
    /(?:password|api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*['"][^'"]{4,}['"]/gi;
  if (credRe.test(text)) {
    hits.push({
      rule: 'hardcoded-credential',
      detail: 'Literal secret/password assignment',
    });
  }

  if (isTest && /\btest\.describe\s*\(\s*['"`]@/.test(text)) {
    hits.push({ rule: 'tag-on-describe', detail: "Tag on test.describe('@…')" });
  }

  return hits;
}

function violationKey(v) {
  return `${v.rule}|${v.detail}`;
}

function introducedViolations(oldContent, newContent) {
  const oldKeys = new Set(findViolations(oldContent, '').map(violationKey));
  return findViolations(newContent, '').filter((v) => !oldKeys.has(violationKey(v)));
}

function editWeakensAssertions(edit) {
  const oldString = edit.old_string ?? edit.oldString ?? '';
  const newString = edit.new_string ?? edit.newString ?? '';
  const before = countExpect(oldString);
  const after = countExpect(newString);
  return after < before ? { before, after } : null;
}

async function main() {
  const raw = await readStdin();
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    console.error('[constitution-gate] invalid JSON on stdin');
    process.exit(2);
  }

  const filePath = payload.file_path || payload.filePath || '';
  if (!isScopedPath(filePath)) {
    process.exit(0);
  }

  const prior =
    payload.old_content ??
    payload.oldContent ??
    payload.previous_content ??
    '';

  const edits = Array.isArray(payload.edits) ? payload.edits : [];
  const blockReasons = [];

  for (const edit of edits) {
    const oldString = edit.old_string ?? edit.oldString ?? '';
    const newString = edit.new_string ?? edit.newString ?? '';
    const weakened = editWeakensAssertions(edit);
    if (weakened) {
      blockReasons.push(
        `weakened expect( (${weakened.before} → ${weakened.after}) in patch`
      );
    }
    for (const v of introducedViolations(oldString, newString)) {
      blockReasons.push(`${v.rule}: ${v.detail} (in patch)`);
    }
  }

  let oldFull = typeof prior === 'string' ? prior : '';
  if (!oldFull && fs.existsSync(filePath)) {
    // No prior snapshot — only police patches above.
  }

  let newFull = '';
  if (fs.existsSync(filePath)) {
    newFull = fs.readFileSync(filePath, 'utf8');
  } else if (edits.length) {
    const last = edits[edits.length - 1];
    newFull = last.new_string ?? last.newString ?? '';
  }

  if (typeof prior === 'string' && newFull) {
    const before = countExpect(oldFull);
    const after = countExpect(newFull);
    if (after < before) {
      blockReasons.push(`weakened expect( (${before} → ${after}) in file`);
    }
    for (const v of introducedViolations(oldFull, newFull)) {
      blockReasons.push(`${v.rule}: ${v.detail}`);
    }
  } else if (newFull && !oldFull) {
    for (const v of findViolations(newFull, filePath)) {
      blockReasons.push(`${v.rule}: ${v.detail}`);
    }
    if (countExpect(newFull) === 0 && /(^|\/)tests\//.test(filePath.replace(/\\/g, '/'))) {
      // New test file with no expects — generation-gate also covers; skip duplicate here.
    }
  }

  const unique = [...new Set(blockReasons)];
  if (unique.length) {
    console.error(
      `[constitution-gate] BLOCK: ${filePath}\n  - ${unique.join('\n  - ')}\n` +
        `  See .cursor/rules/constitution.mdc (WON'T).`
    );
    process.exit(2);
  }

  console.error(`[constitution-gate] allow: ${filePath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(
    `[constitution-gate] error: ${err && err.message ? err.message : err}`
  );
  process.exit(2);
});
