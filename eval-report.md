# Suite reliability eval report

_Generated: 2026-11-27T16:22:31.080Z_  
_Regenerate: `npm run eval:report` (local) or after `test-generation.yml` / agent `stop` hook._

## Flake rate

| Metric | Value |
|--------|-------|
| **Rate** | **3.5%** (37 flaky / 1064 executed outcomes) |
| **Window** | Last **18** Playwright CI runs (10 per workflow max, e2e + test-generation) |

**How measured:** Parsed Playwright list-reporter lines (`N flaky`, `M passed`) from `gh run view --log` on the last N E2E and test-generation workflow runs.

**What it tells us:** Flakes are present but not dominating the retry budget yet.

<details>
<summary>Per-run flake breakdown</summary>

| Run | Workflow | Conclusion | Flaky | Passed |
|-----|----------|------------|-------|--------|
| [45858795678](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/45858795678) | test-generation.yml | failure | 1 | 59 |
| [45658123967](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/45658123967) | test-generation.yml | failure | 1 | 60 |
| [45443412145](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/45443412145) | test-generation.yml | success | 6 | 34 |
| [45227841175](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/45227841175) | test-generation.yml | success | 3 | 58 |
| [44758120211](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/44758120211) | test-generation.yml | success | 0 | 59 |
| [44553230911](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/44553230911) | test-generation.yml | success | 2 | 60 |
| [44332147831](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/44332147831) | test-generation.yml | success | 1 | 59 |
| [44115285039](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/44115285039) | test-generation.yml | success | 1 | 59 |
| [43890291741](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/43890291741) | test-generation.yml | success | 1 | 60 |
| [43147019380](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/43147019380) | e2e.yml | failure | 3 | 57 |
| [43146842159](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/43146842159) | e2e.yml | failure | 1 | 58 |
| [43146812123](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/43146812123) | e2e.yml | failure | 1 | 58 |
| [42957219575](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42957219575) | e2e.yml | failure | 2 | 58 |
| [42957036734](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42957036734) | e2e.yml | failure | 2 | 59 |
| [42954621848](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42954621848) | e2e.yml | failure | 1 | 59 |
| [42949525954](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42949525954) | e2e.yml | failure | 1 | 59 |
| [42743205687](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42743205687) | e2e.yml | failure | 7 | 53 |
| [42533096439](https://github.com/mark-verk/ai-assisted-qa-automation/actions/runs/42533096439) | e2e.yml | failure | 3 | 58 |

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
| **First-PR pass** | **0 / 8** (0%) |

_First-PR pass = E2E green on first PR run + generation-gate conformance on new specs + filename maps to DS ticket._

**How measured:** DS-* PRs: first `e2e.yml` conclusion on PR branch, generation-gate rules on added specs in working tree, filename contains ticket id (maps-to-AC proxy).

**What it tells us:** Most first PRs need rework — tighten test-writer inputs and MCP crawl before code.

<details>
<summary>Generation PR detail</summary>

| PR | Green first E2E | Conforming | Maps AC | Pass |
|----|-----------------|------------|---------|------|
| #10 | false | true | true | false |
| #9 | false | true | true | false |
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
| **Ask** | **0** |
| **Guess** | **0** |
| **Ratio** | 0 ask / 0 guess |

**How measured:** `.cursor/eval/telemetry.jsonl` (AskQuestion hook) plus session JSONL scan for AskQuestion tool calls and heal/drift incidents tied to uninvented UI copy.

**What it tells us:** Agents tended to clarify before committing values (favour more MCP crawl over assumptions).

## Summary

| | |
|--|--|
| **Top reliability risk** | Generated specs rarely green + conforming on first PR |
| **Next action** | Require Playwright MCP crawl evidence in test-writer handoff before opening DS-* PRs. |

---

_Report script: `scripts/generate-eval-report.mjs`. Telemetry: `.cursor/eval/telemetry.jsonl`._
