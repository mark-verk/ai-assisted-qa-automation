---
name: jira-ticket-to-gherkin
description: Turns a Jira ticket's acceptance criteria into structured, reviewable Gherkin test scenarios. Use this skill whenever the user references a Jira ticket (DS-1, DS-2, etc.) and asks for test cases, a test plan, scenarios, or wants to plan testing for a ticket — even if they don't say the word "Gherkin".
---

# Jira Ticket to Gherkin Test Cases

Generate reviewable test scenarios from a Jira ticket. The Gherkin output
is a human-readable checkpoint — the QA reviews it before any Playwright
code gets written.

## Steps

1. Read the referenced Jira ticket using the Atlassian MCP. Extract the
   title, description, and every acceptance criterion.

2. Generate test scenarios as a Gherkin `.feature` file:
   - One `Feature`, named after the ticket
   - Cover every acceptance criterion with at least one `Scenario`
   - Add negative scenarios — what should NOT happen
   - Add edge-case scenarios — boundaries, empty inputs, duplicates,
     special characters, max length

3. Write each scenario in Given / When / Then form. `Given` sets the
   starting state, `When` is the action under test, `Then` is the
   observable expected outcome. If a `Then` asserts a relative timestamp,
   the scenario freezes time first (`page.clock.install({ time })` before
   navigation) and names the frozen label (`2 minutes ago`). Do not derive
   that label from the wall clock.

4. Group scenarios with comments: `# Happy paths`, `# Negative`, `# Edge cases`.

5. For a programs-flow ticket, add one edge scenario per row in **Programs API edge cases** in `.cursor/rules/playwright-conventions.mdc` (503 on save, 200 with `[]`, 200 with a malformed body, plus 404, 401, 403, 400, 422, 409, 500, 501, 502, 204, and 300 as listed there). The `Then` names the outcome class: error state, empty-state message, or the app does not crash. Before writing the expected copy, open the real page (Playwright MCP `user-Playwright` or agent-browser) and read the text the app renders. Do not invent strings. If the app renders nothing for a case, say so in the scenario. Never mock, in the scenario steps, the endpoint that scenario is actually verifying. Implementation routes interactions through the existing POMs, with one tag per test.

6. For the programs page, add accessibility scenarios. One tag per test. Steps go through the existing POMs with role-based locators and no inline locators.
   - Axe: `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze()`, then no violations (`expect(results.violations).toEqual([])`). Scope with `.include()`/`.exclude()` only if a third-party widget is noisy, and comment why.
   - Keyboard, which axe cannot do: tab to the primary control, it is focused (`toBeFocused()`), press Enter, and the dialog opens.
   If a scan finds real violations, list them in the ambiguities comment and stop. Do not write a scenario that uses `.disableRules()` to go green.

7. Use real, specific values from the ticket — never placeholders.

8. End the file with a comment block listing any ambiguities or gaps
   found in the ticket's acceptance criteria, so the QA can resolve them.

## Output

Save as `features/<ticket-key>.feature`.
