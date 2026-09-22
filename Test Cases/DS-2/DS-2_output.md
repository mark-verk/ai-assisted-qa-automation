# Test Plan: DS-2 — Edit existing program details

**Feature:** Edit existing program details  
**Role:** Admin user  
**Fields:** Program Name (Name), Description

---

## Positive Flows

### TC-001
**Title:** Edit form opens pre-populated with the selected program's current data

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists with description **Full-stack web development program**
- User is on the Programs page

**Steps:**
1. Locate **Web Development 2026** in the program list
2. Click the edit icon for **Web Development 2026**

**Expected result:**
- Edit form (modal) opens
- **Program Name** field is pre-populated with `Web Development 2026`
- **Description** field is pre-populated with `Full-stack web development program`
- **Save** and **Cancel** controls are visible

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Open program for editing
  Given I am on the Programs page
  And a program "Web Development 2026" exists
  When I click the edit icon on "Web Development 2026"
  Then I see the edit form pre-populated with the program's current data
```

---

### TC-002
**Title:** Updated program name is reflected immediately in the program list

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists
- Edit form for **Web Development 2026** is open

**Steps:**
1. Change **Program Name** from `Web Development 2026` to `Web Development 2026 - Updated`
2. Click **Save**

**Expected result:**
- Edit modal closes
- Program list immediately shows **Web Development 2026 - Updated**
- **Web Development 2026** no longer appears in the list
- Description remains unchanged unless explicitly modified

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Successfully edit a program name
  Given I am editing "Web Development 2026"
  When I change the Name to "Web Development 2026 - Updated"
  And I click Save
  Then the modal closes
  And the program list immediately shows "Web Development 2026 - Updated"
```

---

### TC-003
**Title:** Unchanged fields are preserved when only Description is edited

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists with description **Full-stack web development program**
- Edit form is open for that program

**Steps:**
1. Leave **Program Name** unchanged
2. Change **Description** to `Updated full-stack curriculum with React and Node.js modules`
3. Click **Save**

**Expected result:**
- Modal closes
- Program list shows name **Web Development 2026** (unchanged)
- Description updates to `Updated full-stack curriculum with React and Node.js modules`
- No other program attributes change

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Edit preserves unchanged fields
  Given I am editing a program
  When I only change the Description
  And I click Save
  Then the Name and other fields remain unchanged
```

---

### TC-004
**Title:** Both Program Name and Description can be updated in a single save

**Preconditions:**
- Admin user is logged in
- Program **UX Design Foundations** exists with description **Introductory UX course**
- Edit form is open

**Steps:**
1. Change **Program Name** to `UX Design Foundations - Professional Track`
2. Change **Description** to `Advanced UX research, prototyping, and usability testing`
3. Click **Save**

**Expected result:**
- Both fields update in the program list
- Modal closes without error
- Previous name and description are no longer displayed

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Edit both name and description
  Given I am editing "UX Design Foundations"
  When I change the Name to "UX Design Foundations - Professional Track"
  And I change the Description to "Advanced UX research, prototyping, and usability testing"
  And I click Save
  Then the program list shows "UX Design Foundations - Professional Track"
  And the description shows "Advanced UX research, prototyping, and usability testing"
```

---

## Negative Flows

### TC-005
**Title:** Save is blocked when Program Name is cleared during edit

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists
- Edit form is open

**Steps:**
1. Clear the **Program Name** field completely
2. Leave **Description** unchanged or filled
3. Attempt to click **Save**

**Expected result:**
- **Save** button is disabled or submission is blocked
- Validation message indicates Program Name is required
- Original program **Web Development 2026** remains unchanged in the list

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Cannot save edit with empty program name
  Given I am editing "Web Development 2026"
  When I clear the Program Name field
  Then the Save button is disabled
  And the program list still shows "Web Development 2026"
```

---

### TC-006
**Title:** Cancel discards unsaved edits and preserves original program data

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists with description **Full-stack web development program**
- Edit form is open

**Steps:**
1. Change **Program Name** to `Web Development 2026 - Draft Change`
2. Change **Description** to `Unsaved draft description`
3. Click **Cancel**

**Expected result:**
- Modal closes
- Program list still shows **Web Development 2026**
- Description remains **Full-stack web development program**
- No partial update is persisted

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Cancel edit discards changes
  Given I am editing "Web Development 2026"
  When I change the Name to "Web Development 2026 - Draft Change"
  And I change the Description to "Unsaved draft description"
  And I click Cancel
  Then the modal closes
  And the program list shows "Web Development 2026"
  And the description shows "Full-stack web development program"
```

---

### TC-007
**Title:** Renaming a program to an existing name is rejected

**Preconditions:**
- Admin user is logged in
- Programs **Web Development 2026** and **Data Science Fundamentals** exist
- Edit form for **Data Science Fundamentals** is open

**Steps:**
1. Change **Program Name** to `Web Development 2026`
2. Click **Save**

**Expected result:**
- Form is not submitted successfully
- Error message indicates the name already exists
- Modal remains open
- **Data Science Fundamentals** remains unchanged in the list

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Reject duplicate name on edit
  Given programs "Web Development 2026" and "Data Science Fundamentals" exist
  And I am editing "Data Science Fundamentals"
  When I change the Name to "Web Development 2026"
  And I click Save
  Then I see an error indicating the name already exists
  And the program list still shows "Data Science Fundamentals"
