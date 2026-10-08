---
name: jira-bug-reporter
description: Analyzes Playwright test failures, identifies root cause, and creates detailed Jira bug tickets. Use when a test fails and needs investigation and bug reporting.
---

# Jira Bug Reporter

Turn a Playwright failure into a Jira Bug linked to the source story, with
reproduction steps, expected vs actual results, the failing test path, and
a screenshot attached to the issue.

## When to use

- User pastes Playwright failure output or asks to file a bug from a failed test
- After `npm test`, `npm run test:dsN`, or `npx playwright test` reports a failure

## Resolve the failure

1. Source ticket: `test.describe('DS-N — …')` in `tests/dsN-create-program.spec.ts`. Match the scenario in `features/DS-N.feature`.
2. Read the failure: assertion message, timeout, locator, URL, and stack line in the spec.
3. Classify: **app bug**, **test defect**, **environment/data**, or **flake**. Cite the failing `expect` and the observable state.
4. If it is clearly a **test defect**, ask once whether to file a Bug or comment on the story instead. Do not create a Bug until the user answers.

## Duplicate check

Before create, `searchJiraIssuesUsingJql` in project **DS**, type Bug, using the summary or error snippet. If a duplicate exists, comment on it and link the story instead of creating another Bug. Example JQL is in [reference.md](reference.md).

## Create the Bug

1. `getAccessibleAtlassianResources` once; reuse `cloudId`.
2. `getJiraIssue` on the source key (for example DS-1). Project is **DS**.
3. `createJiraIssue`:
   - `projectKey`: **DS**
   - `issueType`: **Bug**
   - `summary`: `[DS-N] <concise defect> — <test title>`
   - `description`: markdown below
   - `contentFormat`: `markdown`

```markdown
## Steps to reproduce
1. …

## Expected result
…

## Actual result
…

## Root cause
**Classification:** app bug | test defect | environment/data | flake

…

## Source code
- Test: `tests/dsN-create-program.spec.ts` (line …)
- Feature: `features/DS-N.feature` (scenario …)
```

Write steps as user-visible actions from the spec and Gherkin. Use real values from the test. Never put passwords, tokens, or `.env` contents in the description. A filled example is in [reference.md](reference.md).

## Link to the original ticket

After the Bug exists, call `addGraphContext`:

- `relationshipType`: `jira-work-item-links-jira-work-item`
- `objectIdentifier`: the new Bug key
- `targetObjectIdentifier`: the source story key (for example DS-1)

This is a link, not a sub-task. Do not set `parent` on `createJiraIssue`.

## Attach the screenshot

`playwright.config.ts` does not save screenshots (`trace` is `on-first-retry`; local `retries` is 0). Look under `test-results/` for `test-failed-*.png`. If it is missing, re-run only the failing test:

```bash
npx playwright test tests/dsN-create-program.spec.ts -g "<test title>" --workers=1 --screenshot=only-on-failure
```

Upload that png. Do not attach `.env` or anything with credentials.

1. `discover` with query `upload attachment to jira issue`. Use the returned operation name (`uploadAttachmentToJiraIssue`) with `executeWrite`. Do not invent a different name.
2. **Phase 1:** `cloudId`, `issueIdOrKey` (Bug key), `filePath` (repo-relative or absolute). Run the returned `uploadCommand` from the repo root. Keep `fileId`.
3. **Phase 2:** same `cloudId` and `issueIdOrKey`, plus `fileId` from phase 1.

Input shapes are in [reference.md](reference.md).

## Handoff

Report the new Bug key, its browse URL, the link to the source story, and the screenshot path that was attached.
