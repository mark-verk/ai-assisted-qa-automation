Feature: DS-5 — Program list filtering and display
  As an admin user, I want to see all programs in a clear list
  so that I can quickly find and manage them.

  Background:
    Given I am logged in as admin

  # Happy paths

  Scenario: Display program list with key details
    Given programs exist in the system
    When I navigate to the Programs page
    Then I see a list showing each program's name and description

  Scenario: Empty state when no programs exist
    Given no programs exist
    When I navigate to the Programs page
    Then I see a message indicating no programs have been created
    And I see a prompt to create the first program

  Scenario: List updates after creating a program
    Given I am on the Programs page
    When I create a program "Cloud Computing Certificate" with description "AWS and Azure fundamentals"
    Then the program list shows "Cloud Computing Certificate"
    And the description shows "AWS and Azure fundamentals"

  Scenario: List updates after editing a program
    Given I am on the Programs page
    And a program "Web Development 2026" exists
    When I edit "Web Development 2026" and change the Description to "Updated curriculum for 2026"
    And I save the changes
    Then the program list shows description "Updated curriculum for 2026" for "Web Development 2026"

  # Negative

  Scenario: Unauthenticated user cannot view programs list
    Given I am not logged in
    When I navigate to the Programs page
    Then I am redirected to the login page
    And I do not see the program list

  Scenario: Non-admin programs page access
    Given I am logged in as a non-admin user
    And programs exist in the system
    When I navigate to the Programs page
    Then I see the access level defined for non-admin users
    And I do not see admin-only actions unless permitted

  Scenario: Error state when program list fails to load
    Given the programs API is unavailable
    When I navigate to the Programs page
    Then I see an error message
    And I do not see a misleading empty-state message

  # Edge cases

  Scenario: Display program with empty description
    Given a program "Minimal Program" exists with no description
    When I navigate to the Programs page
    Then I see "Minimal Program" in the list
    And the description is shown as empty or with a defined placeholder

  Scenario: Long name and description display
    Given a program with a very long name and description exists
    When I navigate to the Programs page
    Then the program row displays without layout breakage
    And long text follows the defined truncation or wrapping rules

  Scenario: Special characters in list display
    Given a program "Informatique & IA - Niveau 2" exists
    When I navigate to the Programs page
    Then I see "Informatique & IA - Niveau 2" displayed correctly in the list

  Scenario: Large program list pagination
    Given 50 or more programs exist in the system
    When I navigate to the Programs page
    Then I can view all programs via pagination or scrolling
    And each program shows its name and description

  Scenario: Empty state create prompt opens form
    Given no programs exist
    And I am on the Programs page
    When I click the prompt to create the first program
    Then I see the program creation form

  Scenario: Consistent list sort order
    Given programs "Alpha Program", "Beta Program", and "Gamma Program" exist
    When I navigate to the Programs page
    Then the programs appear in a consistent defined order
    And the order remains the same after page refresh

  Scenario: List updates after deleting a program
    Given I am on the Programs page
    And programs "Test Program" and "Web Development 2026" exist
    When I delete "Test Program" and confirm
    Then the program list no longer shows "Test Program"
    And the program list still shows "Web Development 2026"

  Scenario: Single program list display
    Given only "Web Development 2026" exists
    When I navigate to the Programs page
    Then I see one program row for "Web Development 2026"
    And I do not see the empty-state message

# Ambiguities and gaps in acceptance criteria (for QA review):
# 1. "Filtering" in the title but no AC covers search, filter, or sort — only display.
# 2. List sort order not specified.
# 3. Pagination vs. infinite scroll threshold not defined.
# 4. Empty description display rules not specified.
# 5. Long text truncation rules not defined.
# 6. Additional columns (created date, status, actions) not mentioned in ACs.
# 7. Empty state exact copy and CTA label not defined.
# 8. Loading state while fetching programs not specified.
# 9. Error state for failed API not in ACs.
# 10. Non-admin read access unclear — can instructors view the list read-only?
# 11. Real-time updates when another admin adds/edits/deletes not addressed.
# 12. Responsive/mobile layout for the program list not specified.
