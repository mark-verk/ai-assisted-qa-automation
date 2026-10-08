Feature: DS-4 — Delete program with confirmation
  As an admin user, I want to delete a program I no longer need, with a confirmation step
  so that accidental deletion is prevented.

  Background:
    Given I am logged in as admin

  # Happy paths

  Scenario: Delete program with confirmation
    Given a program "Test Program" exists
    When I click the delete icon for "Test Program"
    Then I see a confirmation dialog
    When I confirm deletion
    Then "Test Program" is removed from the program list

  Scenario: Cancel program deletion
    Given I click the delete icon for a program
    When I see the confirmation dialog
    And I click Cancel
    Then the program still exists in the list

  Scenario: Confirmation dialog shows program identity
    Given a program "Test Program" exists
    When I click the delete icon for "Test Program"
    Then I see a confirmation dialog
    And the dialog mentions "Test Program"
    And the dialog provides Confirm and Cancel actions

  # Negative

  Scenario: Escape dismisses delete dialog without deleting
    Given I clicked the delete icon for "Test Program"
    And I see the confirmation dialog
    When I press Escape
    Then the dialog closes
    And "Test Program" still exists in the list

  Scenario: Close dialog with X does not delete program
    Given I see the confirmation dialog for "Test Program"
    When I click the close button on the dialog
    Then "Test Program" still exists in the list

  Scenario: Non-admin cannot delete programs
    Given I am logged in as a non-admin user
    And a program "Test Program" exists
    When I navigate to the Programs page
    Then I do not see an enabled delete icon for "Test Program"

  Scenario: Delete already-deleted program shows error
    Given "Test Program" was deleted in another session
    And the Programs page shows stale data for "Test Program"
    When I confirm deletion of "Test Program"
    Then I see an error or the list refreshes without "Test Program"
    And the application remains stable

  # Edge cases

  Scenario: Delete last program shows empty state
    Given "Test Program" is the only program in the system
    When I confirm deletion of "Test Program"
    Then the program list is empty
    And I see a message indicating no programs have been created
    And I see a prompt to create the first program

  Scenario: Double-click confirm deletes once
    Given I see the confirmation dialog for "Test Program"
    When I double-click Confirm
    Then "Test Program" is removed from the program list
    And no duplicate delete errors are shown

  Scenario: Delete program with curriculum dependency
    Given "Test Program" exists with linked curriculum
    When I click the delete icon for "Test Program"
    Then the confirmation dialog reflects the curriculum dependency policy

  Scenario: Protected program delete restriction
    Given an "Active Published Program" exists in a protected state
    When I attempt to delete it
    Then deletion is blocked or requires additional confirmation per policy

  Scenario: Confirm button disabled during delete request
    Given I see the confirmation dialog for "Test Program"
    When I click Confirm
    Then the Confirm button is disabled until the request completes

  Scenario: Reuse name after deletion
    Given "Test Program" was deleted
    And I am on the program creation form
    When I fill in Program Name with "Test Program"
    And I fill in Description with "Recreated program after deletion"
    And I click Create
    Then the name reuse behavior matches the deletion policy

# Ambiguities and gaps in acceptance criteria (for QA review):
# 1. Hard vs. soft delete not specified — affects name reuse and recovery.
# 2. Impact on linked curriculum not addressed despite curriculum design context.
# 3. Confirmation dialog copy — exact title, body text, and button labels not defined.
# 4. Dismiss methods (Escape, X, click outside) not in ACs.
# 5. Success feedback after delete (toast, animation) not specified.
# 6. Undo delete capability not mentioned.
# 7. Non-admin authorization not in ACs but implied by admin role.
# 8. Concurrent deletion by two admins on the same program not addressed.
# 9. Empty state transition after deleting last program crosses into DS-5.
# 10. Program states (draft, published, archived) and delete restrictions not defined.
