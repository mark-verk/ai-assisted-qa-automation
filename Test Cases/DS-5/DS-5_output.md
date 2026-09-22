# Test Plan: DS-5 — Program list filtering and display

**Feature:** Program list filtering and display  
**Role:** Admin user  
**Page:** Programs page

---

## Positive Flows

### TC-001
**Title:** Program list displays each program's name and description

**Preconditions:**
- Admin user is logged in
- The following programs exist:
  - **Web Development 2026** — `Full-stack web development program`
  - **Data Science Fundamentals** — `Introduction to Python, statistics, and ML basics`
  - **UX Design Foundations** — `User research, wireframing, and prototyping`

**Steps:**
1. Navigate to the Programs page

**Expected result:**
- A list/table of programs is displayed
- Each row shows **Program Name** and **Description** for all three programs
- Edit and delete actions are available per row (admin)
- "+ New Program" button is visible

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Display program list with key details
  Given programs exist in the system
  When I navigate to the Programs page
  Then I see a list showing each program's name and description
```

---

### TC-002
**Title:** Empty state is shown when no programs exist

**Preconditions:**
- Admin user is logged in
- No programs exist in the system

**Steps:**
1. Navigate to the Programs page

**Expected result:**
- No program rows are displayed
- Message indicates no programs have been created (e.g., "No programs yet" or "You haven't created any programs")
- Prompt/button to create the first program is visible (e.g., "+ New Program" or "Create your first program")
- Page layout is usable and not broken

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Empty state when no programs exist
  Given no programs exist
  When I navigate to the Programs page
  Then I see a message indicating no programs have been created
  And I see a prompt to create the first program
```

---

### TC-003
**Title:** Newly created program appears in the list without manual refresh

**Preconditions:**
- Admin user is logged in
- At least one program exists
- User is on the Programs page

**Steps:**
1. Click "+ New Program"
2. Create program **Cloud Computing Certificate** with description `AWS and Azure fundamentals`
3. Observe the program list after modal closes

**Expected result:**
- **Cloud Computing Certificate** appears in the list immediately
- Name and description are displayed correctly
- List order follows defined sort rule (e.g., alphabetical or newest first)

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: List updates after creating a program
  Given I am on the Programs page
  When I create a program "Cloud Computing Certificate" with description "AWS and Azure fundamentals"
  Then the program list shows "Cloud Computing Certificate"
  And the description shows "AWS and Azure fundamentals"
```

---

### TC-004
**Title:** List reflects program edits immediately after save

**Preconditions:**
- Admin user is logged in
- Program **Web Development 2026** exists on the Programs page

**Steps:**
1. Edit **Web Development 2026** and change description to `Updated curriculum for 2026`
2. Save changes
3. Observe the list

**Expected result:**
- List shows updated description **Updated curriculum for 2026** without page reload
- Program name unchanged unless edited

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: List updates after editing a program
  Given I am on the Programs page
  And a program "Web Development 2026" exists
  When I edit "Web Development 2026" and change the Description to "Updated curriculum for 2026"
  And I save the changes
  Then the program list shows description "Updated curriculum for 2026" for "Web Development 2026"
```

---

## Negative Flows

### TC-005
**Title:** Programs page is not accessible to unauthenticated users

**Preconditions:**
- User is not logged in

**Steps:**
1. Navigate directly to the Programs page URL

**Expected result:**
- User is redirected to login page
- Program list is not displayed
- No program data is exposed

**Priority:** High

**Gherkin:**
```gherkin
Scenario: Unauthenticated user cannot view programs list
  Given I am not logged in
  When I navigate to the Programs page
  Then I am redirected to the login page
  And I do not see the program list
```

---

### TC-006
**Title:** Non-admin user sees restricted view or is denied access to Programs page

**Preconditions:**
- Non-admin user is logged in
- Programs exist in the system

**Steps:**
1. Navigate to the Programs page

**Expected result:**
- **If restricted:** Access denied message or redirect
- **If read-only:** List visible but create/edit/delete actions hidden
- Behavior matches authorization specification

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Non-admin programs page access
  Given I am logged in as a non-admin user
  And programs exist in the system
  When I navigate to the Programs page
  Then I see the access level defined for non-admin users
  And I do not see admin-only actions unless permitted
```

---

### TC-007
**Title:** Program list does not display stale data after failed load

**Preconditions:**
- Admin user is logged in
- Programs API returns an error (simulate network/server failure)

**Steps:**
1. Navigate to the Programs page during simulated API failure

**Expected result:**
- User-friendly error message is displayed
- Empty list is not shown masquerading as "no programs"
- Retry option available if applicable
- No partial/corrupt program rows displayed

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Error state when program list fails to load
  Given the programs API is unavailable
  When I navigate to the Programs page
  Then I see an error message
  And I do not see a misleading empty-state message
```

---

## Edge Cases

### TC-008
**Title:** Program with empty description displays appropriate placeholder in list

**Preconditions:**
- Admin user is logged in
- Program **Minimal Program** exists with no description

**Steps:**
1. Navigate to the Programs page
2. Locate **Minimal Program** in the list

**Expected result:**
- **Minimal Program** name is displayed
- Description column shows empty placeholder (e.g., "—", "No description", or blank) consistently

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Display program with empty description
  Given a program "Minimal Program" exists with no description
  When I navigate to the Programs page
  Then I see "Minimal Program" in the list
  And the description is shown as empty or with a defined placeholder
