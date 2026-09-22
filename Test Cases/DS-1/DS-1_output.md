# Test Plan: DS-1 — Create new academic program

**Feature:** Create new academic program  
**Role:** Admin user  
**Fields:** Program Name, Description

---

## Positive Flows

### TC-001
**Title:** Program creation form displays required fields after clicking "+ New Program"

**Preconditions:**
- Admin user is logged in
- User is on the Programs page

**Steps:**
1. Navigate to the Programs page
2. Click the "+ New Program" button

**Expected result:**
- A program creation form (modal) opens
- The form displays a **Program Name** text field
- The form displays a **Description** text area or text field
- A **Create** button is visible
- A cancel/close control is visible

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Navigate to program creation form
  Given I am logged in as admin
  When I navigate to the Programs page
  And I click "+ New Program"
  Then I see the program creation form with fields: Program Name, Description
```

---

### TC-002
**Title:** New program appears in the list after successful creation

**Preconditions:**
- Admin user is logged in
- Program creation form is open
- No existing program named "Web Development 2026" exists

**Steps:**
1. Enter `Web Development 2026` in the **Program Name** field
2. Enter `Full-stack web development program` in the **Description** field
3. Click **Create**

**Expected result:**
- The creation modal closes
- The Programs list refreshes and displays **Web Development 2026**
- The new row shows description **Full-stack web development program**
- No error message is displayed

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Successfully create a program
  Given I am on the program creation form
  When I fill in Program Name with "Web Development 2026"
  And I fill in Description with "Full-stack web development program"
  And I click Create
  Then the modal closes
  And the program list shows "Web Development 2026"
```

---

### TC-003
**Title:** Program can be created with an empty Description when Program Name is provided

**Preconditions:**
- Admin user is logged in
- Program creation form is open
- No existing program named "Data Science Fundamentals" exists

**Steps:**
1. Enter `Data Science Fundamentals` in the **Program Name** field
2. Leave the **Description** field empty
3. Click **Create**

**Expected result:**
- The program is created successfully
- The modal closes
- **Data Science Fundamentals** appears in the program list
- Description displays as empty, blank, or a defined empty-state placeholder (e.g., "—")

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Create program with empty description
  Given I am on the program creation form
  When I fill in Program Name with "Data Science Fundamentals"
  And I leave Description empty
  And I click Create
  Then the modal closes
  And the program list shows "Data Science Fundamentals"
```

---

### TC-004
**Title:** Cancel closes the creation form without adding a program

**Preconditions:**
- Admin user is logged in
- Program creation form is open

**Steps:**
1. Enter `Temporary Draft Program` in **Program Name**
2. Enter `Draft description` in **Description**
3. Click **Cancel** (or close the modal via X / Escape)

**Expected result:**
- The modal closes
- **Temporary Draft Program** does not appear in the program list
- No program record is created

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Cancel program creation
  Given I am on the program creation form
  When I fill in Program Name with "Temporary Draft Program"
  And I fill in Description with "Draft description"
  And I click Cancel
  Then the modal closes
  And the program list does not show "Temporary Draft Program"
```

---

## Negative Flows

### TC-005
**Title:** Create button remains disabled when Program Name is empty

**Preconditions:**
- Admin user is logged in
- Program creation form is open

**Steps:**
1. Leave the **Program Name** field empty
2. Optionally enter text in **Description**
3. Observe the **Create** button state

**Expected result:**
- The **Create** button is disabled
- The form cannot be submitted by clicking **Create**
- No program is created

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Validation prevents empty program name
  Given I am on the program creation form
  When I leave the Program Name field empty
  Then the Create button is disabled
```

---

### TC-006
**Title:** Form is not submitted when Program Name contains only whitespace

**Preconditions:**
- Admin user is logged in
- Program creation form is open

**Steps:**
1. Enter `   ` (spaces only) in **Program Name**
2. Enter `Valid description text` in **Description**
3. Attempt to click **Create** (if enabled) or submit via Enter key

**Expected result:**
- The form is not submitted
- Whitespace is trimmed and treated as empty
- **Create** remains disabled or submission is blocked with validation feedback
- No program is created

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Whitespace-only program name is rejected on create
  Given I am on the program creation form
  When I enter "   " as the program name
  And I fill in Description with "Valid description text"
  And I attempt to click Create
  Then the form is not submitted
  And no program is created
```

---

### TC-007
**Title:** Duplicate program name is rejected during creation

**Preconditions:**
- Admin user is logged in
- A program named **Web Development 2026** already exists
- Program creation form is open

**Steps:**
1. Enter `Web Development 2026` in **Program Name**
2. Enter `Another description` in **Description**
3. Click **Create**

**Expected result:**
- The form is not submitted successfully
- An error message indicates the program name already exists
- The modal remains open with entered values preserved
- No duplicate program appears in the list

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Reject duplicate program name on create
  Given a program "Web Development 2026" already exists
  And I am on the program creation form
  When I fill in Program Name with "Web Development 2026"
  And I fill in Description with "Another description"
  And I click Create
  Then I see an error indicating the name already exists
  And the program list contains only one "Web Development 2026"
```

---

### TC-008
**Title:** Non-admin user cannot access program creation

**Preconditions:**
- A non-admin user (e.g., instructor or student role) is logged in

**Steps:**
1. Navigate to the Programs page
2. Attempt to locate and click "+ New Program"

**Expected result:**
- The "+ New Program" button is hidden or disabled
- If accessed via direct URL, creation is blocked with authorization error
- No program creation form is available to the non-admin user

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Non-admin cannot create programs
  Given I am logged in as a non-admin user
  When I navigate to the Programs page
  Then I do not see the "+ New Program" button
  And I cannot open the program creation form
```

