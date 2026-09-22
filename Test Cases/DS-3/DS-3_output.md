# Test Plan: DS-3 — Program name validation and duplicate prevention

**Feature:** Program name validation and duplicate prevention  
**Role:** Admin user  
**Context:** Program creation and edit forms

---

## Positive Flows

### TC-001
**Title:** Program name containing special characters and accents is accepted

**Preconditions:**
- Admin user is logged in
- Program creation form is open
- No program named **Informatique & IA - Niveau 2** exists

**Steps:**
1. Enter `Informatique & IA - Niveau 2` in **Program Name**
2. Enter `Programme de formation avancée en intelligence artificielle` in **Description**
3. Click **Create**

**Expected result:**
- Program is created successfully
- Modal closes
- List displays **Informatique & IA - Niveau 2** with characters rendered correctly
- Ampersand, hyphen, and accented characters are preserved

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Accept program name with special characters
  Given I am on the program creation form
  When I enter "Informatique & IA - Niveau 2" as the program name
  And I fill other required fields
  And I click Create
  Then the program is created successfully
```

---

### TC-002
**Title:** Valid alphanumeric program name with hyphens and numbers is accepted

**Preconditions:**
- Admin user is logged in
- Program creation form is open

**Steps:**
1. Enter `Web Development 2026 - Cohort A` in **Program Name**
2. Enter `January 2026 intake` in **Description**
3. Click **Create**

**Expected result:**
- Program is created successfully
- Name stored and displayed exactly as entered (after trim if applicable)

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Accept alphanumeric program name with hyphens
  Given I am on the program creation form
  When I enter "Web Development 2026 - Cohort A" as the program name
  And I fill in Description with "January 2026 intake"
  And I click Create
  Then the program is created successfully
  And the program list shows "Web Development 2026 - Cohort A"
```

---

### TC-003
**Title:** Renaming a program to a unique valid name succeeds

**Preconditions:**
- Admin user is logged in
- Programs **Web Development 2026** and **Data Science Fundamentals** exist
- Edit form for **Data Science Fundamentals** is open

**Steps:**
1. Change **Program Name** to `Applied Data Science 2026`
2. Click **Save**

**Expected result:**
- Save succeeds with no duplicate error
- List shows **Applied Data Science 2026**
- **Data Science Fundamentals** no longer appears

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Edit to unique name succeeds
  Given I am editing "Data Science Fundamentals"
  When I change the Name to "Applied Data Science 2026"
  And I click Save
  Then the program list shows "Applied Data Science 2026"
```

---

## Negative Flows

### TC-004
**Title:** Whitespace-only program name is rejected and form is not submitted

**Preconditions:**
- Admin user is logged in
- Program creation form is open

**Steps:**
1. Enter `   ` in **Program Name**
2. Enter `Valid description` in **Description**
3. Click **Create**

**Expected result:**
- Form is not submitted
- Name is trimmed and treated as empty
- **Create** is disabled or validation error is shown
- No program record is created

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Reject program name with only whitespace
  Given I am on the program creation form
  When I enter "   " as the program name
  And I click Create
  Then the form is not submitted
  And the name is trimmed and treated as empty
```

---

### TC-005
**Title:** Duplicate program name is rejected on create with clear error message

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** already exists
- Program creation form is open

**Steps:**
1. Enter `Web Development 2026` in **Program Name**
2. Enter `Duplicate attempt description` in **Description**
3. Click **Create**

**Expected result:**
- Form is not submitted successfully
- Error message states the program name already exists (e.g., "A program with this name already exists")
- Modal remains open with user input preserved
- Only one **Web Development 2026** exists in the list

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Reject duplicate program name
  Given a program "Web Development 2026" already exists
  When I try to create a new program with the same name
  Then I see an error indicating the name already exists
```

---

### TC-006
**Title:** Duplicate program name is rejected when editing a different program

**Preconditions:**
- Admin user is logged in
- Programs **Web Development 2026** and **Mobile App Development** exist
- Edit form for **Mobile App Development** is open

**Steps:**
1. Change **Program Name** to `Web Development 2026`
2. Click **Save**

**Expected result:**
- Save is blocked
- Duplicate name error is displayed
- **Mobile App Development** remains unchanged in the list

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Reject duplicate name when editing
  Given programs "Web Development 2026" and "Mobile App Development" exist
  And I am editing "Mobile App Development"
  When I change the Name to "Web Development 2026"
  And I click Save
  Then I see an error indicating the name already exists
  And the program list still shows "Mobile App Development"
```

---

### TC-007
**Title:** Empty program name is rejected on create

**Preconditions:**
- Admin user is logged in
- Program creation form is open

**Steps:**
1. Leave **Program Name** empty
2. Enter `Description without name` in **Description**
3. Attempt to click **Create**

**Expected result:**
- **Create** button is disabled
- Form cannot be submitted
- No program is created

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Reject empty program name
  Given I am on the program creation form
  When I leave the Program Name field empty
  Then the Create button is disabled
  And the form is not submitted
```

---

### TC-008
**Title:** Program name exceeding maximum length is rejected

**Preconditions:**
- Admin user is logged in
- Program creation form is open

**Steps:**
1. Enter a program name longer than the maximum allowed length (assume >255 characters)
2. Enter `Length validation test` in **Description**
3. Click **Create**

**Expected result:**
- Form is not submitted
- Validation error indicates name exceeds maximum length
- No program is created

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Reject program name over max length
  Given I am on the program creation form
  When I enter a program name exceeding the maximum allowed length
  And I click Create
  Then the form is not submitted
  And I see a validation error for Program Name length
```

---

## Edge Cases

### TC-009
**Title:** Duplicate check is case-sensitive (or case-insensitive — verify defined behavior)

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists
- Program creation form is open

