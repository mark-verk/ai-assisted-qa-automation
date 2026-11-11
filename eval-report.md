# Suite reliability eval report

_Generated: 2026-11-11T04:03:18.480Z_  
_Regenerate: `npm run eval:report` (local) or after `test-generation.yml` / agent `stop` hook._

## Flake rate

| Metric | Value |
|--------|-------|
| **Rate** | **4.9%** (21 flaky / 430 executed outcomes) |
| **Window** | Last **9** Playwright CI runs (10 per workflow max, e2e + test-generation) |

**How measured:** Parsed Playwright list-reporter lines (`N flaky`, `M passed`) from `gh run view --log` on the last N E2E and test-generation workflow runs.

**What it tells us:** Flakes are present but not dominating the retry budget yet.

<details>
<summary>Per-run flake breakdown</summary>

| Run | Workflow | Conclusion | Flaky | Passed |
|-----|----------|------------|-------|--------|
| [42954621848](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42954621848) | e2e.yml | failure | 1 | 59 |
| [42949525954](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42949525954) | e2e.yml | failure | 1 | 59 |
| [42833555427](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42833555427) | test-generation.yml | success | 7 | 53 |
| [42743205687](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42743205687) | e2e.yml | failure | 7 | 53 |
| [42642809869](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42642809869) | test-generation.yml | success | 1 | 59 |
| [42533096439](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42533096439) | e2e.yml | failure | 3 | 58 |
| [42529681380](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42529681380) | test-generation.yml | success | 1 | 2 |
| [42529061699](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42529061699) | e2e.yml | failure | 0 | 5 |
| [42528757026](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42528757026) | e2e.yml | failure | 0 | 61 |

</details>

## Heal success rate

| Metric | Value |
|--------|-------|
| **Clean heals** | **1 / 2** (50%) |
| **Masked regressions** | **0** (must stay **0**) |

**How measured:** GitHub PR history (`gh pr list`) for heal/self-heal titles; clean = `pages/` only, zero assertion removals, and first E2E success or merge with unchanged assertions.

**What it tells us:** No heal PRs removed assertions to go green — locator-only policy is holding.

<details>
<summary>Heal PR detail</summary>

| PR | Title | Pages only | Assertion drops | Green proof | Clean |
|----|-------|------------|-----------------|-------------|-------|
| #8 | fix(test): self-heal locator drift | true | 0 | true | true |
| #5 | fix(pom): Programs heading locator drift | true | 0 | false | false |

</details>

## Generation-gate pass rate

| Metric | Value |
|--------|-------|
| **First-PR pass** | **0 / 6** (0%) |

_First-PR pass = E2E green on first PR run + generation-gate conformance on new specs + filename maps to DS ticket._

**How measured:** DS-* PRs: first `e2e.yml` conclusion on PR branch, generation-gate rules on added specs in working tree, filename contains ticket id (maps-to-AC proxy).

**What it tells us:** Most first PRs need rework — tighten test-writer inputs and MCP crawl before code.

<details>
<summary>Generation PR detail</summary>

| PR | Green first E2E | Conforming | Maps AC | Pass |
|----|-----------------|------------|---------|------|
| #7 | false | true | true | false |
| #6 | false | true | true | false |
| #4 | false | false | true | false |
| #3 | false | false | true | false |
| #2 | false | true | true | false |
| #1 | false | true | true | false |

</details>

## Ask vs guess

| Metric | Value |
|--------|-------|
| **Ask** | **5** |
| **Guess** | **12** |
| **Ratio** | 5 ask / 12 guess |

**How measured:** `.cursor/eval/telemetry.jsonl` (AskQuestion hook) plus session JSONL scan for AskQuestion tool calls and heal/drift incidents tied to uninvented UI copy.

**What it tells us:** Invented UI/locale values drove heals — enforce “crawl, don’t invent” in orchestration.

## Summary

| | |
|--|--|
| **Top reliability risk** | Generated specs rarely green + conforming on first PR |
| **Next action** | Require Playwright MCP crawl evidence in test-writer handoff before opening DS-* PRs. |

---

_Report script: `scripts/generate-eval-report.mjs`. Telemetry: `.cursor/eval/telemetry.jsonl`._
