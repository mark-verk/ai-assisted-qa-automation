# Test Plan: DS-4 — Delete program with confirmation

**Feature:** Delete program with confirmation  
**Role:** Admin user  
**Program under test:** Test Program (and others as noted)

---

## Positive Flows

### TC-001
**Title:** Program is removed from the list after confirming deletion

**Preconditions:**
- Admin user is logged in
- Program **Test Program** exists with description **Program used for QA deletion testing**
- User is on the Programs page

**Steps:**
1. Locate **Test Program** in the program list
2. Click the delete icon for **Test Program**
3. Review the confirmation dialog
4. Click **Confirm** (or **Delete**)

**Expected result:**
- Confirmation dialog appears before deletion
- Dialog references **Test Program** by name
- After confirmation, **Test Program** is removed from the program list
- No error is displayed
- Program count decreases by one

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Delete program with confirmation
  Given a program "Test Program" exists
  When I click the delete icon for "Test Program"
  Then I see a confirmation dialog
  When I confirm deletion
  Then "Test Program" is removed from the program list
```

---

### TC-002
**Title:** Program remains in the list when deletion is cancelled

**Preconditions:**
- Admin user is logged in
- Program **Test Program** exists
- User is on the Programs page

**Steps:**
1. Click the delete icon for **Test Program**
2. Verify confirmation dialog is displayed
3. Click **Cancel**

**Expected result:**
- Dialog closes
- **Test Program** still appears in the program list
- No deletion occurs
- Program data (name, description) is unchanged

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Cancel program deletion
  Given I click the delete icon for a program
  When I see the confirmation dialog
  And I click Cancel
  Then the program still exists in the list
```

---

### TC-003
**Title:** Confirmation dialog displays program name and destructive action warning

**Preconditions:**
- Admin user is logged in
- Program **Test Program** exists

**Steps:**
1. Click the delete icon for **Test Program**

**Expected result:**
- Modal/dialog title indicates deletion (e.g., "Delete Program")
- Body text includes **Test Program** by name
- Warning indicates action may be irreversible (if applicable)
- **Confirm/Delete** and **Cancel** buttons are clearly labeled

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Confirmation dialog shows program identity
  Given a program "Test Program" exists
  When I click the delete icon for "Test Program"
  Then I see a confirmation dialog
  And the dialog mentions "Test Program"
  And the dialog provides Confirm and Cancel actions
```

---

## Negative Flows

### TC-004
**Title:** Program is not deleted when confirmation dialog is dismissed via Escape key

**Preconditions:**
- Admin user is logged in
- Program **Test Program** exists
- Delete confirmation dialog is open

**Steps:**
1. Press **Escape** on the keyboard

**Expected result:**
- Dialog closes
- **Test Program** remains in the list
- No deletion occurs

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Escape dismisses delete dialog without deleting
  Given I clicked the delete icon for "Test Program"
  And I see the confirmation dialog
  When I press Escape
  Then the dialog closes
  And "Test Program" still exists in the list
```

---

### TC-005
**Title:** Program is not deleted when confirmation dialog is closed via X button

**Preconditions:**
- Admin user is logged in
- Program **Test Program** exists
- Delete confirmation dialog is open

**Steps:**
1. Click the **X** (close) control on the dialog

**Expected result:**
- Dialog closes without deleting
- **Test Program** remains in the program list

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Close dialog with X does not delete program
  Given I see the confirmation dialog for "Test Program"
  When I click the close button on the dialog
  Then "Test Program" still exists in the list
```

---

### TC-006
**Title:** Non-admin user cannot delete programs

**Preconditions:**
- Non-admin user is logged in
- Program **Test Program** exists

**Steps:**
1. Navigate to the Programs page
2. Attempt to click the delete icon for **Test Program**

**Expected result:**
- Delete icon is hidden or disabled
- No confirmation dialog appears
- **Test Program** remains in the system

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Non-admin cannot delete programs
  Given I am logged in as a non-admin user
  And a program "Test Program" exists
  When I navigate to the Programs page
  Then I do not see an enabled delete icon for "Test Program"
```

---

### TC-007
**Title:** Deletion fails gracefully when program was already deleted by another session

**Preconditions:**
- Admin user is logged in
- Program **Test Program** existed but was deleted in another browser session
- Programs page shows stale data including **Test Program**

**Steps:**
1. Click delete icon for **Test Program**
2. Confirm deletion in the dialog

**Expected result:**
- System handles stale state gracefully
- User sees appropriate message (e.g., "Program not found" or list refreshes)
- No orphaned UI state; list reflects current server data
- Application does not crash

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Delete already-deleted program shows error
  Given "Test Program" was deleted in another session
  And the Programs page shows stale data for "Test Program"
  When I confirm deletion of "Test Program"
  Then I see an error or the list refreshes without "Test Program"
  And the application remains stable
