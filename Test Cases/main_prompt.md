# Prompt Template "Test Plan" from a Jira Ticket

## Role
You are a senior QA engineer reviewing the feature described below.

## Task
Create a detailed test plan for each test case

- All test cases must be in Gherkin
- Cover every AC with at least one test case
- Add edge cases the ACs don't mention
  (boundary values, empty inputs, special characters, duplicates, max-length)
- Add negative test cases (what should NOT happen)
- Structure each test case as:
  - ID (TC-001, TC-002, etc.)
  - Title (expected behavior, not action)
  - Preconditions
  - Steps (numbered)
  - Expected result
  - Priority (High / Medium / Low)
- Group by: Positive flows, Negative flows, Edge cases

## Output
- Structured test plan in Markdown
- Use real field names and values, not placeholders
- At the end: list any ambiguities or gaps in the ACs
- Create a folder Test Cases then create for each test case subfolder with DS-{x} format
- For each test case store corresponding prompt (the instructions how to create test cases) in the DS-{X}_input.md format under corresponding ticket folder and store DS-{X}_output.md with test cases.

---

## Tickets

### DS-1: Create new academic program

**Description:**
As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

**AC:**

**Scenario: Navigate to program creation form**
- Given I am logged in as admin
- When I navigate to the Programs page
- And I click "+ New Program"
- Then I see the program creation form with fields: Program Name, Description

**Scenario: Successfully create a program**
- Given I am on the program creation form
- When I fill in Program Name with "Web Development 2026"
- And I fill in Description with "Full-stack web development program"
- And I click Create
- Then the modal closes
- And the program list shows "Web Development 2026"

**Scenario: Validation prevents empty program name**
- Given I am on the program creation form
- When I leave the Program Name field empty
- Then the Create button is disabled

---

### DS-2: Edit existing program details

**Description:**
As an admin user, I want to edit an existing program's details so that I can correct or update program information after creation.

**AC:**

**Scenario: Open program for editing**
- Given I am on the Programs page
- And a program "Web Development 2026" exists
- When I click the edit icon on "Web Development 2026"
- Then I see the edit form pre-populated with the program's current data

**Scenario: Successfully edit a program name**
- Given I am editing "Web Development 2026"
- When I change the Name to "Web Development 2026 - Updated"
- And I click Save
- Then the modal closes
- And the program list immediately shows "Web Development 2026 - Updated"

**Scenario: Edit preserves unchanged fields**
- Given I am editing a program
- When I only change the Description
- And I click Save
- Then the Name and other fields remain unchanged

---

### DS-3: Program name validation and duplicate prevention

**Description:**
As an admin user, I want the system to prevent invalid or duplicate program names so that data integrity is maintained.

**AC:**

**Scenario: Reject program name with only whitespace**
- Given I am on the program creation form
- When I enter "   " as the program name
- And I click Create
- Then the form is not submitted (name is trimmed, treated as empty)

**Scenario: Accept program name with special characters**
- Given I am on the program creation form
- When I enter "Informatique & IA - Niveau 2" as the program name
- And I fill other required fields
- And I click Create
- Then the program is created successfully

**Scenario: Reject duplicate program name**
- Given a program "Web Development 2026" already exists
- When I try to create a new program with the same name
- Then I see an error indicating the name already exists

---

### DS-4: Delete program with confirmation

**Description:**
As an admin user, I want to delete a program I no longer need, with a confirmation step to prevent accidental deletion.

**AC:**

**Scenario: Delete program with confirmation**
- Given a program "Test Program" exists
- When I click the delete icon for "Test Program"
- Then I see a confirmation dialog
- When I confirm deletion
- Then "Test Program" is removed from the program list

**Scenario: Cancel program deletion**
- Given I click the delete icon for a program
- When I see the confirmation dialog
- And I click Cancel
- Then the program still exists in the list

---

### DS-5: Program list filtering and display

**Description:**
As an admin user, I want to see all programs in a clear list so that I can quickly find and manage them.

**AC:**

**Scenario: Display program list with key details**
- Given programs exist in the system
- When I navigate to the Programs page
- Then I see a list showing each program's name and description

**Scenario: Empty state when no programs exist**
- Given no programs exist
- When I navigate to the Programs page
- Then I see a message indicating no programs have been created
- And I see a prompt to create the first program
