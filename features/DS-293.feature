Feature: DS-293 — Edit existing program details
  As an admin user, I want to edit an existing program's details
  so that I can correct or update program information after creation.

  Background:
    Given I am logged in as admin

  # Happy paths

  @happy
  Scenario: Open program for editing
    Given I am on the Programs page
    And a program "Web Development 2026" exists with description "Full-stack web development program"
    When I click the edit icon on "Web Development 2026"
    Then I see the edit form
    And the Program Name field shows "Web Development 2026"
    And the Description field shows "Full-stack web development program"

  @happy
  Scenario: Successfully edit a program name
    Given I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 - Updated"
    And I click Save
    Then the modal closes
    And the program list immediately shows "Web Development 2026 - Updated"
    And the program list does not show the previous name "Web Development 2026" as a separate row

  @happy
  Scenario: Edit preserves unchanged fields
    Given I am editing a program "Web Development 2026" with description "Full-stack web development program"
    When I only change the Description to "Full-stack web development program — revised"
    And I click Save
    Then the modal closes
    And the program list still shows the name "Web Development 2026"
    And the program list shows "Full-stack web development program — revised"

  @happy
  Scenario: Cancel edit leaves the program unchanged
    Given I am editing "Web Development 2026" with description "Full-stack web development program"
    When I change the Name to "Web Development 2026 - Updated"
    And I click Cancel
    Then the modal closes
    And the program list still shows "Web Development 2026"
    And the program list does not show "Web Development 2026 - Updated"

  # Negative

  @negative
  Scenario: Empty program name is not saved
    Given I am editing "Web Development 2026"
    When I clear the Program Name field
    And I attempt to save
    Then the program list still shows "Web Development 2026"
    And the outcome is a validation error state if the app renders one
    And this scenario does not assert a specific validation string

  @negative
  Scenario: Editing one program does not change another
    Given a program "Web Development 2026" exists
    And a program "Test Program" exists with description "Keep this description"
    When I change "Web Development 2026" to "Web Development 2026 - Updated" and save
    Then the program list shows "Test Program"
    And "Test Program" still shows "Keep this description"

  # Edge cases

  @edge
  Scenario: Edit a program name that contains special characters
    Given I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 & \"QA\" <293>"
    And I click Save
    Then the modal closes
    And the program list shows "Web Development 2026 & \"QA\" <293>"

  @edge
  Scenario: Edited program keeps its description when only the name changes
    Given I am editing "Web Development 2026" with description "Full-stack web development program"
    When I change the Name to "Web Development 2026 - Updated"
    And I do not change the Description
    And I click Save
    Then the program list shows "Web Development 2026 - Updated"
    And the program list shows "Full-stack web development program"

  # Programs API edge cases
  # Live UI recon was skipped. These scenarios name the outcome class only.
  # Do not mock PUT or PATCH /api/programs/:id in the scenarios that verify a real save or a real cancel.
  # Fulfill only the synthetic response under test and continue every other request.

  @edge
  Scenario: Edit save returns 503
    Given I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 - Updated"
    And the save request is fulfilled with status 503
    Then the outcome is an error state
    And the live program name stays "Web Development 2026"
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
  Scenario: Edit save returns 400
    Given I am editing "Web Development 2026"
    When the save request is fulfilled with status 400
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Edit save returns 401
    Given I am editing "Web Development 2026"
    When the save request is fulfilled with status 401
    Then the outcome is an authentication message or a redirect to /login
    And this scenario does not assert a specific message string

  @edge
  Scenario: Edit save returns 403
    Given I am editing "Web Development 2026"
    When the save request is fulfilled with status 403
    Then the outcome is an access-denied state if the app renders one
    And the page does not crash
    And this scenario does not assert a specific error string

  @edge
  Scenario: Edit save returns 404
    Given I am editing "Web Development 2026"
    When the save request is fulfilled with status 404
    Then the outcome is an error state if the app renders one
    And the page does not crash
    And this scenario does not assert a specific error string

  @edge
  Scenario: Edit save returns 422
    Given I am editing "Web Development 2026"
    When the save request is fulfilled with status 422
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Edit save returns 409
    Given I am editing "Web Development 2026"
    When the save request is fulfilled with status 409
    Then the outcome is an error state
    And this scenario does not assert a specific error string

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
  Scenario: Edit save returns 500
    Given I am editing "Web Development 2026"
    When the save request is fulfilled with status 500
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Edit save returns 501
    Given I am editing "Web Development 2026"
    When the save request is fulfilled with status 501
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Edit save returns 502
    Given I am editing "Web Development 2026"
    When the save request is fulfilled with status 502
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Edit save returns 200 with a body that has no program object
    Given I am editing "Web Development 2026"
    When the save request is fulfilled with status 200 and a body that has no program object
    Then the app does not crash
    And that response is not treated as a verified live update

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
# - Live UI recon was skipped. DIDAXIS_EMAIL and DIDAXIS_PASSWORD are unset, so validation, error, and empty-state copy were not read from the app. Scenarios name the outcome class only and must not invent those strings.
# - The ticket says the edit form is pre-populated. It does not name every field. This plan checks Program Name and Description only.
# - The ticket does not say whether Save is PUT or PATCH. The synthetic save scenarios may fulfill whichever method the app sends, and must not mock the live save scenarios.
# - Whether an empty name disables Save or shows an error after click is not specified. The empty-name scenario allows a validation error state or a still-disabled Save, and the original name must remain.
# - An axe scan was not run this run. No violations were observed. Do not plan .disableRules() to go green.
