# jira-bug-reporter reference

## Duplicate search

```text
project = DS AND issuetype = Bug AND text ~ "Create button" ORDER BY created DESC
```

Narrow further when the source ticket is known:

```text
project = DS AND issuetype = Bug AND summary ~ "DS-1" AND text ~ "toBeEnabled" ORDER BY created DESC
```

## Example Bug (DS-1)

**Summary:** `[DS-1] Create button stays disabled with valid program name — TC-002: New program appears in the list after successful creation`

```markdown
## Steps to reproduce
1. Log in as admin.
2. Open Programs.
3. Click "+ New Program".
4. Enter Program Name "Web Development 2026" and Description "Full-stack web development program".
5. Observe the Create button.

## Expected result
Create is enabled. Submitting creates the program and closes the modal (features/DS-1.feature — successful creation scenario).

## Actual result
Create stays disabled after a valid name and description are entered. Playwright: `expect(createButton).toBeEnabled()` timed out after 10000ms.

## Root cause
**Classification:** app bug

Form state does not enable Create when both fields are filled. The failure is the assertion in the spec before submit.

## Source code
- Test: `tests/ds1-create-program.spec.ts` (line 145)
- Feature: `features/DS-1.feature` (Successfully create a program)
```

## Attachment upload

`discover` query: `upload attachment to jira issue`. Call `executeWrite` with the returned name `uploadAttachmentToJiraIssue`. `cloudId` is a top-level argument, not inside `inputs`.

**Phase 1**

```json
{
  "cloudId": "<cached>",
  "name": "uploadAttachmentToJiraIssue",
  "inputs": {
    "issueIdOrKey": "DS-42",
    "filePath": "test-results/ds1-create-program-TC-002/test-failed-1.png"
  }
}
```

Run `uploadCommand` from the repository root. Keep the returned `fileId`.

**Phase 2**

```json
{
  "cloudId": "<cached>",
  "name": "uploadAttachmentToJiraIssue",
  "inputs": {
    "issueIdOrKey": "DS-42",
    "fileId": "<from phase 1>"
  }
}
```
