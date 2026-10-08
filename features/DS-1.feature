Feature: DS-1 — Create new academic program
  As an admin user, I want to create a new academic program
  so that I can begin designing its curriculum structure.

  Background:
    Given I am logged in as admin

  # Happy paths

  Scenario: Navigate to program creation form
    When I navigate to the Programs page
    And I click "+ New Program"
    Then I see the program creation form with fields: Program Name, Description

  Scenario: Successfully create a program
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows "Web Development 2026"

  Scenario: Create program with empty description
    Given I am on the program creation form
    When I fill in Program Name with "Data Science Fundamentals"
    And I leave Description empty
    And I click Create
    Then the modal closes
    And the program list shows "Data Science Fundamentals"

  Scenario: Cancel program creation
    Given I am on the program creation form
    When I fill in Program Name with "Temporary Draft Program"
    And I fill in Description with "Draft description"
    And I click Cancel
    Then the modal closes
    And the program list does not show "Temporary Draft Program"

  # Negative

  Scenario: Validation prevents empty program name
    Given I am on the program creation form
    When I leave the Program Name field empty
    Then the Create button is disabled

  Scenario: Whitespace-only program name is rejected on create
    Given I am on the program creation form
    When I enter "   " as the program name
    And I fill in Description with "Valid description text"
    And I attempt to click Create
    Then the form is not submitted
    And no program is created

  Scenario: Non-admin cannot create programs
    Given I am logged in as a non-admin user
    When I navigate to the Programs page
    Then I do not see the "+ New Program" button
    And I cannot open the program creation form

  # Edge cases

  Scenario: Duplicate program name is allowed on create
    Given a program "Web Development 2026" already exists
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Another description"
    And I click Create
    Then the modal closes
    And the program list shows two programs named "Web Development 2026"

  Scenario: Accept program name at max length
    Given I am on the program creation form
    When I fill in Program Name with a 255-character valid name
    And I fill in Description with "Max length validation test"
    And I click Create
    Then the modal closes
    And the program list shows the created program

  Scenario: Long program name without client maxlength
    Given I am on the program creation form
    When I enter a program name longer than 255 characters
    And I click Create
    Then the create action completes or shows a visible validation error
    And the user can still use Cancel or close to dismiss the modal

  Scenario: Accept program name with special characters
    Given I am on the program creation form
    When I fill in Program Name with "Informatique & IA - Niveau 2"
    And I fill in Description with "Programme bilingue avec caractères spéciaux"
    And I click Create
    Then the modal closes
    And the program list shows "Informatique & IA - Niveau 2"

  Scenario: Accept description at max length
    Given I am on the program creation form
    When I fill in Program Name with "Cybersecurity Essentials"
    And I fill in Description with a 2000-character description
    And I click Create
    Then the modal closes
    And the program list shows "Cybersecurity Essentials"

  Scenario: Trim leading and trailing spaces from program name
    Given I am on the program creation form
    When I fill in Program Name with "  Mobile App Development  "
    And I fill in Description with "iOS and Android development track"
    And I click Create
    Then the modal closes
    And the program list shows "Mobile App Development"

  Scenario: Dismiss create program modal with Escape
    Given I am on the program creation form
    When I fill in Program Name with "Draft Program"
    And I press Escape
    Then the modal closes
    And the program list does not show "Draft Program"

  Scenario: Create form shows core and AI config fields
    Given I am on the program creation form
    Then I see fields Program Name and Description
    And I see Total Program Hours and AI Generation Config controls

# Ambiguities and gaps in acceptance criteria (for QA review):
# 1. Description required? ACs require Program Name but do not state whether Description is optional.
# 2. Maximum field lengths are not specified in the ticket; 255/2000/256+ scenarios probe observed UI behavior.
# 3. Duplicate names: DS-3 may expect rejection; test environment may allow duplicates (see duplicate scenario).
# 4. Whitespace trimming is detailed in DS-3 but affects the DS-1 create flow.
# 5. Success feedback beyond modal close and list update is unspecified (toast, row highlight, etc.).
# 6. Non-admin access control is implied by "logged in as admin" but not stated in ACs.
# 7. Cancel/close behavior (Escape, X, click-outside) is not in ACs.
# 8. Case sensitivity for program names is undefined.
# 9. Post-create navigation (stay on list vs. open curriculum design) is unclear.
