Feature: DS-293 — Edit existing program details
  As an admin user, I want to edit an existing program's details
  so that I can correct or update program information after creation.

  Background:
    Given I am logged in as admin

  # Happy paths

  Scenario: Open program for editing
    Given I am on the Programs page
    And a program "Web Development 2026" exists
    When I click the edit icon on "Web Development 2026"
    Then I see the Edit Program form pre-populated with the program's current Name and Description

  Scenario: Successfully edit a program name
    Given I am editing "Web Development 2026"
    When I change the Program Name to "Web Development 2026 - Updated"
    And I click Save
    Then the modal closes
    And the program list immediately shows "Web Development 2026 - Updated"

  Scenario: Edit preserves unchanged fields
    Given I am editing a program
    When I only change the Description
    And I click Save
    Then the Program Name and other fields remain unchanged

  Scenario: Edit both name and description
    Given I am editing "UX Design Foundations"
    When I change the Program Name to "UX Design Foundations - Professional Track"
    And I change the Description to "Advanced UX research, prototyping, and usability testing"
    And I click Save
    Then the program list shows "UX Design Foundations - Professional Track"
    And the description shows "Advanced UX research, prototyping, and usability testing"

  # Negative

  Scenario: Cannot save edit with empty program name
    Given I am editing "Web Development 2026"
    When I clear the Program Name field
    Then the Save button is disabled
    And the program list still shows "Web Development 2026"

  Scenario: Cancel edit discards changes
    Given I am editing "Web Development 2026"
    When I change the Program Name to "Web Development 2026 - Draft Change"
    And I change the Description to "Unsaved draft description"
    And I click Cancel
    Then the modal closes
    And the program list shows "Web Development 2026"
    And the description shows the original description

  Scenario: Reject duplicate name on edit
    Given programs "Web Development 2026" and "Data Science Fundamentals" exist
    And I am editing "Data Science Fundamentals"
    When I change the Program Name to "Web Development 2026"
    And I click Save
    Then I see a duplicate-name outcome (error copy or the original name remains)
    And the program list still shows "Data Science Fundamentals"

  # Edge cases

  Scenario: Save with no changes
    Given I am editing "Web Development 2026"
    When I click Save without making changes
    Then the modal closes
    And the program list shows "Web Development 2026"

  Scenario: Reject whitespace-only name on edit
    Given I am editing "Web Development 2026"
    When I change the Program Name to "   "
    Then the Save button is disabled
    And the program list still shows "Web Development 2026"

  Scenario: Accept special characters in edited name
    Given I am editing "Web Development 2026"
    When I change the Program Name to "Informatique & IA - Niveau 2 (Édition 2026)"
    And I click Save
    Then the program list shows "Informatique & IA - Niveau 2 (Édition 2026)"

  Scenario: Clear description on edit
    Given I am editing "Web Development 2026"
    When I clear the Description field
    And I click Save
    Then the program list shows "Web Development 2026"
    And the description is empty

  Scenario: Trim spaces from edited program name
    Given I am editing "Web Development 2026"
    When I change the Program Name to "  Cloud Computing Certificate  "
    And I click Save
    Then the program list shows "Cloud Computing Certificate"

  Scenario: Accept max-length name on edit
    Given I am editing "Short Name Program"
    When I change the Program Name to a 255-character valid name
    And I click Save
    Then the program list shows the updated program name

  # Programs API edge cases — edit save (PATCH /api/programs/:id)
  # Crawl note (2026-11-06): save uses PATCH. On 503 the Edit Program dialog
  # stays open and the UI renders no dedicated error string (AxiosError only
  # in console). Assert no crash: Programs heading visible, dialog still open,
  # pageerror empty. Do not invent error copy.

  Scenario: Edit save returns 503 — dialog stays open, no crash
    Given I am editing a program
    And PATCH /api/programs/:id is fulfilled with 503 JSON { "message": "Service unavailable" }
    When I change the Program Name and click Save
    Then the Edit Program dialog remains open
    And the Programs heading is still visible
    And no pageerror is raised
    # Live crawl: no toast/alert/dialog error copy was rendered

  Scenario: Edit save returns 400 — no crash
    Given I am editing a program
    And PATCH /api/programs/:id is fulfilled with 400
    When I change the Program Name and click Save
    Then the app does not crash (Programs heading visible; pageerror empty)

  Scenario: Edit save returns 401 — no crash or redirect to login
    Given I am editing a program
    And PATCH /api/programs/:id is fulfilled with 401
    When I change the Program Name and click Save
    Then the app shows a message or redirects to /login, or stays stable without pageerror

  Scenario: Edit save returns 403 — access-denied or no crash
    Given I am editing a program
    And PATCH /api/programs/:id is fulfilled with 403
    When I change the Program Name and click Save
    Then the app shows an access-denied outcome or does not crash

  Scenario: Edit save returns 404 — no crash
    Given I am editing a program
    And PATCH /api/programs/:id is fulfilled with 404
    When I change the Program Name and click Save
    Then the app does not crash

  Scenario: Edit save returns 422 — no crash
    Given I am editing a program
    And PATCH /api/programs/:id is fulfilled with 422
    When I change the Program Name and click Save
    Then the app does not crash

  Scenario: Edit save returns 500 — no crash
    Given I am editing a program
    And PATCH /api/programs/:id is fulfilled with 500
    When I change the Program Name and click Save
    Then the app does not crash

  Scenario: Edit save returns 501 — no crash
    Given I am editing a program
    And PATCH /api/programs/:id is fulfilled with 501
    When I change the Program Name and click Save
    Then the app does not crash

  Scenario: Edit save returns 502 — no crash
    Given I am editing a program
    And PATCH /api/programs/:id is fulfilled with 502
    When I change the Program Name and click Save
    Then the app does not crash

  Scenario: Edit save returns 200 with body that has no program object — UI only
    Given I am editing a program
    And PATCH /api/programs/:id is fulfilled with 200 and body {}
    When I change the Program Name and click Save
    Then the app does not crash
    And cleanup must not track a mocked id

  Scenario: Edit save returns 409 — duplicate conflict UI
    Given I am editing a program
    And PATCH /api/programs/:id is fulfilled with 409
    When I change the Program Name and click Save
    Then the app shows a conflict/duplicate outcome or does not crash
    # Live duplicate-name rejection stays on the live API in the negative scenario above

  # Programs API edge cases — list (GET /api/programs) for programs-flow coverage

  Scenario: Program list GET returns 200 with empty array
    Given GET /api/programs is fulfilled with 200 and body []
    When I open the Programs page
    Then I see the empty-state copy the app renders
    # POM emptyStateText / noProgramsYetText — assert the live string if present

  Scenario: Program list GET returns 200 with malformed body
    Given GET /api/programs is fulfilled with 200 and body {}
    When I open the Programs page
    Then the app does not crash (Programs heading visible; pageerror empty)

  Scenario: Program list GET returns 404 — error or no crash
    Given GET /api/programs is fulfilled with 404
    When I open the Programs page
    Then the app shows error copy if rendered, otherwise does not crash

  Scenario: Program list GET returns 401 — message or redirect to login
    Given GET /api/programs is fulfilled with 401
    When I open the Programs page
    Then I see a message or am redirected to /login

  Scenario: Program list GET returns 403 — access denied
    Given GET /api/programs is fulfilled with 403
    When I open the Programs page
    Then I see an access-denied outcome or the page stays stable

  Scenario: Program list GET returns 500 — error or no crash
    Given GET /api/programs is fulfilled with 500
    When I open the Programs page
    Then the app shows error copy if rendered, otherwise does not crash

  Scenario: Program list GET returns 501 — error or no crash
    Given GET /api/programs is fulfilled with 501
    When I open the Programs page
    Then the app shows error copy if rendered, otherwise does not crash

  Scenario: Program list GET returns 502 — error or no crash
    Given GET /api/programs is fulfilled with 502
    When I open the Programs page
    Then the app shows error copy if rendered, otherwise does not crash

  Scenario: Program list GET returns 503 — error or no crash
    Given GET /api/programs is fulfilled with 503
    When I open the Programs page
    Then the app shows error copy if rendered, otherwise does not crash

  Scenario: Program list GET returns 204 — no crash
    Given GET /api/programs is fulfilled with 204
    When I open the Programs page
    Then the app does not crash

  Scenario: Program list GET returns 300 — no crash
    Given GET /api/programs is fulfilled with 300
    When I open the Programs page
    Then the app does not crash

  Scenario: Program list GET returns 200 with Content-Type text/html — no crash
    Given GET /api/programs is fulfilled with 200 and Content-Type text/html
    When I open the Programs page
    Then the app does not crash

  # Accessibility

  Scenario: Edit Program dialog has no axe violations
    Given I am editing a program
    When I run an axe scan with tags wcag2a and wcag2aa scoped to the Edit Program dialog
    Then there are no violations
    # Scope .include() to the dialog only if full-page noise; comment why

  Scenario: Keyboard opens Edit Program dialog
    Given I am on the Programs page with at least one program
    When I tab to an Edit control for that program
    Then the Edit button is focused
    When I press Enter
    Then the Edit Program dialog opens

# Ambiguities and gaps in acceptance criteria (for QA review):
# 1. Ticket ACs only cover open / rename / preserve-on-description-edit; negatives and API edges added per project conventions.
# 2. Edit dialog also exposes Total Program Hours, Default Session Hours, Default Exam Hours, Target Audience, Focus Areas — not in ACs; not asserted beyond "other fields remain unchanged" via Name preservation.
# 3. Save uses PATCH (confirmed live); feature scenarios name PATCH.
# 4. 503 on edit save renders no visible error copy (crawl 2026-11-06) — scenarios assert stability, not invented strings.
# 5. Duplicate-name error string is not specified; assert outcome class if copy is absent.
# 6. Non-admin edit denial is out of scope for this ticket's ACs (covered historically by DS-2).
# 7. Relative timestamps are not shown for edit — no clock.install scenario.
