---
name: self-heal
description: >-
  Repairs Playwright locator drift in POMs after triage classifies a red run
  as a test issue. Use ONLY after triage classifies the red run as a test
  issue (drift), never for a real app bug. Trigger on "the build is red
  because a locator broke", "fix the drifted selector", "the test broke after
  a UI change", "heal the suite".
---

# Self-Heal

Heal one drifted locator per run. Patch the POM only. Every heal becomes a PR.

## Steps

1. **Require triage's drift classification.** Proceed only when triage already
   classified the red run as a **test issue (drift)**. If classification is
   missing, ambiguous, or is a real app bug — **stop** and route to
   [jira-bug-reporter](../jira-bug-reporter/SKILL.md). Do not heal product
   defects.

2. **Find the failing locator and its POM.** From the Playwright trace /
   failure stack, identify the broken locator and the `pages/` POM that owns
   it. Do not invent a target — follow the stack into the POM property.

3. **Re-discover the element.** Open the live UI with Agent-Browser and read
   the a11y tree. Match the element by its **role + current accessible name**
   (not by CSS, XPath, or stale text from the old locator).

4. **Patch the POM only.** Update the locator in the POM with a minimal
   role-based diff (`getByRole` → `getByLabel` / `getByPlaceholder` →
   `getByText` → `getByTestId` per [pom-conventions](../pom-conventions/SKILL.md)).
   **Never** change the spec's assertions, expected values, or what the test
   checks.

5. **Re-run and prove green WITH assertions unchanged.** Run the failing
   spec. Green only counts if assertions are identical to pre-heal. Green
   via a weakened assertion is a bug — escalate; do not ship that heal.

6. **Report.** Output the old → new locator diff and the green run evidence
   (command + result). Open a PR for the heal. One repair per run — do not
   batch multiple locator fixes into one heal pass.

## Rules

- One repair per run; every heal becomes a PR.
- POM locators only — never inline locators in the spec.
- Never merge without human approval.
- If re-discovery cannot find a role + accessible name match, stop and escalate
  (do not weaken assertions or fall back to brittle CSS).
