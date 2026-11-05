Feature: DS-293 — Mark - Edit existing program details
  As an admin user, I want to edit an existing program's details
  so that I can correct or update program information after creation.

  Background:
    Given I am logged in as admin

  # Happy paths

  Scenario: Open program for editing
    Given I am on the Programs page
    And a program "Web Development 2026" exists
    When I click the edit icon on "Web Development 2026"
    Then I see the Edit Program dialog pre-populated with the program's current Program Name and Description
    And Save and Cancel are visible

  Scenario: Successfully edit a program name
    Given I am editing "Web Development 2026"
    When I change the Program Name to "Web Development 2026 - Updated"
    And I click Save
    Then the modal closes
    And the program list immediately shows "Web Development 2026 - Updated"

  Scenario: Edit preserves unchanged fields
    Given I am editing a program named "Web Development 2026"
    When I only change the Description to "Updated full-stack curriculum with React and Node.js modules"
    And I click Save
    Then the modal closes
    And the program list still shows name "Web Development 2026"
    And the description shows "Updated full-stack curriculum with React and Node.js modules"

  # Negative

  Scenario: Cannot save edit with empty program name
    Given I am editing "Web Development 2026"
    When I clear the Program Name field
    Then the Save button is disabled
    And the Edit Program dialog stays open
    And the program list still shows "Web Development 2026"

  Scenario: Cancel edit discards changes
    Given I am editing "Web Development 2026" with description "Full-stack web development program"
    When I change the Program Name to "Web Development 2026 - Draft Change"
    And I change the Description to "Unsaved draft description"
    And I click Cancel
    Then the modal closes
    And the program list shows "Web Development 2026"
    And the description still shows "Full-stack web development program"

  # Edge cases — Programs API (observed on live UI crawl 2026-11-05)

  Scenario: Edit save returns 503
    Given I am editing "Web Development 2026"
    And PUT or PATCH /api/programs/:id will respond 503 JSON {"message":"Service unavailable"}
    When I change the Program Name and click Save
    Then the Edit Program dialog stays open
    And no dedicated error message is rendered in the dialog
    And a pageerror "Request failed with status code 503" is raised
    # Live crawl: dialog text is only form fields + Cancel/Save; no toast/banner copy

  Scenario: Edit save returns 400
    Given I am editing a program
    And PUT or PATCH /api/programs/:id will respond 400
    When I click Save after a name change
    Then the Edit Program dialog stays open
    And no dedicated error message is rendered in the dialog
    And a pageerror "Request failed with status code 400" is raised

  Scenario: Edit save returns 401
    Given I am editing a program
    And PUT or PATCH /api/programs/:id will respond 401
    When I click Save after a name change
    Then the Edit Program dialog stays open
    And no dedicated error message is rendered in the dialog
    And a pageerror "Request failed with status code 401" is raised

  Scenario: Edit save returns 403
    Given I am editing a program
    And PUT or PATCH /api/programs/:id will respond 403
    When I click Save after a name change
    Then the Edit Program dialog stays open
    And no dedicated error message is rendered in the dialog
    And a pageerror "Request failed with status code 403" is raised

  Scenario: Edit save returns 404
    Given I am editing a program
    And PUT or PATCH /api/programs/:id will respond 404
    When I click Save after a name change
    Then the Edit Program dialog stays open
    And no dedicated error message is rendered in the dialog
    And a pageerror "Request failed with status code 404" is raised

  Scenario: Edit save returns 422
    Given I am editing a program
    And PUT or PATCH /api/programs/:id will respond 422
    When I click Save after a name change
    Then the Edit Program dialog stays open
    And no dedicated error message is rendered in the dialog
    And a pageerror "Request failed with status code 422" is raised

  Scenario: Edit save returns 500
    Given I am editing a program
    And PUT or PATCH /api/programs/:id will respond 500
    When I click Save after a name change
    Then the Edit Program dialog stays open
    And no dedicated error message is rendered in the dialog
    And a pageerror "Request failed with status code 500" is raised

  Scenario: Edit save returns 501
    Given I am editing a program
    And PUT or PATCH /api/programs/:id will respond 501
    When I click Save after a name change
    Then the Edit Program dialog stays open
    And no dedicated error message is rendered in the dialog
    And a pageerror "Request failed with status code 501" is raised

  Scenario: Edit save returns 502
    Given I am editing a program
    And PUT or PATCH /api/programs/:id will respond 502
    When I click Save after a name change
    Then the Edit Program dialog stays open
    And no dedicated error message is rendered in the dialog
    And a pageerror "Request failed with status code 502" is raised

  Scenario: Edit save returns 200 with no program object
    Given I am editing a program
    And PUT or PATCH /api/programs/:id will respond 200 with body {}
    When I click Save after a name change
    Then the app does not crash
    # Assert Programs heading remains reachable / pageerror empty — observe actual UI in implementation

  Scenario: Programs list GET returns 200 with empty data array
    Given GET /api/programs will respond 200 with {"data":[]}
    When I navigate to the Programs page
    Then I see the empty-state copy "No programs yet. Create your first program to get started."
    And the Programs heading stays visible

  Scenario: Programs list GET returns 200 with malformed body data null
    Given GET /api/programs will respond 200 with {"data":null}
    When I navigate to the Programs page
    Then the app records pageerror "Cannot read properties of null (reading 'length')"
    And the Programs heading is not visible
    And the body renders nothing
    # Live crawl 2026-11-05: blank screen — product crash; document actual behaviour

  Scenario: Programs list GET returns 404
    Given GET /api/programs will respond 404
    When I navigate to the Programs page
    Then the Programs heading stays visible
    And I see "No programs yet. Create your first program to get started."
    And a pageerror "Request failed with status code 404" is raised
    # Live crawl: no distinct error banner — falls through to empty state

  Scenario: Programs list GET returns 401
    Given GET /api/programs will respond 401
    When I navigate to the Programs page
    Then the Programs heading stays visible
    And I see "No programs yet. Create your first program to get started."
    And a pageerror "Request failed with status code 401" is raised
    And I am not redirected to /login
    # Live crawl: no login redirect

  Scenario: Programs list GET returns 403
    Given GET /api/programs will respond 403
    When I navigate to the Programs page
    Then the Programs heading stays visible
    And I see "No programs yet. Create your first program to get started."
    And a pageerror "Request failed with status code 403" is raised
    # Live crawl: no distinct access-denied copy

  Scenario: Programs list GET returns 400
    Given GET /api/programs will respond 400
    When I navigate to the Programs page
    Then the Programs heading stays visible
    And a pageerror "Request failed with status code 400" is raised
    # Expect same empty-state fallthrough as other error statuses if observed

  Scenario: Programs list GET returns 422
    Given GET /api/programs will respond 422
    When I navigate to the Programs page
    Then the Programs heading stays visible
    And a pageerror "Request failed with status code 422" is raised

  Scenario: Programs list GET returns 409
    Given GET /api/programs will respond 409
    When I navigate to the Programs page
    Then the Programs heading stays visible
    And a pageerror "Request failed with status code 409" is raised

  Scenario: Programs list GET returns 500
    Given GET /api/programs will respond 500
    When I navigate to the Programs page
    Then the Programs heading stays visible
    And I see "No programs yet. Create your first program to get started."
    And a pageerror "Request failed with status code 500" is raised

  Scenario: Programs list GET returns 501
    Given GET /api/programs will respond 501
    When I navigate to the Programs page
    Then the Programs heading stays visible
    And a pageerror "Request failed with status code 501" is raised

  Scenario: Programs list GET returns 502
    Given GET /api/programs will respond 502
    When I navigate to the Programs page
    Then the Programs heading stays visible
    And a pageerror "Request failed with status code 502" is raised

  Scenario: Programs list GET returns 503
    Given GET /api/programs will respond 503
    When I navigate to the Programs page
    Then the Programs heading stays visible
    And a pageerror "Request failed with status code 503" is raised

  Scenario: Programs list GET returns 204
    Given GET /api/programs will respond 204 with empty body
    When I navigate to the Programs page
    Then the app records pageerror "Cannot read properties of undefined (reading 'length')"
    And the Programs heading is not visible
    # Live crawl: blank crash

  Scenario: Programs list GET returns 300
    Given GET /api/programs will respond 300
    When I navigate to the Programs page
    Then the Programs heading stays visible or the app does not leave a blank unrecoverable shell
    # Observe actual outcome during implementation

  Scenario: Programs list GET returns 200 with Content-Type text/html
    Given GET /api/programs will respond 200 Content-Type text/html body "<html>ok</html>"
    When I navigate to the Programs page
    Then the app records pageerror "Cannot read properties of undefined (reading 'length')"
    And the Programs heading is not visible
    # Live crawl: blank crash

  # Accessibility

  Scenario: Edit Program dialog has no wcag2a/wcag2aa axe violations
    Given I am on the Programs page
    And a program "Web Development 2026" exists
    When I open the Edit Program dialog for that program
    Then an axe scan with tags wcag2a and wcag2aa scoped to the Edit Program dialog reports no violations

  Scenario: Keyboard opens Edit Program dialog from the row edit control
    Given I am on the Programs page
    And a program "Web Development 2026" exists
    When I tab until the "Edit Web Development 2026" button is focused
    And I press Enter
    Then the Edit Program dialog is visible

# Ambiguities and gaps in acceptance criteria (for QA review):
# 1. Ticket ACs only cover three happy-path scenarios; negatives (empty name, cancel) and API edge cases are added from conventions + live crawl.
# 2. Field label on edit is "Program Name" (not "Name" as in AC wording) — confirmed on live UI.
# 3. Edit save failures leave the dialog open with no visible error copy; only pageerror — product UX gap.
# 4. List GET errors (404/401/403/500) fall through to empty-state copy rather than a distinct error/access-denied banner; 401 does not redirect to /login.
# 5. Malformed list (data:null), 204, and text/html 200 crash the page (blank body + pageerror) — candidate product bugs; scenarios document observed behaviour.
# 6. Duplicate-name-on-edit and non-admin access are out of ticket ACs (covered by DS-2); not required for DS-293 unless expanded.
# 7. Relative timestamps are not asserted by DS-293 ACs — no page.clock.install needed.
# 8. Extra AI Generation Config fields appear in the edit dialog but are outside ticket ACs.