```

---

## Edge Cases

### TC-008
**Title:** Deleting the last program transitions to empty state

**Preconditions:**
- Admin user is logged in
- **Test Program** is the only program in the system

**Steps:**
1. Click delete icon for **Test Program**
2. Confirm deletion

**Expected result:**
- **Test Program** is removed
- Programs page shows empty state message (see DS-5)
- Prompt to create the first program is visible

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Delete last program shows empty state
  Given "Test Program" is the only program in the system
  When I confirm deletion of "Test Program"
  Then the program list is empty
  And I see a message indicating no programs have been created
  And I see a prompt to create the first program
```

---

### TC-009
**Title:** Double-click on Confirm does not cause duplicate delete requests or errors

**Preconditions:**
- Admin user is logged in
- Program **Test Program** exists
- Delete confirmation dialog is open

**Steps:**
1. Rapidly double-click **Confirm/Delete**

**Expected result:**
- Program is deleted exactly once
- No duplicate API errors shown to user
- Dialog closes cleanly
- List shows consistent state

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Double-click confirm deletes once
  Given I see the confirmation dialog for "Test Program"
  When I double-click Confirm
  Then "Test Program" is removed from the program list
  And no duplicate delete errors are shown
```

---

### TC-010
**Title:** Deleting a program with associated curriculum shows appropriate warning (if applicable)

**Preconditions:**
- Admin user is logged in
- Program **Test Program** exists and has curriculum structure linked

**Steps:**
1. Click delete icon for **Test Program**
2. Review confirmation dialog content

**Expected result:**
- **If cascade delete:** Dialog warns that curriculum will also be deleted
- **If blocked:** Dialog explains program cannot be deleted until curriculum is removed
- Behavior matches product rules for dependent data

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Delete program with curriculum dependency
  Given "Test Program" exists with linked curriculum
  When I click the delete icon for "Test Program"
  Then the confirmation dialog reflects the curriculum dependency policy
```

---

### TC-011
**Title:** Delete icon is not actionable for programs in a protected state (if applicable)

**Preconditions:**
- Admin user is logged in
- Program **Active Published Program** exists in published/active state (if such states exist)

**Steps:**
1. Navigate to Programs page
2. Attempt to delete **Active Published Program**

**Expected result:**
- Delete is disabled or blocked with explanation
- Or additional confirmation/warning is required
- Program is not deleted without explicit override

**Priority:** Low

**Gherkin:**
```gherkin
Scenario: Protected program delete restriction
  Given an "Active Published Program" exists in a protected state
  When I attempt to delete it
  Then deletion is blocked or requires additional confirmation per policy
```

---

### TC-012
**Title:** Confirmation dialog prevents accidental click-through during loading

**Preconditions:**
- Admin user is logged in
- Program **Test Program** exists
- Delete confirmation dialog is open

**Steps:**
1. Click **Confirm**
2. Observe UI while delete request is in progress

**Expected result:**
- **Confirm** button is disabled during request
- User cannot submit duplicate confirmations
- Loading indicator shown if applicable

**Priority:** Low

**Gherkin:**
```gherkin
Scenario: Confirm button disabled during delete request
  Given I see the confirmation dialog for "Test Program"
  When I click Confirm
  Then the Confirm button is disabled until the request completes
```

---

### TC-013
**Title:** Deleted program name can be reused for new program creation (if soft-delete not used)

**Preconditions:**
- Admin user is logged in
- **Test Program** was deleted successfully
- Program creation form is available

**Steps:**
1. Click "+ New Program"
2. Enter `Test Program` in **Program Name**
3. Enter `Recreated program after deletion` in **Description**
4. Click **Create**

**Expected result:**
- **If hard delete:** New program **Test Program** is created successfully
- **If soft delete:** Duplicate error or restore flow applies per spec

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Reuse name after deletion
  Given "Test Program" was deleted
  And I am on the program creation form
  When I fill in Program Name with "Test Program"
  And I fill in Description with "Recreated program after deletion"
  And I click Create
  Then the name reuse behavior matches the deletion policy
```

---

## Ambiguities and Gaps in ACs

| # | Gap / Ambiguity |
|---|-----------------|
| 1 | **Hard vs. soft delete** not specified — affects name reuse (TC-013) and recovery. |
| 2 | **Impact on linked curriculum** not addressed (TC-010) despite feature context of curriculum design. |
| 3 | **Confirmation dialog copy** — exact title, body text, and button labels not defined. |
| 4 | **Dismiss methods** (Escape, X, click outside) not in ACs (TC-004, TC-005). |
| 5 | **Success feedback** after delete (toast, animation) not specified. |
| 6 | **Undo delete** capability not mentioned. |
| 7 | **Non-admin authorization** not in ACs but implied by admin role. |
| 8 | **Concurrent deletion** by two admins on same program not addressed (TC-007). |
| 9 | **Empty state transition** after deleting last program crosses into DS-5 (TC-008). |
| 10 | **Program states** (draft, published, archived) and delete restrictions not defined (TC-011). |
