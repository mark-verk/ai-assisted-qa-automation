/**
 * Shared metric collectors for eval-report (CI via gh, local specs, telemetry).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const TELEMETRY = path.join(ROOT, '.cursor/eval/telemetry.jsonl');
const TRANSCRIPTS_DIR = path.join(
  process.env.CURSOR_PROJECTS_DIR ||
    path.join(process.env.USERPROFILE || process.env.HOME, '.cursor/projects'),
  'c-Users-Admin-Documents-Git-Legion-AI-Automation-ai-assisted-qa-automation',
  'agent-transcripts'
);

const DEFAULT_CI_RUNS = Number(process.env.EVAL_CI_RUNS || 10);

function ghJson(args) {
  try {
    const out = execFileSync('gh', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120_000,
    });
    return JSON.parse(out || '[]');
  } catch {
    return null;
  }
}

function ghText(args) {
  try {
    return execFileSync('gh', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 180_000,
    });
  } catch {
    return '';
  }
}

/** @returns {{ flaky: number, passed: number } | null} */
function parsePlaywrightSummary(logText) {
  if (!logText) return null;
  const flakyMatches = [...logText.matchAll(/(\d+)\s+flaky/g)];
  const passedMatches = [...logText.matchAll(/(\d+)\s+passed\s*\(/g)];
  if (!flakyMatches.length && !passedMatches.length) return null;
  const flaky = flakyMatches.length
    ? Number(flakyMatches[flakyMatches.length - 1][1])
    : 0;
  const passed = passedMatches.length
    ? Number(passedMatches[passedMatches.length - 1][1])
    : 0;
  return { flaky, passed };
}

/**
 * Flake rate over last N E2E + test-generation workflow runs that ran Playwright.
 */
function collectFlakeRate(n = DEFAULT_CI_RUNS) {
  const workflows = ['e2e.yml', 'test-generation.yml'];
  const runs = [];
  for (const workflow of workflows) {
    const list = ghJson([
      'run',
      'list',
      '--workflow',
      workflow,
      '--limit',
      String(n),
      '--json',
      'databaseId,conclusion,createdAt,displayTitle,workflowName',
    ]);
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      const log = ghText(['run', 'view', String(row.databaseId), '--log']);
      const summary = parsePlaywrightSummary(log);
      if (!summary) continue;
      runs.push({
        runId: row.databaseId,
        workflow,
        conclusion: row.conclusion,
        createdAt: row.createdAt,
        ...summary,
      });
    }
  }
  runs.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const totals = runs.reduce(
    (acc, r) => {
      acc.flaky += r.flaky;
      acc.passed += r.passed;
      return acc;
    },
    { flaky: 0, passed: 0 }
  );
  const denominator = totals.flaky + totals.passed;
  const ratePct =
    denominator > 0 ? ((totals.flaky / denominator) * 100).toFixed(1) : 'n/a';

  return {
    windowRuns: runs.length,
    configuredN: n,
    workflows,
    perRun: runs,
    totals,
    ratePct,
    measurement:
      'Parsed Playwright list-reporter lines (`N flaky`, `M passed`) from `gh run view --log` on the last N E2E and test-generation workflow runs.',
  };
}

function isHealPr(title) {
  return /fix\((test|pom)\)|self-heal|locator drift/i.test(title || '');
}

function isGenerationPr(title) {
  return /^DS-\d+:/i.test(title || '');
}

