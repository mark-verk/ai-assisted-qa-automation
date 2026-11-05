Feature: DS-292 — Create new academic program
  As an admin user, I want to create a new academic program
  so that I can begin designing its curriculum structure.

  Background:
    Given I am logged in as admin

  # Happy paths

  @happy
  Scenario: Navigate to program creation form
    Given I am logged in as admin
    When I navigate to the Programs page
    And I click "+ New Program"
    Then I see the program creation form with fields: Program Name, Description

  @happy
  Scenario: Successfully create a program
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows "Web Development 2026"

  @happy
  Scenario: Create a program with an empty description
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I leave Description empty
    And I click Create
    Then the modal closes
    And the program list shows "Web Development 2026"

  @happy
  Scenario: Cancel closes the form without creating a program
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Cancel
    Then the modal closes
    And the program list does not show that unsaved program

  # Negative

  @negative
  Scenario: Validation prevents empty program name
    Given I am on the program creation form
    When I leave the Program Name field empty
    Then the Create button is disabled

  @negative
  Scenario: Whitespace-only program name does not create a program
    Given I am on the program creation form
    When I fill in Program Name with "   "
    And I fill in Description with "Full-stack web development program"
    And I attempt to create the program
    Then no program named "   " appears in the program list
    And the outcome is a validation error state if the app renders one
    And this scenario does not assert a specific validation string

  @negative
  Scenario: A duplicate program name is rejected by the live API
    Given a program "Web Development 2026" already exists
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the live create call is not mocked
    And the outcome is an error state if the app renders one
    And the program list still contains a single "Web Development 2026" from the original create
    And this scenario does not assert a specific duplicate-name string

  # Edge cases

  @edge
  Scenario: Create a program whose name contains special characters
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026 & \"QA\" <292>"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows "Web Development 2026 & \"QA\" <292>"

  @edge
  Scenario: Create a program with a 255-character name
    Given I am on the program creation form
    When I fill in Program Name with a 255-character name beginning with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then either the modal closes and the program list shows that name, or the outcome is a validation error state
    And this scenario does not assert a specific validation string
    And the page does not crash

  # Programs API edge cases
  # Live UI recon was skipped. These scenarios name the outcome class only.
  # Do not mock POST /api/programs in the scenarios that verify a real create or a live duplicate rejection.
  # Fulfill only the synthetic response under test and continue every other request.

  @edge
  Scenario: Create save returns 503
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And the create request is fulfilled with status 503
    Then the outcome is an error state
    And the program list does not gain a live row from that mocked response
    And this scenario does not assert a specific error string

  @edge
  Scenario: Program list returns 200 with an empty array
    Given the program list request is fulfilled with status 200 and a body of []
    When I open the Programs page
    Then the outcome is an empty-state message if the app renders one
    And if the screen renders nothing, the Programs heading stays visible and the page does not crash
    And this scenario does not assert a specific empty-state string

  @edge
  Scenario: Program list returns 200 with a malformed body
    Given the program list request is fulfilled with status 200 and a body that is not a program list
    When I open the Programs page
    Then the app does not crash
    And the Programs heading stays visible

  @edge
  Scenario: Program list returns 404
    Given the program list request is fulfilled with status 404
    When I open the Programs page
    Then the outcome is an error state if the app renders one
    And if the screen renders nothing, the Programs heading stays visible and the page does not crash
    And this scenario does not assert a specific error string

  @edge
  Scenario: Program list returns 401
    Given the program list request is fulfilled with status 401
    When I open the Programs page
    Then the outcome is an authentication message or a redirect to /login
    And this scenario does not assert a specific message string

  @edge
  Scenario: Program list returns 403
    Given the program list request is fulfilled with status 403
    When I open the Programs page
    Then the outcome is an access-denied state if the app renders one
    And if the screen renders nothing, the Programs heading stays visible and the page does not crash
    And this scenario does not assert a specific error string

  @edge
  Scenario: Create save returns 400
    Given I am on the program creation form with Program Name "Web Development 2026"
    When the create request is fulfilled with status 400
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Create save returns 401
    Given I am on the program creation form with Program Name "Web Development 2026"
    When the create request is fulfilled with status 401
    Then the outcome is an authentication message or a redirect to /login
    And this scenario does not assert a specific message string

  @edge
  Scenario: Create save returns 403
    Given I am on the program creation form with Program Name "Web Development 2026"
    When the create request is fulfilled with status 403
    Then the outcome is an access-denied state if the app renders one
    And the page does not crash
    And this scenario does not assert a specific error string

  @edge
  Scenario: Create save returns 422
    Given I am on the program creation form with Program Name "Web Development 2026"
    When the create request is fulfilled with status 422
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Create save returns 409
    Given I am on the program creation form with Program Name "Web Development 2026"
    When the create request is fulfilled with status 409
    Then the outcome is an error state
    And this scenario does not assert a specific error string
    And this mocked 409 is separate from the live duplicate-name scenario

  @edge
  Scenario: Program list returns 500
    Given the program list request is fulfilled with status 500
    When I open the Programs page
    Then the outcome is an error state if the app renders one
    And if the screen renders nothing, the Programs heading stays visible and the page does not crash
    And this scenario does not assert a specific error string

  @edge
  Scenario: Program list returns 501
    Given the program list request is fulfilled with status 501
    When I open the Programs page
    Then the outcome is an error state if the app renders one
    And if the screen renders nothing, the Programs heading stays visible and the page does not crash
    And this scenario does not assert a specific error string

  @edge
  Scenario: Program list returns 502
    Given the program list request is fulfilled with status 502
    When I open the Programs page
    Then the outcome is an error state if the app renders one
    And if the screen renders nothing, the Programs heading stays visible and the page does not crash
    And this scenario does not assert a specific error string

  @edge
  Scenario: Create save returns 500
    Given I am on the program creation form with Program Name "Web Development 2026"
    When the create request is fulfilled with status 500
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Create save returns 501
    Given I am on the program creation form with Program Name "Web Development 2026"
    When the create request is fulfilled with status 501
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Create save returns 502
    Given I am on the program creation form with Program Name "Web Development 2026"
    When the create request is fulfilled with status 502
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Create save returns 200 with a body that has no program object
    Given I am on the program creation form with Program Name "Web Development 2026"
    When the create request is fulfilled with status 200 and a body that has no program object
    Then the app does not crash
    And that response is not tracked as a created program

  @edge
  Scenario: Program list returns 204
    Given the program list request is fulfilled with status 204
    When I open the Programs page
    Then the app does not crash
    And the Programs heading stays visible

  @edge
  Scenario: Program list returns 300
    Given the program list request is fulfilled with status 300
    When I open the Programs page
    Then the app does not crash
    And the Programs heading stays visible

  # Accessibility

  @a11y
  Scenario: Programs page has no WCAG 2.0 A or AA violations
    Given I am on the Programs page
    When I run an axe scan with tags wcag2a and wcag2aa
    Then the scan reports no violations
    And the scan does not disable rules

  @a11y
  Scenario: Keyboard activates the primary programs control
    Given I am on the Programs page
    When I tab to the "+ New Program" button
    Then the "+ New Program" button is focused
    When I press Enter
    Then the New Program dialog opens

# Ambiguities
# - Live UI recon was skipped. DIDAXIS_EMAIL and DIDAXIS_PASSWORD are unset, so error, empty-state, and validation copy were not read from the app. Scenarios name the outcome class only and must not invent those strings.
# - The ticket does not state whether an empty Description is valid. The empty-description scenario expects a successful create; if the live app rejects it, that is unresolved product behavior.
# - Maximum program-name length is not in the acceptance criteria. The 255-character scenario allows either success or a validation error state.
# - Confluence "Program Setup & Management > Overview" was not fetched this run.
# - An axe scan was not run this run. No violations were observed. Do not plan .disableRules() to go green.
# - Do not mock POST /api/programs in the successful-create scenario or the live duplicate-name scenario.
