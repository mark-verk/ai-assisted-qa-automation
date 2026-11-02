---
name: ci-failure-triage
description: When a CI run is red, pull the run's logs and the playwright-report artifact via gh CLI, read the Playwright error and trace, cross-reference the spec, POM, and app source in the repo, classify real app bug vs test issue, and post a structured diagnosis to the PR. Use whenever a build fails — even if triage isn't asked for.
---

# CI Failure Triage

## Steps
1. Pull the failed run's logs + playwright-report artifact (GitHub MCP / gh CLI).
2. Read the Playwright error: failing test, expected vs received, trace path.
3. Cross-reference: the spec, the POM, and the Didaxis source in the repo if exist.
4. Classify: real app bug (route to a Jira bug via bug-reporter) vs
   test issue (propose a patch for human review).
5. Report: post root cause, affected file, expected/actual, suggested fix,
   and evidence (trace/screenshot + run id) as a PR comment.

## Rules
- Never merge a fix automatically — propose, a human approves.
- A non-empty axe `violations` array on the programs page is a product defect. Report the rule ids and stop. Never suggest `.disableRules()`, or a helper that keeps CI green, as the fix. `.include()`/`.exclude()` only if a third-party widget is noisy, with a comment why.
- For a real defect, reuse the bug-reporter skill and link the story.
- The diagnosis must name the source location and cause, not just the symptom.

## Resolve the failed run

Use `gh` for all GitHub operations. Request `network` / `all` permissions when downloading artifacts.

**PR context** — prefer the check tied to the current branch:

```bash
gh pr checks --watch=false
gh pr view --json number,headRefName,commits
```

**Run id** — from the failing check URL or:

```bash
gh run list --workflow=e2e.yml --limit 5
gh run view <run-id> --log-failed
```

Workflow artifact name: `playwright-report` (see `.github/workflows/e2e.yml`).

```bash
mkdir -p .ci-triage/<run-id>
gh run download <run-id> -n playwright-report -D .ci-triage/<run-id>/playwright-report
```

Open `playwright-report/index.html` indirectly: read embedded failure text from CI logs first, then inspect `test-results/` and trace zip paths referenced in the log. Unzip traces under `.ci-triage/<run-id>/` when you need step-level DOM/network evidence.

## Investigation checklist

Copy and track:

```
- [ ] Failing spec path and exact test title (`-g` title)
- [ ] Assertion: expected vs received (from log or report)
- [ ] Stack points to spec vs `pages/` POM
- [ ] POM locators/actions match current UI (apply pom-conventions)
- [ ] Ticket key from `test.describe`, title, or `features/<KEY>.feature`
- [ ] Didaxis app source in repo (if any) vs test-only repo
- [ ] Env/secrets/credentials called out in log (not a product bug)
- [ ] If the spec fulfills `/api/programs` with `page.route`, the fulfilled status is the stimulus. Compare the assertion to the copy the app actually renders.
- [ ] Programs-page axe scan (`withTags(['wcag2a','wcag2aa'])`): real `violations` are a product defect — report and stop; do not suggest `.disableRules()`
- [ ] Classification: product defect | test issue (locator/wait flake) | env/credentials
```

## Classification

| Outcome | Action |
|---------|--------|
| **Product defect** | Follow [jira-bug-reporter](../jira-bug-reporter/SKILL.md). Include CI run id and artifact paths in the Bug description. |
| **Test issue** | Draft a minimal patch (spec and/or POM). Do not merge; leave for review. |
| **Locator / wait flake** | Test issue. Change locators and waits only, per [pom-conventions](../pom-conventions/SKILL.md): user-facing locators, web-first `expect(locator).toBeVisible()` / `.toBeEnabled()` / `.toHaveText()`, `.filter({ hasText })` instead of `.first()`. Do not change what an assertion checks. Do not file a product Bug. |
| **Relative timestamp drift** | Test issue when the label moved with the wall clock or a machine locale/timezone (`2 minutes ago` vs `3 minutes ago`, or the same instant formatted differently). Freeze time in the spec with `page.clock.install({ time })` before navigation, per **Frozen time** in `.cursor/rules/playwright-conventions.mdc`. Keep the expected label. Do not raise `retries` above 2 and do not set `workers: 1`. A wrong label while the clock is already frozen is a product defect. |
| **Env / credentials** | Explain in the PR comment. Do not file a product Bug. |
| **Mocked programs response** | The fulfilled status (503, 401, 404, empty 200, malformed 200, and the rest in `.cursor/rules/playwright-conventions.mdc`) is not itself a product defect. A crash, a blank app, or a missing error/empty state that the live UI does show is a product defect. An expected string that disagrees with the rendered copy is a test issue: set the assertion to the copy you read on the real page. Do not invent a string. |
| **Axe violations** | Product defect on the programs page. Report each rule id and stop. Do not suggest `.disableRules()` or a non-blocking CI assert. Keyboard failures (focus or Enter opening the dialog) follow the same split: a control that cannot be reached or activated is a product defect; a wrong POM locator is a test issue. Role-based POM locators only. |

## PR comment template

Post with `gh pr comment <number> --body-file ...` (never auto-merge fixes):

```markdown
## CI failure triage

**Run:** [<run-id>](https://github.com/<owner>/<repo>/actions/runs/<run-id>)
**Workflow:** E2E Tests (`e2e.yml`)

### Summary
<one sentence root cause, not symptom>

### Classification
Product defect | Test issue | Environment

### Failing test
- Spec: `tests/...`
- Title: `<exact title>`

### Expected vs actual
- **Expected:** ...
- **Actual:** ...

### Source location
- **File:** `path:line` — <why this line causes the failure>

### Suggested fix
<concrete next step or patch summary; link Jira DS-xxx if filed>

### Evidence
- Log excerpt or assertion message
- Trace/screenshot path from `playwright-report` or `test-results/`
```

If triage runs on a push to `main` with no open PR, post the same structure as a commit comment or summarize in chat with the run URL.

## Related skills

- [jira-bug-reporter](../jira-bug-reporter/SKILL.md) — Jira Bug when classification is product defect
- [pom-conventions](../pom-conventions/SKILL.md) — locator and POM structure when the failure is test-side
- [api-cleanup](../api-cleanup/SKILL.md) — if the failure involves leftover test data