**Steps:**
1. Enter `web development 2026` in **Program Name** (all lowercase)
2. Enter `Case sensitivity test` in **Description**
3. Click **Create**

**Expected result:**
- **If case-insensitive:** Creation is blocked with duplicate error
- **If case-sensitive:** Program is created as distinct entry
- Behavior must match product specification consistently across create and edit

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Duplicate check case sensitivity
  Given a program "Web Development 2026" already exists
  And I am on the program creation form
  When I enter "web development 2026" as the program name
  And I fill other required fields
  And I click Create
  Then the duplicate-name validation behavior matches the defined case-sensitivity rule
```

---

### TC-010
**Title:** Leading and trailing whitespace is trimmed before duplicate validation

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists
- Program creation form is open

**Steps:**
1. Enter `  Web Development 2026  ` in **Program Name**
2. Enter `Trim before duplicate check` in **Description**
3. Click **Create**

**Expected result:**
- After trim, name matches existing **Web Development 2026**
- Duplicate error is shown
- No second program is created

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Trim whitespace before duplicate check
  Given a program "Web Development 2026" already exists
  And I am on the program creation form
  When I enter "  Web Development 2026  " as the program name
  And I click Create
  Then I see an error indicating the name already exists
```

---

### TC-011
**Title:** Program name with Unicode characters (e.g., CJK, emoji) is handled per spec

**Preconditions:**
- Admin user is logged in
- Program creation form is open

**Steps:**
1. Enter `日本語プログラム 2026 🎓` in **Program Name**
2. Enter `Unicode name validation test` in **Description**
3. Click **Create**

**Expected result:**
- **If Unicode allowed:** Program created and displayed correctly
- **If restricted:** Clear validation error listing allowed character set
- No corrupted or mojibake display in list

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Unicode characters in program name
  Given I am on the program creation form
  When I enter "日本語プログラム 2026 🎓" as the program name
  And I fill other required fields
  And I click Create
  Then the program name validation follows the defined Unicode policy
```

---

### TC-012
**Title:** Program name with HTML/script tags is sanitized or rejected

**Preconditions:**
- Admin user is logged in
- Program creation form is open

**Steps:**
1. Enter `<script>alert('xss')</script>Malicious Program` in **Program Name**
2. Enter `XSS prevention test` in **Description**
3. Click **Create**

**Expected result:**
- Script is not executed in list or form
- Name is either rejected with validation error or stored as plain text with tags escaped
- No XSS vulnerability in program list rendering

**Priority:** High

**Gherkin:**
```gherkin
Scenario: HTML in program name is sanitized or rejected
  Given I am on the program creation form
  When I enter "<script>alert('xss')</script>Malicious Program" as the program name
  And I fill other required fields
  And I click Create
  Then no script is executed
  And the program name is stored and displayed safely
```

---

### TC-013
**Title:** Editing a program to the same name (no change) is allowed

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists
- Edit form is open

**Steps:**
1. Leave **Program Name** as `Web Development 2026`
2. Update **Description** only
3. Click **Save**

**Expected result:**
- Save succeeds without duplicate error
- Program remains **Web Development 2026**

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Saving unchanged name does not trigger duplicate error
  Given I am editing "Web Development 2026"
  When I leave the Name as "Web Development 2026"
  And I change the Description
  And I click Save
  Then the save succeeds
  And I do not see a duplicate name error
```

---

### TC-014
**Title:** Program name with only tabs and newlines is treated as empty

**Preconditions:**
- Admin user is logged in
- Program creation form is open

**Steps:**
1. Enter `\t\n\t` (tab and newline characters) in **Program Name**
2. Enter `Whitespace variant test` in **Description**
3. Click **Create**

**Expected result:**
- Form is not submitted
- Name treated as empty after trim/normalization
- No program created

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Reject program name with only tabs and newlines
  Given I am on the program creation form
  When I enter a program name containing only tabs and newlines
  And I click Create
  Then the form is not submitted
  And the name is treated as empty
```

---

### TC-015
**Title:** Program name at exact maximum length boundary is accepted

**Preconditions:**
- Admin user is logged in
- Program creation form is open
- No duplicate of the 255-character name exists

**Steps:**
1. Enter a unique 255-character program name
2. Enter `Boundary test` in **Description**
3. Click **Create**

**Expected result:**
- Program created successfully
- Name stored at max length without truncation

**Priority:** Low

**Gherkin:**
```gherkin
Scenario: Accept program name at max length boundary
  Given I am on the program creation form
  When I enter a unique 255-character program name
  And I fill other required fields
  And I click Create
  Then the program is created successfully
```

---

## Ambiguities and Gaps in ACs

| # | Gap / Ambiguity |
|---|-----------------|
| 1 | **Case sensitivity** for duplicate detection is not specified (TC-009). Critical for data integrity. |
| 2 | **Maximum name length** is not defined (TC-008, TC-015). |
| 3 | **Allowed character set** beyond "special characters accepted" example is unclear — Unicode, emoji, slashes, quotes not defined (TC-011). |
| 4 | **Duplicate check scope** — global uniqueness vs. per-organization/tenant not specified. |
| 5 | **Error message exact wording** and field-level vs. form-level error placement not defined. |
| 6 | **Edit flow duplicate rules** only implied; AC focuses on create (TC-006). |
| 7 | **Soft-deleted programs** — whether deleted program names can be reused is not specified. |
| 8 | **Trim behavior** for internal multiple spaces (e.g., `Web  Development`) not defined. |
| 9 | **Real-time vs. on-submit validation** for duplicates not specified. |
| 10 | **XSS/sanitization** requirements not in ACs but essential for names with `<`, `>`, `&` (TC-012). |
