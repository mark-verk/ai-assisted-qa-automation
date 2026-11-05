#!/usr/bin/env node
/**
 * Generation gate for Playwright specs under tests/**.
 * Exit 2 = block: no expect(, or CSS/XPath page.locator selectors.
 * Exit 0 = allow (or skip non-tests paths).
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

// Strip line and block comments so comment text cannot fake an assertion.
function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function hasExpect(content) {
  return /\bexpect\s*\(/.test(stripComments(content));
}

function hasCssOrXPathLocator(content) {
  const re = /page\.locator\s*\(\s*(['"`])([\s\S]*?)\1/g;
  let match;
  while ((match = re.exec(stripComments(content))) !== null) {
    const selector = match[2];
    if (selector.includes('.') || selector.includes('#') || selector.includes('//')) {
      return { blocked: true, selector };
    }
  }
  return { blocked: false };
}

async function main() {
  const raw = await readStdin();
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    console.error('[generation-gate] invalid JSON on stdin');
    process.exit(2);
  }

  const filePath = payload.file_path || payload.filePath || '';
  if (!isUnderTests(filePath)) {
    process.exit(0);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`[generation-gate] edited file missing: ${filePath}`);
    process.exit(2);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  if (!hasExpect(content)) {
    console.error(
      `[generation-gate] BLOCK: ${filePath} has no expect( — a test that asserts nothing`
    );
    process.exit(2);
  }

  const locator = hasCssOrXPathLocator(content);
  if (locator.blocked) {
    console.error(
      `[generation-gate] BLOCK: ${filePath} uses CSS/XPath page.locator (${JSON.stringify(locator.selector)}) — use role-based locators`
    );
    process.exit(2);
  }

  console.error(`[generation-gate] allow: ${filePath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`[generation-gate] error: ${err && err.message ? err.message : err}`);
  process.exit(2);
});
