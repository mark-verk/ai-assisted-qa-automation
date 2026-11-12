Feature: DS-299 — Edit Program over-limit name must not drop the original row
  As an admin, when I try to save an Edit Program form with a Program Name
  longer than the allowed maximum (256 characters), the invalid name must
  be rejected and the original program row must remain in the Programs list.
  Regression for Alex TC-007 / bug DS-15.

  Background:
    Given I am logged in as admin
    And I am on the Programs page

  # Negative

  Scenario: Over-limit Program Name on edit is rejected and original row remains
    Given a program "Web Development 2026" exists with a unique suffix
    And I open the Edit Program dialog for that program
    When I change the Program Name to a 256-character string
    And I click Save
    Then the over-limit name is not accepted as the program's saved name
    And the original program row remains visible in the Programs list
    And I can still open Edit for the original program name

# Ambiguities / live crawl notes (2026-11-12):
# 1. Live UI has no maxlength on Program Name; filling 256 chars leaves valueLen=256.
# 2. Live PUT/PATCH currently returns 200 "Program updated" and renames the row to the
#    256-char name — original Edit button count becomes 0. That is bug DS-15; this
#    scenario asserts the correct product behavior (reject + keep original row).
# 3. Ticket does not specify exact validation copy; assert row retention and that the
#    original name remains the listed identity rather than inventing error text.
# 4. Maximum allowed length is treated as 255 (existing DS-2 TC-014 boundary).
