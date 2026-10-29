Feature: DS-3 — Program name validation and duplicate prevention
  As an admin user, I want the system to prevent invalid or duplicate program names
  so that data integrity is maintained.

  Background:
    Given I am logged in as admin

  # Happy paths

  Scenario: Accept program name with special characters
    Given I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the program name
    And I fill in Description with "Programme bilingue avec caractères spéciaux"
    And I click Create
    Then the modal closes
    And the program list shows "Informatique & IA - Niveau 2"

  Scenario: Trim leading and trailing spaces from a unique program name
    Given I am on the program creation form
    When I enter "  Mobile App Development  " as the program name
    And I fill in Description with "iOS and Android development track"
    And I click Create
    Then the modal closes
    And the program list shows "Mobile App Development"

  Scenario: Create a program when Description is left empty
    Given I am on the program creation form
    When I enter "Data Science Fundamentals" as the program name
    And I leave Description empty
    And I click Create
    Then the modal closes
    And the program list shows "Data Science Fundamentals"

  # Negative

  Scenario: Reject program name with only whitespace
    Given I am on the program creation form
    When I enter "   " as the program name
    And I click Create
    Then the form is not submitted
    And the New Program modal stays open
    And no program named "   " is created

  Scenario: Reject empty program name
    Given I am on the program creation form
    When I leave the Program Name field empty
    Then the Create button is disabled
    And the form is not submitted

  Scenario: Reject duplicate program name
    Given a program "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "Web Development 2026" as the program name
    And I fill in Description with "Another full-stack cohort"
    And I click Create
    Then I see an error indicating the name already exists
    And the New Program modal stays open
    And no additional program named "Web Development 2026" is created

  Scenario: Reject a duplicate that differs only by surrounding whitespace
    Given a program "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "  Web Development 2026  " as the program name
    And I fill in Description with "Padded duplicate attempt"
    And I click Create
    Then I see an error indicating the name already exists
    And no additional program named "Web Development 2026" is created

  # Edge cases

  Scenario: Accept a single-character program name
    Given I am on the program creation form
    When I enter "A" as the program name
    And I fill in Description with "Single character name"
    And I click Create
    Then the modal closes
    And the program list shows "A"

  Scenario: Cancel does not create a program
    Given I am on the program creation form
    When I enter "Temporary Draft Program" as the program name
    And I fill in Description with "Should not be saved"
    And I click Cancel
    Then the modal closes
    And the program list does not show "Temporary Draft Program"

  Scenario: Internal double spaces are preserved as part of the name
    Given I am on the program creation form
    When I enter "Web  Development  2026" as the program name
    And I fill in Description with "Internal spacing check"
    And I click Create
    Then the modal closes
    And the program list shows "Web  Development  2026"

# Ambiguities and gaps in acceptance criteria (for QA review):
# 1. Only Program Name is required. Description is optional. "Fill other required fields" in the special-character AC has no additional required fields on the live New Program dialog.
# 2. Whitespace-only ("   ") leaves Create disabled and sends no POST. The field still displays the spaces. The AC says the name is trimmed and treated as empty; it does not require a visible error message.
# 3. Duplicate rejection copy is not specified. The observable result is an error indicating the name already exists, the New Program dialog stays open, and no second row is created.
# 4. Live check on 2026-10-29: POST /api/programs returned 201 "Program created" for an exact duplicate, with no alert in the dialog. That contradicts the duplicate AC. Scenarios above keep the ticket's expected behavior.
# 5. Leading and trailing spaces are trimmed before save. A padded unique name is stored without the padding. A padded copy of an existing name is therefore a duplicate and must be rejected.
# 6. Case sensitivity is not defined. A lowercased copy of an existing name was accepted and stored as a distinct program. Not asserted here.
# 7. No maxlength is set on Program Name. Names of 100 and 101 characters were both accepted. The ticket does not define a maximum, so over-length rejection is not a scenario.
# 8. The shared environment already contains "Informatique & IA - Niveau 2" and "Web Development 2026". Automated runs need a unique suffix that preserves those characters, or AC2 will collide with AC3.
# 9. Uniqueness on edit/rename is not in these ACs. DS-2 covers duplicate names on edit.
# 10. Success feedback beyond modal close and the program list is not specified. The create API returns message "Program created".
# 11. AI Generation Config (Total Program Hours, session/exam hours, audience, focus areas) is on the dialog and is out of scope for DS-3.
