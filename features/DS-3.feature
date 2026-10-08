Feature: DS-3 — Program name validation and duplicate prevention
  As an admin user, I want the system to prevent invalid or duplicate program names
  so that data integrity is maintained.

  Background:
    Given I am logged in as admin

  # Happy paths

  Scenario: Accept program name with special characters
    Given I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the program name
    And I fill other required fields
    And I click Create
    Then the program is created successfully

  Scenario: Accept alphanumeric program name with hyphens
    Given I am on the program creation form
    When I enter "Web Development 2026 - Cohort A" as the program name
    And I fill in Description with "January 2026 intake"
    And I click Create
    Then the program is created successfully
    And the program list shows "Web Development 2026 - Cohort A"

  Scenario: Edit to unique name succeeds
    Given I am editing "Data Science Fundamentals"
    When I change the Name to "Applied Data Science 2026"
    And I click Save
    Then the program list shows "Applied Data Science 2026"

  Scenario: Accept program name at max length boundary
    Given I am on the program creation form
    When I enter a unique 255-character program name
    And I fill other required fields
    And I click Create
    Then the program is created successfully

  # Negative

  Scenario: Reject program name with only whitespace
    Given I am on the program creation form
    When I enter "   " as the program name
    And I click Create
    Then the form is not submitted
    And the name is trimmed and treated as empty

  Scenario: Reject duplicate program name
    Given a program "Web Development 2026" already exists
    When I try to create a new program with the same name
    Then I see an error indicating the name already exists

  Scenario: Reject duplicate name when editing
    Given programs "Web Development 2026" and "Mobile App Development" exist
    And I am editing "Mobile App Development"
    When I change the Name to "Web Development 2026"
    And I click Save
    Then I see an error indicating the name already exists
    And the program list still shows "Mobile App Development"

  Scenario: Reject empty program name
    Given I am on the program creation form
    When I leave the Program Name field empty
    Then the Create button is disabled
    And the form is not submitted

  Scenario: Reject program name over max length
    Given I am on the program creation form
    When I enter a program name exceeding the maximum allowed length
    And I click Create
    Then the form is not submitted
    And I see a validation error for Program Name length

  # Edge cases

  Scenario: Duplicate check case sensitivity
    Given a program "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "web development 2026" as the program name
    And I fill other required fields
    And I click Create
    Then the duplicate-name validation behavior matches the defined case-sensitivity rule

  Scenario: Trim whitespace before duplicate check
    Given a program "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "  Web Development 2026  " as the program name
    And I click Create
    Then I see an error indicating the name already exists

  Scenario: Unicode characters in program name
    Given I am on the program creation form
    When I enter "日本語プログラム 2026 🎓" as the program name
    And I fill other required fields
    And I click Create
    Then the program name validation follows the defined Unicode policy

  Scenario: HTML in program name is sanitized or rejected
    Given I am on the program creation form
    When I enter "<script>alert('xss')</script>Malicious Program" as the program name
    And I fill other required fields
    And I click Create
    Then no script is executed
    And the program name is stored and displayed safely

  Scenario: Saving unchanged name does not trigger duplicate error
    Given I am editing "Web Development 2026"
    When I leave the Name as "Web Development 2026"
    And I change the Description
    And I click Save
    Then the save succeeds
    And I do not see a duplicate name error

  Scenario: Reject program name with only tabs and newlines
    Given I am on the program creation form
    When I enter a program name containing only tabs and newlines
    And I click Create
    Then the form is not submitted
    And the name is treated as empty

# Ambiguities and gaps in acceptance criteria (for QA review):
# 1. Case sensitivity for duplicate detection is not specified — critical for data integrity.
# 2. Maximum name length is not defined in the ticket.
# 3. Allowed character set beyond the special-characters example is unclear (Unicode, emoji, quotes).
# 4. Duplicate check scope — global uniqueness vs. per-organization/tenant not specified.
# 5. Error message exact wording and field-level vs. form-level placement not defined.
# 6. Edit-flow duplicate rules are only implied; AC focuses on create.
# 7. Soft-deleted programs — whether deleted names can be reused is not specified.
# 8. Trim behavior for internal multiple spaces (e.g., "Web  Development") not defined.
# 9. Real-time vs. on-submit validation for duplicates not specified.
# 10. XSS/sanitization requirements not in ACs but essential for names with <, >, &.
# 11. Observed test environment may allow duplicates (conflicts with DS-3 AC — verify with product).