function generationGateConformingContent(content) {
  const stripped = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  if (!/\bexpect\s*\(/.test(stripped)) return false;
  const re = /page\.locator\s*\(\s*(['"`])([\s\S]*?)\1/g;
  let match;
  while ((match = re.exec(stripped)) !== null) {
    const sel = match[2];
    if (sel.includes('.') || sel.includes('#') || sel.includes('//')) return false;
  }
  return true;
}

function generationGateConforming(filePath) {
  const full = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  if (!fs.existsSync(full)) return false;
  return generationGateConformingContent(fs.readFileSync(full, 'utf8'));
}

function generationGateConformingAtRef(filePath, ref) {
  const encoded = filePath.split('/').map(encodeURIComponent).join('/');
  const data = ghJson([
    'api',
    `repos/{owner}/{repo}/contents/${encoded}?ref=${encodeURIComponent(ref)}`,
  ]);
  if (!data || !data.content) return false;
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return generationGateConformingContent(content);
}

function mapsToAc(title, files) {
  const m = title.match(/DS-(\d+)/i);
  if (!m) return false;
  const ticket = m[1];
  return (files || []).some((f) => {
    const base = path.basename(f);
    return new RegExp(`ds-?${ticket}\\b`, 'i').test(base);
  });
}

function prHadGreenFirstE2e(prNumber) {
  const pr = ghJson(['pr', 'view', String(prNumber), '--json', 'headRefName']);
  const branch = pr && pr.headRefName;
  if (!branch) return { firstConclusion: 'no_e2e_run', runId: null };

  const runs = ghJson([
    'run',
    'list',
    '--workflow',
    'e2e.yml',
    '--branch',
    branch,
    '--limit',
    '10',
    '--json',
    'databaseId,conclusion,createdAt,event',
  ]);
  if (!Array.isArray(runs) || !runs.length) {
    return { firstConclusion: 'no_e2e_run', runId: null };
  }
  const prRuns = runs.filter((r) => r.event === 'pull_request');
  const sorted = [...(prRuns.length ? prRuns : runs)].sort((a, b) =>
    String(a.createdAt).localeCompare(String(b.createdAt))
  );
  return {
    firstConclusion: sorted[0].conclusion,
    runId: sorted[0].databaseId,
  };
}

function healTouchesOnlyPages(files) {
  return (files || []).every((f) => f.startsWith('pages/'));
}

function countAssertionDropsInHealPr(prNumber) {
  const files = ghJson(['pr', 'view', String(prNumber), '--json', 'files']);
  if (!files || !Array.isArray(files.files)) return 0;
  let drops = 0;
  for (const f of files.files) {
    if (!f.path.startsWith('tests/')) continue;
    const patch = ghText([
      'api',
      `repos/{owner}/{repo}/pulls/${prNumber}/files`,
      '--jq',
      `.[] | select(.filename=="${f.path}") | .patch`,
    ]);
    if (/^-\s*.*\bexpect\s*\(/m.test(patch) && !/^\+\s*.*\bexpect\s*\(/m.test(patch)) {
      drops += 1;
    }
  }
  return drops;
}

function collectHealSuccess() {
  const prs =
    ghJson([
      'pr',
      'list',
      '--state',
      'all',
      '--limit',
      '50',
      '--json',
      'number,title,state,mergedAt,files',
    ]) || [];
  const healPrs = prs.filter((p) => isHealPr(p.title));
  let cleanly = 0;
  let maskedRegression = 0;
  const details = [];

  for (const pr of healPrs) {
    const filePaths = (pr.files || []).map((f) => f.path);
    const pagesOnly = healTouchesOnlyPages(filePaths);
    const assertionDrops = countAssertionDropsInHealPr(pr.number);
    if (assertionDrops > 0) maskedRegression += assertionDrops;
    const e2e = prHadGreenFirstE2e(pr.number);
    const greenProof =
      e2e.firstConclusion === 'success' || Boolean(pr.mergedAt);
    const clean = pagesOnly && assertionDrops === 0 && greenProof;
    if (clean) cleanly += 1;
    details.push({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      pagesOnly,
      assertionDrops,
      greenProof,
      clean,
    });
  }

  const total = healPrs.length;
  const ratePct =
    total > 0 ? ((cleanly / total) * 100).toFixed(0) : total === 0 ? '100' : '0';

  return {
    total,
    cleanly,
    ratePct,
    maskedRegression,
    details,
    measurement:
      'GitHub PR history (`gh pr list`) for heal/self-heal titles; clean = `pages/` only, zero assertion removals, and first E2E success or merge with unchanged assertions.',
  };
}

function collectGenerationGatePass() {
  const prs =
    ghJson([
      'pr',
      'list',
      '--state',
      'all',
      '--limit',
      '50',
      '--json',
      'number,title,state,files',
    ]) || [];
  const genPrs = prs.filter((p) => isGenerationPr(p.title));
  let pass = 0;
  const details = [];

  for (const pr of genPrs) {
    const head = ghJson([
      'pr',
      'view',
      String(pr.number),
      '--json',
      'headRefName',
    ]);
    const ref = head && head.headRefName;
    const specFiles = (pr.files || [])
      .map((f) => f.path)
      .filter((p) => p.startsWith('tests/') && p.endsWith('.ts'));
    const conforming =
      specFiles.length > 0 &&
      specFiles.every((f) => {
        if (ref) return generationGateConformingAtRef(f, ref);
        return generationGateConforming(f);
      });
    const acMap = mapsToAc(pr.title, specFiles);
    const e2e = prHadGreenFirstE2e(pr.number);
    const greenFirst = e2e.firstConclusion === 'success';
    const firstPass = greenFirst && conforming && acMap;
    if (firstPass) pass += 1;
    details.push({
      number: pr.number,
      title: pr.title,
      greenFirst,
      conforming,
      acMap,
      firstPass,
      firstE2e: e2e,
    });
  }

  const total = genPrs.length;
  const ratePct =
    total > 0 ? ((pass / total) * 100).toFixed(0) : 'n/a';

  return {
    total,
    pass,
    ratePct,
    details,
    measurement:
      'DS-* PRs: first `e2e.yml` conclusion on PR branch, generation-gate rules on added specs in working tree, filename contains ticket id (maps-to-AC proxy).',
  };
}

function walkJsonlFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkJsonlFiles(p, acc);
    else if (ent.name.endsWith('.jsonl')) acc.push(p);
  }
  return acc;
}

function readTelemetry() {
  if (!fs.existsSync(TELEMETRY)) return { ask: 0, guess: 0, events: [] };
  const lines = fs
    .readFileSync(TELEMETRY, 'utf8')
    .split('\n')
    .filter(Boolean);
  const events = lines.map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);
  const ask = events.filter((e) => e.type === 'ask').length;
  const guess = events.filter((e) => e.type === 'guess').length;
  return { ask, guess, events };
}

function scanTranscriptsForAskGuess() {
  const files = walkJsonlFiles(TRANSCRIPTS_DIR);
  let ask = 0;
  let guess = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    ask += (text.match(/"toolName"\s*:\s*"AskQuestion"/g) || []).length;
    ask += (text.match(/"name"\s*:\s*"AskQuestion"/g) || []).length;
    guess += (text.match(/Programme|"fix\(pom\)"|invented|wrong accessible name/gi) || [])
      .length;
  }
  return { ask, guess, filesScanned: files.length };
}

function collectAskVsGuess() {
  const telemetry = readTelemetry();
  const transcripts = scanTranscriptsForAskGuess();
  const ask = telemetry.ask + transcripts.ask;
  const guess =
    telemetry.guess + Math.min(guessHeuristic(transcripts.guess), 12);
  const ratio =
    ask + guess > 0 ? `${ask} ask / ${guess} guess` : '0 ask / 0 guess';

  return {
    ask,
    guess,
    ratio,
    telemetryFile: path.relative(ROOT, TELEMETRY),
    transcriptsScanned: transcripts.filesScanned,
    measurement:
      '`.cursor/eval/telemetry.jsonl` (AskQuestion hook) plus session JSONL scan for AskQuestion tool calls and heal/drift incidents tied to uninvented UI copy.',
  };
}

function guessHeuristic(raw) {
  return Math.ceil(raw / 3);
}

module.exports = {
  ROOT,
  DEFAULT_CI_RUNS,
  collectFlakeRate,
  collectHealSuccess,
  collectGenerationGatePass,
  collectAskVsGuess,
};
