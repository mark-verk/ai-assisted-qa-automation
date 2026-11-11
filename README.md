# ai-assisted-qa-automation

Playwright end-to-end tests for [Didaxis](https://didaxis.studio), with Cursor agents and skills under `.cursor/` for Jira-driven test generation, triage, and self-heal.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- Git

## Install

```bash
git clone https://github.com/mark-verk/ai-assisted-qa-automation.git
cd ai-assisted-qa-automation
npm ci
npx playwright install chromium
```

## Environment

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Fill in the **Run tests** variables in `.env` (see comments in `.env.example`).

   | Variable | Purpose |
   |----------|---------|
   | `DIDAXIS_URL` | Playwright `baseURL` |
   | `DIDAXIS_EMAIL` / `DIDAXIS_PASSWORD` | Login in the setup project |
   | `DIDAXIS_API_TOKEN` | API teardown and contract checks |

   Optional alt credentials (`DIDAXIS_ALT_*`) support permission-probe tests. Those specs currently read `DIDAXIS_NON_ADMIN_EMAIL` and `DIDAXIS_NON_ADMIN_PASSWORD`—use the same values there if those tests are skipped or fail with “Set DIDAXIS_NON_ADMIN_…”.

`.env` is gitignored. Do not commit secrets.

## Run tests

Full suite (runs `auth.setup.ts` first, then Chromium with saved `storageState`):

```bash
npx playwright test
```

Other useful commands:

```bash
npm test              # same as npx playwright test
npm run test:ui       # Playwright UI mode
npm run report        # open the last HTML report
```

### Run a tagged slice

Each `test()` carries **exactly one** tag: `@smoke`, `@sanity`, `@regression`, `@api`, `@e2e`, or `@destructive` (shared/global state only; run serially). See `.cursor/rules/playwright-conventions.mdc` §11.

```bash
npm run test:smoke
npm run test:sanity
npm run test:regression
npm run test:api
npm run test:e2e
npm run test:destructive   # --workers=1
```

Or use `--grep` directly, for example `npx playwright test --grep @regression`.

Run a single spec file:

```bash
npx playwright test tests/ds1-create-new-academic-program.spec.ts
```

## CI

- **E2E** (`.github/workflows/e2e.yml`): `npx playwright test` on push/PR using repository secrets for the **Run tests** variables.
- **Test generation** (`.github/workflows/test-generation.yml`): scheduled/dispatch workflow that runs the suite, optional self-heal on red, and Jira backlog processing via the Cursor CLI. Requires **Agent / CI setup** secrets in addition to Didaxis credentials.
- **Reliability report** (`eval-report.md`): regenerated at the end of test-generation CI, after local agent runs (`.cursor/hooks.json` → `stop` / `subagentStop`), or manually via `npm run eval:report`. Metrics are sourced from CI logs, PR history, and `.cursor/eval/telemetry.jsonl` (no built-in Cursor telemetry).

## Cursor agents and skills (optional)

To generate or extend tests in Cursor (not required to run Playwright locally):

1. Open this repo in [Cursor](https://cursor.com).
2. Ensure **Run tests** env vars are set locally (`.env`).
3. For Jira/Confluence MCP and the test-generation workflow, configure **Agent / CI setup** values:
   - Repository secrets for GitHub Actions (`CURSOR_API_KEY`, `ATLASSIAN_*`).
   - Cursor Settings → MCP: Atlassian and Playwright servers with the same tokens where applicable.

Project layout:

| Path | Role |
|------|------|
| `.cursor/rules/` | Constitution, Playwright conventions, QA orchestration |
| `.cursor/skills/` | Workflows: ticket → Gherkin, explore coverage, self-heal, API cleanup, a11y |
| `.cursor/agents/` | `test-writer`, `triage`, `bug-reporter` subagent prompts |
| `.cursor/hooks/` | Gates on generated/edited test and page files |

Typical flow: reference a Jira ticket (`DS-*`) → orchestration applies `jira-ticket-to-gherkin` → human reviews Gherkin → `test-writer` adds specs under `tests/` and POMs under `pages/` → `npx playwright test`. On failure, triage classifies app bug vs locator drift; drift is healed in POMs only (see `qa-orchestration.mdc`).

## Project structure

- `tests/` — Playwright specs and `auth.setup.ts`
- `pages/` — Page object models
- `fixtures/` — Shared fixtures (e.g. API cleanup)
- `test-data/` — Faker factories, static invalid inputs, enums
- `playwright.config.ts` — Runner config (`fullyParallel`, CI retries, `storageState` setup project)
