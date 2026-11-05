Feature: DS-275 — Delete program with confirmation
  As an admin user, I want to delete a program I no longer need, with a confirmation step
  so that accidental deletion is prevented.

  Background:
    Given I am logged in as admin

  # Happy paths

  @happy
  Scenario: Delete program with confirmation
    Given a program "Test Program" exists
    When I click the delete icon for "Test Program"
    Then I see a confirmation dialog
    When I confirm deletion
    Then "Test Program" is removed from the program list

  @happy
  Scenario: Cancel program deletion
    Given a program "Test Program" exists
    When I click the delete icon for "Test Program"
    Then I see a confirmation dialog
    When I click Cancel
    Then "Test Program" still exists in the list

  # Negative

  @negative
  Scenario: Dismissing the confirmation does not delete the program
    Given a program "Test Program" exists
    When I click the delete icon for "Test Program"
    And I dismiss the confirmation dialog
    Then the confirmation dialog closes
    And "Test Program" still exists in the list

  @negative
  Scenario: Delete confirmation for one program does not remove another
    Given a program "Test Program" exists
    And a program "Web Development 2026" exists
    When I confirm deletion of "Test Program"
    Then "Test Program" is removed from the program list
    And "Web Development 2026" still exists in the list

  # Edge cases

  @edge
  Scenario: Delete a program whose name contains special characters
    Given a program "Test Program & \"QA\" <275>" exists
    When I confirm deletion of "Test Program & \"QA\" <275>"
    Then "Test Program & \"QA\" <275>" is removed from the program list

  @edge
  Scenario: Confirming deletion once removes the program a single time
    Given a program "Test Program" exists
    When I confirm deletion of "Test Program"
    Then "Test Program" is removed from the program list
    And the list does not show a second row for "Test Program"

  @edge
  Scenario: Deleting the only visible program reaches an empty outcome
    Given "Test Program" is the only program returned in the list
    When I confirm deletion of "Test Program"
    Then the outcome is an empty-state message if the app renders one
    And if the screen renders nothing, the Programs heading stays visible and the page does not crash
    And this scenario does not assert a specific empty-state string

  # Programs API edge cases
  # Live UI recon was skipped. These scenarios name the outcome class only.
  # Do not mock the live DELETE that a happy-path scenario is verifying.
  # Fulfill only the synthetic response under test and continue every other request.

  @edge
  Scenario: Delete save returns 503
    Given a program "Test Program" exists
    When the delete request for "Test Program" is fulfilled with status 503
    Then the outcome is an error state
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
  Scenario: Delete save returns 400
    Given a program "Test Program" exists
    When the delete request for "Test Program" is fulfilled with status 400
    Then the outcome is an error state
    And "Test Program" is not treated as a successful live delete
    And this scenario does not assert a specific error string

  @edge
  Scenario: Delete save returns 422
    Given a program "Test Program" exists
    When the delete request for "Test Program" is fulfilled with status 422
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Delete save returns 409
    Given a program "Test Program" exists
    When the delete request for "Test Program" is fulfilled with status 409
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
  Scenario: Delete save returns 500
    Given a program "Test Program" exists
    When the delete request for "Test Program" is fulfilled with status 500
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Delete save returns 501
    Given a program "Test Program" exists
    When the delete request for "Test Program" is fulfilled with status 501
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Delete save returns 502
    Given a program "Test Program" exists
    When the delete request for "Test Program" is fulfilled with status 502
    Then the outcome is an error state
    And this scenario does not assert a specific error string

  @edge
  Scenario: Delete target returns 404
    Given the Programs page shows "Test Program"
    When the delete request for "Test Program" is fulfilled with status 404
    Then the outcome is an error state or the list refreshes without "Test Program"
    And the app does not crash
    And this scenario does not assert a specific error string

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
# - Live UI recon was skipped. DIDAXIS_EMAIL and DIDAXIS_PASSWORD are unset, so confirmation-dialog, error, and empty-state copy were not read from the app. Scenarios name the outcome class only and must not invent those strings.
# - The ticket does not say whether the confirmation is a native browser dialog or a custom modal, and it does not specify Confirm button text beyond "confirm deletion" and "Cancel".
# - Max program-name length, non-admin permissions, curriculum dependencies, and protected-program rules are not in the acceptance criteria.
# - An axe scan was not run this run. No violations were observed. Do not plan .disableRules() to go green.
# - Do not mock DELETE /api/programs/:id in the scenarios that verify a real delete or a real cancel.
