---
name: explore-and-generate
description: >-
  Finds untested UI flows by crawling the live app and diffs them against
  existing Playwright coverage, then outputs a Gherkin plan for the highest-value
  gap. Use immediately when the user says "find what we're not testing",
  "explore <page> for untested flows", or "expand coverage". Do NOT use when a
  ticket already exists — that is jira-ticket-analyzer; this skill is only for
  when there is no ticket.
---

# Explore and Generate

Read-only exploration. Map existing coverage, crawl the live UI, find the gap,
and hand the test-writer one Gherkin plan. Do not write Playwright code.

## Steps

1. **Map covered flows** — Read `tests/` (and related `pages/` usage) and list
   the user flows already covered.

2. **Crawl the target** — Open the target page/flow via the Playwright MCP
   (`user-Playwright`). Read the accessibility tree (roles, names, states),
   not pixels or screenshots as the source of truth.

3. **Enumerate real user flows** — From the a11y tree and interactive controls,
   list the real user flows the UI actually supports (happy paths, dialogs,
   empty/error states, keyboard paths the UI exposes).

4. **Diff for the coverage gap** — Compare the enumerated flows against the
   covered set from step 1. Record what is missing.

5. **Pick one highest-value uncovered flow** — Choose a single gap per run.
   State why it is highest value (risk, frequency, or blast radius). Do not
   propose multiple flows in one run.

6. **Output a Gherkin test plan** — Write a reviewable plan for the
   test-writer to implement:
   - Positive path for the chosen flow
   - One edge case
   - Every `Then` must be assertable (observable UI/API outcome; no vague
     "works correctly")
   - Treat the Gherkin as a human checkpoint — no Playwright code in this skill

## Constraints

- Read-only: do not edit `tests/`, `pages/`, fixtures, or app source.
- No ticket path: if a Jira ticket key is present, stop and use
  `jira-ticket-to-gherkin` / jira-ticket-analyzer instead.
- One uncovered flow per run.
