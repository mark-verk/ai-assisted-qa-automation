# TodoMVC Test Cases

**Application:** https://demo.playwright.dev/todomvc/

**Acceptance criteria covered:** add todo, complete item, delete item (plus negative and edge coverage).

---

## Positive flows

### TC-001 — New todo appears in the list after submitting valid text

**Preconditions**
- Browser open on TodoMVC with an empty list (no items in `.todo-list`).

**Steps**
1. Click the **What needs to be done?** field.
2. Type `Buy groceries` and press Enter.

**Expected result**
- The input is empty.
- One row appears in the todo list with label `Buy groceries`.
- Footer **todo-count** shows `1 item left`.

---

### TC-002 — Todo is marked completed when Toggle Todo is checked

**Preconditions**
- Empty list on TodoMVC.

**Steps**
1. Add `Walk the dog` via **What needs to be done?** (Enter).
2. Click **Toggle Todo** on that row.

**Expected result**
- The row has a completed state (checked toggle, completed styling).
- The item remains in the list.
- **todo-count** shows `0 items left`.

---

### TC-003 — Todo is removed from the list after delete

**Preconditions**
- Empty list on TodoMVC.

**Steps**
1. Add `Pay electricity bill`.
2. Hover the row and click **Destroy** (×).

**Expected result**
- `Pay electricity bill` is not in the list.
- `.todo-list` has no items.

---

### TC-004 — Multiple todos are all visible with correct count

**Preconditions**
- Empty list on TodoMVC.

**Steps**
1. Add `Buy groceries`, then `Walk the dog`, then `Pay electricity bill` (Enter after each).

**Expected result**
- Three rows appear in order added.
- **todo-count** shows `3 items left`.

---

## Negative flows

### TC-005 — Empty input does not create a todo

**Preconditions**
- Empty list on TodoMVC.

**Steps**
1. Focus **What needs to be done?** without typing.
2. Press Enter.

**Expected result**
- No new row is added; list stays empty.

---

### TC-006 — Whitespace-only input does not add a todo

**Preconditions**
- Empty list on TodoMVC.

**Steps**
1. In **What needs to be done?**, type five spaces and press Enter.

**Expected result**
- No row is added; list stays empty.

---

### TC-007 — Completing a todo does not remove it from the All list

**Preconditions**
- Empty list on TodoMVC.

**Steps**
1. Add `Read Playwright docs`.
2. Check **Toggle Todo** for that row.
3. Click the **All** filter link.

**Expected result**
- One item still visible under **All**.
- That row remains completed.

---

### TC-008 — Deleting one todo leaves other todos unchanged

**Preconditions**
- Empty list on TodoMVC.

**Steps**
1. Add `Buy groceries`, then `Walk the dog`.
2. Delete `Buy groceries` via **Destroy**.

**Expected result**
- Only `Walk the dog` remains.
- **todo-count** shows `1 item left`.

---

## Edge cases

### TC-009 — Special characters in todo text display correctly

**Preconditions**
- Empty list on TodoMVC.

**Steps**
1. Add `Buy milk & eggs — 50% off (today only)!`.

**Expected result**
- Label text matches exactly (including `&`, `—`, `%`, parentheses, `!`).

---

### TC-010 — Duplicate titles create separate list items

**Preconditions**
- Empty list on TodoMVC.

**Steps**
1. Add `Buy groceries` twice.

**Expected result**
- Two separate rows, both labeled `Buy groceries`.
- **todo-count** shows `2 items left`.

---

### TC-011 — Very long todo text is added without breaking the list

**Preconditions**
- Empty list on TodoMVC.

**Steps**
1. Add a long string: repeat `Plan quarterly release checklist ` six times (trim trailing space).

**Expected result**
- One row is visible and contains the start of the text (`Plan quarterly release checklist`).
- List layout remains usable (no crash or missing row).

---

### TC-012 — Complete then delete the only todo clears the list

**Preconditions**
- Empty list on TodoMVC.

**Steps**
1. Add `Temporary task`.
2. Check **Toggle Todo**.
3. Click **Destroy** on the same row.

**Expected result**
- List is empty after delete.

---

### TC-013 — New todo can be added immediately after deleting another

**Preconditions**
- Empty list on TodoMVC.

**Steps**
1. Add `Old task`, then delete it.
2. Add `New task`.

**Expected result**
- One row: `New task`.
- **todo-count** shows `1 item left`.

---

## Ambiguities and gaps in the acceptance criteria

- **Whitespace:** AC does not say whether spaces-only input should be rejected; this plan assumes TodoMVC trims/rejects it (TC-006).
- **Duplicates:** AC does not require unique titles; duplicates are allowed as separate rows (TC-010).
- **Complete vs. delete:** AC does not define whether completed items stay on **All** / **Active** / **Completed** filters; only **All** behavior is asserted (TC-007).
- **Max length:** No stated limit; TC-011 checks a long string but not an explicit maximum or truncation rules.
- **Persistence:** AC does not mention localStorage or reload; preconditions assume a fresh empty list, not cross-session behavior.
- **Delete affordance:** **Destroy** is only reliably clickable after hover on desktop; mobile/touch behavior is out of scope here.
