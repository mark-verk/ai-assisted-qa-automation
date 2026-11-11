#!/usr/bin/env node
/**
 * Writes eval-report.md — suite reliability snapshot.
 * Run after test-generation CI or local orchestrator (see hooks + npm script).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  ROOT,
  collectFlakeRate,
  collectHealSuccess,
  collectGenerationGatePass,
  collectAskVsGuess,
} = require('./lib/eval-metrics.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isoNow() {
  return new Date().toISOString();
}

function topRisk(flake, heal, generation) {
  if (Number(heal.maskedRegression) > 0) {
    return {
      risk: 'Assertion weakening during heal passes',
      action:
        'Stop merges on heal PRs until triage proves POM-only diffs and assertion-weaken-gate stays green.',
    };
  }
  if (generation.total > 0 && generation.pass / generation.total < 0.5) {
    return {
      risk: 'Generated specs rarely green + conforming on first PR',
      action:
        'Require Playwright MCP crawl evidence in test-writer handoff before opening DS-* PRs.',
    };
  }
  if (flake.totals.flaky > 0 && Number(flake.ratePct) >= 10) {
    return {
      risk: 'CI retry budget masking intermittent UI/timing failures',
      action:
        'Tighten web-first waits in failing specs (see latest flaky traces) and track per-spec flake in the next report window.',
    };
  }
  return {
    risk: 'Main-branch E2E instability outside heal coverage',
    action:
      'Triage the latest red `e2e.yml` run on main before merging open DS/heal PRs.',
  };
}

function repoSlug() {
  try {
    const require = createRequire(import.meta.url);
    const { execFileSync } = require('child_process');
    const out = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return JSON.parse(out).nameWithOwner;
  } catch {
    return 'OWNER/REPO';
  }
}

function renderReport({ flake, heal, generation, askGuess, generatedAt }) {
  const risk = topRisk(flake, heal, generation);
  const slug = repoSlug();

  return `# Suite reliability eval report

_Generated: ${generatedAt}_  
_Regenerate: \`npm run eval:report\` (local) or after \`test-generation.yml\` / agent \`stop\` hook._

## Flake rate

| Metric | Value |
|--------|-------|
| **Rate** | **${flake.ratePct}%** (${flake.totals.flaky} flaky / ${flake.totals.flaky + flake.totals.passed} executed outcomes) |
| **Window** | Last **${flake.windowRuns}** Playwright CI runs (${flake.configuredN} per workflow max, e2e + test-generation) |

**How measured:** ${flake.measurement}

**What it tells us:** ${Number(flake.ratePct) >= 10 ? 'Retries are carrying a double-digit share of outcomes — investigate flaky specs before adding coverage.' : 'Flakes are present but not dominating the retry budget yet.'}

<details>
<summary>Per-run flake breakdown</summary>

| Run | Workflow | Conclusion | Flaky | Passed |
|-----|----------|------------|-------|--------|
${flake.perRun
  .map(
    (r) =>
      `| [${r.runId}](https://github.com/${slug}/actions/runs/${r.runId}) | ${r.workflow} | ${r.conclusion} | ${r.flaky} | ${r.passed} |`
  )
  .join('\n')}

</details>

## Heal success rate

| Metric | Value |
|--------|-------|
| **Clean heals** | **${heal.cleanly} / ${heal.total}** (${heal.ratePct}%) |
| **Masked regressions** | **${heal.maskedRegression}** (must stay **0**) |

**How measured:** ${heal.measurement}

**What it tells us:** ${heal.maskedRegression === 0 ? 'No heal PRs removed assertions to go green — locator-only policy is holding.' : 'At least one heal weakened assertions; treat as incident.'}

<details>
<summary>Heal PR detail</summary>

| PR | Title | Pages only | Assertion drops | Green proof | Clean |
|----|-------|------------|-----------------|-------------|-------|
${heal.details
  .map(
    (d) =>
      `| #${d.number} | ${d.title.replace(/\|/g, '/')} | ${d.pagesOnly} | ${d.assertionDrops} | ${d.greenProof} | ${d.clean} |`
  )
  .join('\n')}

</details>

## Generation-gate pass rate

| Metric | Value |
|--------|-------|
| **First-PR pass** | **${generation.pass} / ${generation.total}** (${generation.ratePct}%) |

_First-PR pass = E2E green on first PR run + generation-gate conformance on new specs + filename maps to DS ticket._

**How measured:** ${generation.measurement}

**What it tells us:** ${generation.total === 0 ? 'No DS generation PRs in history yet — baseline pending.' : generation.pass / generation.total >= 0.5 ? 'Most generated specs land conforming; keep human Gherkin checkpoint.' : 'Most first PRs need rework — tighten test-writer inputs and MCP crawl before code.'}

<details>
<summary>Generation PR detail</summary>

| PR | Green first E2E | Conforming | Maps AC | Pass |
|----|-----------------|------------|---------|------|
${generation.details
  .map(
    (d) =>
      `| #${d.number} | ${d.greenFirst} | ${d.conforming} | ${d.acMap} | ${d.firstPass} |`
  )
  .join('\n')}

</details>

## Ask vs guess

| Metric | Value |
|--------|-------|
| **Ask** | **${askGuess.ask}** |
| **Guess** | **${askGuess.guess}** |
| **Ratio** | ${askGuess.ratio} |

**How measured:** ${askGuess.measurement}

**What it tells us:** ${askGuess.ask >= askGuess.guess ? 'Agents tended to clarify before committing values (favour more MCP crawl over assumptions).' : 'Invented UI/locale values drove heals — enforce “crawl, don’t invent” in orchestration.'}

## Summary

| | |
|--|--|
| **Top reliability risk** | ${risk.risk} |
| **Next action** | ${risk.action} |

---

_Report script: \`scripts/generate-eval-report.mjs\`. Telemetry: \`.cursor/eval/telemetry.jsonl\`._
`;
}

function main() {
  const generatedAt = isoNow();
  const flake = collectFlakeRate();
  const heal = collectHealSuccess();
  const generation = collectGenerationGatePass();
  const askGuess = collectAskVsGuess();

  const markdown = renderReport({
    flake,
    heal,
    generation,
    askGuess,
    generatedAt,
  });

  const outPath = path.join(ROOT, 'eval-report.md');
  fs.mkdirSync(path.dirname(path.join(ROOT, '.cursor/eval')), { recursive: true });
  fs.writeFileSync(outPath, markdown, 'utf8');

  const snapshot = {
    generatedAt,
    flake,
    heal,
    generation,
    askGuess,
  };
  fs.writeFileSync(
    path.join(ROOT, '.cursor/eval/last-snapshot.json'),
    JSON.stringify(snapshot, null, 2),
    'utf8'
  );

  console.log(`Wrote ${outPath}`);
}

main();