```

---

### TC-009
**Title:** Long program names and descriptions are displayed without breaking layout

**Preconditions:**
- Admin user is logged in
- Program exists with:
  - Name: `Advanced Enterprise Cloud Architecture DevOps Engineering and Site Reliability Certification Track 2026 Extended Edition`
  - Description: 500+ character text

**Steps:**
1. Navigate to the Programs page
2. Observe rendering of the long-name program row

**Expected result:**
- Row layout remains intact (no overflow breaking table)
- Long text is truncated with ellipsis or wraps per design
- Full text accessible via tooltip or expand on hover/click if truncated

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Long name and description display
  Given a program with a very long name and description exists
  When I navigate to the Programs page
  Then the program row displays without layout breakage
  And long text follows the defined truncation or wrapping rules
```

---

### TC-010
**Title:** Program names with special characters render correctly in the list

**Preconditions:**
- Admin user is logged in
- Program **Informatique & IA - Niveau 2** exists

**Steps:**
1. Navigate to the Programs page
2. Locate **Informatique & IA - Niveau 2**

**Expected result:**
- Name displays as **Informatique & IA - Niveau 2**
- Ampersand and accented characters are not HTML-escaped visibly or corrupted

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Special characters in list display
  Given a program "Informatique & IA - Niveau 2" exists
  When I navigate to the Programs page
  Then I see "Informatique & IA - Niveau 2" displayed correctly in the list
```

---

### TC-011
**Title:** List handles large number of programs with pagination or scrolling

**Preconditions:**
- Admin user is logged in
- 50+ programs exist in the system

**Steps:**
1. Navigate to the Programs page
2. Scroll or paginate through the list

**Expected result:**
- All programs are reachable via pagination, infinite scroll, or scrollable container
- Performance remains acceptable (no excessive load time)
- Each visible row shows name and description

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Large program list pagination
  Given 50 or more programs exist in the system
  When I navigate to the Programs page
  Then I can view all programs via pagination or scrolling
  And each program shows its name and description
```

---

### TC-012
**Title:** Empty state CTA navigates to program creation form

**Preconditions:**
- Admin user is logged in
- No programs exist
- User is on Programs page empty state

**Steps:**
1. Click the "Create your first program" prompt or "+ New Program" from empty state

**Expected result:**
- Program creation form opens
- User can create first program
- After creation, empty state is replaced by program list

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: Empty state create prompt opens form
  Given no programs exist
  And I am on the Programs page
  When I click the prompt to create the first program
  Then I see the program creation form
```

---

### TC-013
**Title:** List sort order is consistent and predictable

**Preconditions:**
- Admin user is logged in
- Programs exist: **Alpha Program**, **Beta Program**, **Gamma Program**

**Steps:**
1. Navigate to the Programs page
2. Observe program order
3. Refresh the page
4. Observe order again

**Expected result:**
- Programs appear in consistent order (e.g., alphabetical by name or newest first)
- Order does not change randomly between page loads

**Priority:** Low

**Gherkin:**
```gherkin
Scenario: Consistent list sort order
  Given programs "Alpha Program", "Beta Program", and "Gamma Program" exist
  When I navigate to the Programs page
  Then the programs appear in a consistent defined order
  And the order remains the same after page refresh
```

---

### TC-014
**Title:** Deleted program is removed from list without page refresh

**Preconditions:**
- Admin user is logged in
- Programs **Test Program** and **Web Development 2026** exist
- User is on Programs page

**Steps:**
1. Delete **Test Program** and confirm
2. Observe list without manual refresh

**Expected result:**
- **Test Program** row disappears immediately
- **Web Development 2026** remains visible
- List count updates accordingly

**Priority:** Medium

**Gherkin:**
```gherkin
Scenario: List updates after deleting a program
  Given I am on the Programs page
  And programs "Test Program" and "Web Development 2026" exist
  When I delete "Test Program" and confirm
  Then the program list no longer shows "Test Program"
  And the program list still shows "Web Development 2026"
```

---

### TC-015
**Title:** Single program in list displays correctly (non-empty, non-bulk state)

**Preconditions:**
- Admin user is logged in
- Only **Web Development 2026** exists

**Steps:**
1. Navigate to the Programs page

**Expected result:**
- Exactly one row displayed
- Name and description shown
- Empty state message is NOT shown
- Admin actions available on the single row

**Priority:** Low

**Gherkin:**
```gherkin
Scenario: Single program list display
  Given only "Web Development 2026" exists
  When I navigate to the Programs page
  Then I see one program row for "Web Development 2026"
  And I do not see the empty-state message
```

---

## Ambiguities and Gaps in ACs

| # | Gap / Ambiguity |
|---|-----------------|
| 1 | **"Filtering" in title** but no AC covers search, filter, or sort — only display. Filtering behavior undefined. |
| 2 | **List sort order** not specified (TC-013). |
| 3 | **Pagination vs. infinite scroll** threshold not defined (TC-011). |
| 4 | **Empty description display** rules not specified (TC-008). |
| 5 | **Long text truncation** rules not defined (TC-009). |
| 6 | **Additional columns** (created date, status, actions) not mentioned in ACs. |
| 7 | **Empty state exact copy** and CTA label not defined. |
| 8 | **Loading state** while fetching programs not specified. |
| 9 | **Error state** for failed API not in ACs (TC-007). |
| 10 | **Non-admin read access** unclear — can instructors view program list read-only? (TC-006). |
| 11 | **Real-time updates** when another admin adds/edits/deletes not addressed. |
| 12 | **Responsive/mobile layout** for program list not specified. |
