---
name: pom-conventions
description: Page Object Model conventions for Playwright tests in this
  project. Apply whenever generating, refactoring, or reviewing any
  Playwright test that interacts with the Didaxis UI — even if the user
  doesn't say "POM". Tests should never contain inline locators.
---

# Page Object Model Conventions

All UI interactions go through Page Objects in `pages/`. Tests describe
intent; POMs handle mechanics.

## Steps

1. One Page Object class per page or distinct component.
   Examples: `LoginPage`, `ProgramsPage`, `NewProgramModal`.

2. Define locators as `readonly` properties in the constructor, in this
   priority order only:
   `getByRole` → `getByLabel` / `getByPlaceholder` → `getByText` →
   `getByTestId` (escape hatch only — comment why nothing higher worked).
   Never CSS selectors, XPath, or brittle text.

3. If a locator matches more than one element, disambiguate with
   `.filter({ hasText })` — do not use `.first()`.

4. Provide methods for user actions: `goto`, `clickX`, `fillY`, `submit`.
   Methods perform actions; they do not assert. Never use
   `waitForTimeout` inside POMs — callers wait with web-first
   `expect(locator).toBeVisible()` / `.toBeEnabled()` / `.toHaveText()`.

5. **No assertions inside Page Objects.** All `expect(...)` calls
   live in the test files, never in `pages/`. Prefer auto-retrying
   web-first expects; never `expect(await locator.isVisible()).toBe(true)`.
   When hardening an existing spec, change locators and waits only —
   do not change what an assertion checks. A relative timestamp is
   frozen in the spec with `page.clock.install({ time })` before
   navigation (see **Frozen time** in `.cursor/rules/playwright-conventions.mdc`).
   Do not put that call in a page object, and do not change
   `playwright.config.ts` (`fullyParallel: true`, CI retries `2` and
   local retries `0`, no `workers: 1`).

6. Compose POMs when a page contains distinct components — e.g.
   `ProgramsPage` holds a `NewProgramModal` instance.

7. Import POMs at the top of each spec; instantiate with `new XxxPage(page)`.

8. Programs API edge cases (`page.route` on `/api/programs`) follow `.cursor/rules/playwright-conventions.mdc`. The route stays in the spec. Clicks, fills, and navigation stay on the existing POMs. Before writing an error or empty-state assertion, open the real page (Playwright MCP `user-Playwright` or agent-browser) and read the copy the app renders. Do not invent strings. If the app renders nothing for a case, say so. Never mock the endpoint the test is actually verifying. One tag per test.

9. Programs page accessibility stays in the spec, driven by the existing POMs. Role-based locators only; no inline locators in the spec. The axe scan is `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze()` with `expect(results.violations).toEqual([])`. Scope with `.include()`/`.exclude()` only if a third-party widget is noisy, and comment why. The keyboard test axe cannot do — tab to the primary control, `toBeFocused()`, Enter, dialog open — uses those same POM locators. One tag per test. If the scan finds real violations, report them and stop. Never add `.disableRules()` to go green.

## Output
Page Object files in `pages/`. Tests in `tests/` that import them.