```

---

### TC-008
**Title:** Non-admin user cannot edit program details

**Preconditions:**
- Non-admin user is logged in
- Program **Web Development 2026** exists

**Steps:**
1. Navigate to the Programs page
2. Attempt to click the edit icon for **Web Development 2026**

**Expected result:**
- Edit icon is not visible or is disabled
- Edit form cannot be opened
- Program data remains unchanged

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Non-admin cannot edit programs
  Given I am logged in as a non-admin user
  And a program "Web Development 2026" exists
  When I navigate to the Programs page
  Then I do not see an enabled edit icon for "Web Development 2026"
```

---

## Edge Cases

### TC-009
**Title:** Saving with no changes closes modal without error

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists
- Edit form is open with unchanged values

**Steps:**
1. Do not modify any fields
2. Click **Save**

**Expected result:**
- Modal closes
- Program list unchanged (still shows **Web Development 2026**)
- No duplicate entries created
- No error displayed

**Priority:** Low

**Gherkin:**
```gherkin
Scenario: Save with no changes
  Given I am editing "Web Development 2026"
  When I click Save without making changes
  Then the modal closes
  And the program list shows "Web Development 2026"
```

---

### TC-010
**Title:** Whitespace-only Program Name is rejected on edit

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists
- Edit form is open

**Steps:**
1. Replace **Program Name** with `     ` (spaces only)
2. Click **Save**

**Expected result:**
- Form is not submitted
- Name is trimmed and treated as empty
- Validation prevents save
- Original program name remains in the list

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Reject whitespace-only name on edit
  Given I am editing "Web Development 2026"
  When I change the Name to "   "
  And I click Save
  Then the form is not submitted
  And the program list still shows "Web Development 2026"
```

---

### TC-011
**Title:** Program name with special characters is accepted on edit

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists
- Edit form is open

**Steps:**
1. Change **Program Name** to `Informatique & IA - Niveau 2 (Édition 2026)`
2. Click **Save**

**Expected result:**
- Program saves successfully
- List displays **Informatique & IA - Niveau 2 (Édition 2026)** correctly
- Special and accented characters render properly

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Accept special characters in edited name
  Given I am editing "Web Development 2026"
  When I change the Name to "Informatique & IA - Niveau 2 (Édition 2026)"
  And I click Save
  Then the program list shows "Informatique & IA - Niveau 2 (Édition 2026)"
```

---

### TC-012
**Title:** Description can be cleared during edit if optional

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists with a non-empty description
- Edit form is open

**Steps:**
1. Clear the **Description** field entirely
2. Leave **Program Name** unchanged
3. Click **Save**

**Expected result:**
- Save succeeds (if Description is optional)
- Name remains **Web Development 2026**
- Description is empty or shows defined empty-state in list

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Clear description on edit
  Given I am editing "Web Development 2026"
  When I clear the Description field
  And I click Save
  Then the program list shows "Web Development 2026"
  And the description is empty
```

---

### TC-013
**Title:** Leading and trailing spaces in edited name are trimmed on save

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists
- Edit form is open

**Steps:**
1. Change **Program Name** to `  Cloud Computing Certificate  `
2. Click **Save**

**Expected result:**
- Saved name is **Cloud Computing Certificate** (trimmed)
- No leading/trailing spaces in list display

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Trim spaces from edited program name
  Given I am editing "Web Development 2026"
  When I change the Name to "  Cloud Computing Certificate  "
  And I click Save
  Then the program list shows "Cloud Computing Certificate"
```

---

### TC-014
**Title:** Program name at maximum length boundary is accepted on edit

**Preconditions:**
- Admin user is logged in
- Program **Short Name Program** exists
- Edit form is open

**Steps:**
1. Change **Program Name** to a 255-character valid name
2. Click **Save**

**Expected result:**
- Edit saves successfully
- Full trimmed name is persisted and displayed per UI rules

**Priority:** Low

**Gherkin:**
```gherkin
Scenario: Accept max-length name on edit
  Given I am editing "Short Name Program"
  When I change the Name to a 255-character valid name
  And I click Save
  Then the program list shows the updated program name
```

---

## Ambiguities and Gaps in ACs

| # | Gap / Ambiguity |
|---|-----------------|
| 1 | **Field label inconsistency:** AC uses "Name" in edit scenario but create form uses "Program Name." Assumed same field. |
| 2 | **Duplicate name on edit** is not covered in DS-2 ACs but is required for data integrity (TC-007). |
| 3 | **Empty name validation on edit** is not specified; assumed same rules as create (TC-005, TC-010). |
| 4 | **Cancel behavior** is not in ACs; no specification for Escape, X button, or unsaved-changes warning. |
| 5 | **Description optional on edit** — unclear if clearing Description is allowed (TC-012). |
| 6 | **Case-insensitive duplicate check** on rename is not defined. |
| 7 | **Optimistic vs. pessimistic UI update** — AC says list updates "immediately"; refresh behavior on API failure not specified. |
| 8 | **Edit impact on linked curriculum** — no AC on whether renaming affects curriculum structure references. |
| 9 | **Concurrent edits** by two admins on the same program are not addressed. |
| 10 | **Audit trail / last modified** metadata not mentioned for edit operations. |
