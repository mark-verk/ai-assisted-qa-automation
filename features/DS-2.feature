Feature: DS-2 — Edit existing program details
  As an admin user, I want to edit an existing program's details
  so that I can correct or update program information after creation.

  Background:
    Given I am logged in as admin

  # Happy paths

  Scenario: Open program for editing
    Given I am on the Programs page
    And a program "Web Development 2026" exists
    When I click the edit icon on "Web Development 2026"
    Then I see the edit form pre-populated with the program's current data

  Scenario: Successfully edit a program name
    Given I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 - Updated"
    And I click Save
    Then the modal closes
    And the program list immediately shows "Web Development 2026 - Updated"

  Scenario: Edit preserves unchanged fields
    Given I am editing a program
    When I only change the Description
    And I click Save
    Then the Name and other fields remain unchanged

  Scenario: Edit both name and description
    Given I am editing "UX Design Foundations"
    When I change the Name to "UX Design Foundations - Professional Track"
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
    When I change the Name to "Web Development 2026 - Draft Change"
    And I change the Description to "Unsaved draft description"
    And I click Cancel
    Then the modal closes
    And the program list shows "Web Development 2026"
    And the description shows "Full-stack web development program"

  Scenario: Reject duplicate name on edit
    Given programs "Web Development 2026" and "Data Science Fundamentals" exist
    And I am editing "Data Science Fundamentals"
    When I change the Name to "Web Development 2026"
    And I click Save
    Then I see an error indicating the name already exists
    And the program list still shows "Data Science Fundamentals"

  Scenario: Non-admin cannot edit programs
    Given I am logged in as a non-admin user
    And a program "Web Development 2026" exists
    When I navigate to the Programs page
    Then I do not see an enabled edit icon for "Web Development 2026"

  # Edge cases

  Scenario: Save with no changes
    Given I am editing "Web Development 2026"
    When I click Save without making changes
    Then the modal closes
    And the program list shows "Web Development 2026"

  Scenario: Reject whitespace-only name on edit
    Given I am editing "Web Development 2026"
    When I change the Name to "   "
    And I click Save
    Then the form is not submitted
    And the program list still shows "Web Development 2026"

  Scenario: Accept special characters in edited name
    Given I am editing "Web Development 2026"
    When I change the Name to "Informatique & IA - Niveau 2 (Édition 2026)"
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
    When I change the Name to "  Cloud Computing Certificate  "
    And I click Save
    Then the program list shows "Cloud Computing Certificate"

  Scenario: Accept max-length name on edit
    Given I am editing "Short Name Program"
    When I change the Name to a 255-character valid name
    And I click Save
    Then the program list shows the updated program name

# Ambiguities and gaps in acceptance criteria (for QA review):
# 1. Field label inconsistency: AC uses "Name" on edit but create uses "Program Name" — assumed same field.
# 2. Duplicate name on edit is not in DS-2 ACs but is required for data integrity.
# 3. Empty name validation on edit is not specified; assumed same rules as create.
# 4. Cancel behavior (Escape, X, unsaved-changes warning) is not in ACs.
# 5. Description optional on edit — unclear if clearing Description is allowed.
# 6. Case-insensitive duplicate check on rename is not defined.
# 7. Optimistic vs. pessimistic UI update on save failure is not specified.
# 8. Edit impact on linked curriculum references is not addressed.
# 9. Concurrent edits by two admins on the same program are not addressed.
# 10. Audit trail / last modified metadata not mentioned for edit operations.
