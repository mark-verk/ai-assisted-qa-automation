Feature: DS-300 — Create Program rejects a duplicate Program Name
  As an admin, when I create a program with a Program Name that already
  exists, the app must show a duplicate-name error, keep the New Program
  dialog open, and must not create a second row. Regression for Alex
  TC-005 / bug DS-54.

  Background:
    Given I am logged in as admin
    And I am on the Programs page

  # Negative

  Scenario: Reject duplicate Program Name on create
    Given a program "Web Development 2026" already exists with a unique suffix
    And I open the New Program dialog
    When I enter that same Program Name
    And I fill Description with "Another full-stack cohort"
    And I click Create
    Then I see a duplicate-name error in the New Program dialog
    And the New Program dialog stays open
    And exactly one Delete button exists for that Program Name

# Ambiguities / live crawl notes (2026-11-12):
# 1. Live POST /api/programs currently returns 201 for an exact duplicate and creates
#    a second row with no alert in the dialog — bug DS-54. Scenario asserts correct
#    rejection behavior.
# 2. Exact duplicate-error copy is not specified on the ticket. Use the existing
#    NewProgramModal.duplicateNameError pattern
#    (/already exists|name already|duplicate|program with this name|must be unique|already been taken/i).
# 3. Live crawl: dialog closed after duplicate create; alert count 0; Delete button
#    count for the name became 2.