---

## Edge Cases

### TC-009
**Title:** Program name at maximum allowed length is accepted

**Preconditions:**
- Admin user is logged in
- Program creation form is open
- Maximum Program Name length is defined (assume 255 characters unless specified otherwise)

**Steps:**
1. Enter a Program Name of exactly 255 characters: `Advanced Cloud Architecture and DevOps Engineering Certification Track for Enterprise Solutions 2026 Edition Extended Program Name To Reach Maximum Allowed Character Limit For Academic Programs In The System Admin Portal Form Validation Testing Purposes Only End`
2. Enter `Max length validation test` in **Description**
3. Click **Create**

**Expected result:**
- The program is created successfully
- The full name is stored and displayed (or truncated consistently in list view with full name on detail/hover)
- No validation error is shown

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Accept program name at max length
  Given I am on the program creation form
  When I fill in Program Name with a 255-character valid name
  And I fill in Description with "Max length validation test"
  And I click Create
  Then the modal closes
  And the program list shows the created program
```

---

### TC-010
**Title:** Program name exceeding maximum length is rejected

**Preconditions:**
- Admin user is logged in
- Program creation form is open

**Steps:**
1. Enter a Program Name of 256 characters (one over assumed max)
2. Enter `Over limit test` in **Description**
3. Attempt to click **Create**

**Expected result:**
- The form is not submitted
- A validation message indicates the name exceeds maximum length
- **Create** is disabled or submission is blocked

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Reject program name over max length
  Given I am on the program creation form
  When I enter a program name longer than the maximum allowed length
  And I click Create
  Then the form is not submitted
  And I see a validation error for Program Name length
```

---

### TC-011
**Title:** Program name with special characters is accepted

**Preconditions:**
- Admin user is logged in
- Program creation form is open
- No program named **Informatique & IA - Niveau 2** exists

**Steps:**
1. Enter `Informatique & IA - Niveau 2` in **Program Name**
2. Enter `Programme bilingue avec caractères spéciaux` in **Description**
3. Click **Create**

**Expected result:**
- The program is created successfully
- Name displays correctly as **Informatique & IA - Niveau 2** in the list
- Special characters are not escaped or corrupted in the UI

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Accept program name with special characters
  Given I am on the program creation form
  When I fill in Program Name with "Informatique & IA - Niveau 2"
  And I fill in Description with "Programme bilingue avec caractères spéciaux"
  And I click Create
  Then the modal closes
  And the program list shows "Informatique & IA - Niveau 2"
```

---

### TC-012
**Title:** Description at maximum allowed length is accepted

**Preconditions:**
- Admin user is logged in
- Program creation form is open

**Steps:**
1. Enter `Cybersecurity Essentials` in **Program Name**
2. Enter a Description of exactly the maximum allowed length (assume 2000 characters)
3. Click **Create**

**Expected result:**
- The program is created successfully
- Full description is persisted
- List view handles long description per UI rules (truncate with ellipsis or show full text)

**Priority:** Low

**Gherkin:**
```gherkin
Scenario: Accept description at max length
  Given I am on the program creation form
  When I fill in Program Name with "Cybersecurity Essentials"
  And I fill in Description with a 2000-character description
  And I click Create
  Then the modal closes
  And the program list shows "Cybersecurity Essentials"
```

---

### TC-013
**Title:** Leading and trailing spaces in Program Name are trimmed on save

**Preconditions:**
- Admin user is logged in
- Program creation form is open
- No program named **Mobile App Development** exists

**Steps:**
1. Enter `  Mobile App Development  ` in **Program Name**
2. Enter `iOS and Android development track` in **Description**
3. Click **Create**

**Expected result:**
- Program is saved as **Mobile App Development** (trimmed)
- List displays trimmed name without leading/trailing spaces

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Trim leading and trailing spaces from program name
  Given I am on the program creation form
  When I fill in Program Name with "  Mobile App Development  "
  And I fill in Description with "iOS and Android development track"
  And I click Create
  Then the modal closes
  And the program list shows "Mobile App Development"
```

---

## Ambiguities and Gaps in ACs

| # | Gap / Ambiguity |
|---|-----------------|
| 1 | **Description required?** ACs imply Program Name is required but do not state whether Description is optional. TC-003 assumes it is optional. |
| 2 | **Maximum field lengths** not specified for Program Name or Description. TC-009–TC-012 assume 255 and 2000 characters respectively. |
| 3 | **Duplicate name handling** is not in DS-1 ACs but is critical for create flow; covered in TC-007 (also DS-3). |
| 4 | **Whitespace trimming** behavior is defined in DS-3 but affects DS-1 create flow; included here for completeness. |
| 5 | **Success feedback** beyond modal close and list update is unspecified (toast notification, highlight new row, etc.). |
| 6 | **Non-admin access control** is not mentioned in ACs but is implied by "logged in as admin." |
| 7 | **Cancel / close behavior** is not in ACs; no specification for Escape key, X button, or click-outside-to-dismiss. |
| 8 | **Case sensitivity** for program names is not defined (relevant to duplicates). |
| 9 | **Post-create navigation** is unclear — should user land on curriculum design for the new program or remain on the list? |
