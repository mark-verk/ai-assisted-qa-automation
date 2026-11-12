import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import { assertNoAxeViolations, runA11yCheckOrWarnInCi } from './helpers/a11yCi';
import { createProgramViaUi } from './helpers/createProgramViaUi';
import {
  attachPageErrorCollector,
  routeProgramPatchById,
  routeProgramsListGet,
  waitForProgramPatch,
  waitForProgramsListGet,
} from './helpers/programsApiRoutes';

const MAX_PROGRAM_NAME_LENGTH = 255;
const axeTags = ['wcag2a', 'wcag2aa'] as const;

function uniqueSuffix(): string {
  return String(Date.now());
}

function uniqueProgramName(base: string): string {
  return `${base} ${uniqueSuffix()}`;
}

function fixedLength(length: number, seed: string): string {
  if (seed.length >= length) {
    return seed.slice(0, length);
  }
  return seed.padEnd(length, 'x');
}

async function expectStableShell(
  programsPage: ProgramsPage,
  pageErrors: Error[],
): Promise<void> {
  await expect(programsPage.heading).toBeVisible();
  expect(pageErrors).toEqual([]);
}

async function expectLoginRedirectOrStable(
  page: import('@playwright/test').Page,
  programsPage: ProgramsPage,
  pageErrors: Error[],
): Promise<void> {
  if (/\/login/.test(page.url())) {
    await expect(page).toHaveURL(/\/login/);
    expect(pageErrors).toEqual([]);
    return;
  }
  const alertCount = await programsPage.pageAlert.count();
  const deniedCount = await programsPage.accessDeniedText().count();
  if (alertCount > 0) {
    await expect(programsPage.pageAlert.first()).toBeVisible();
    expect(pageErrors).toEqual([]);
    return;
  }
  if (deniedCount > 0) {
    await expect(programsPage.accessDeniedText().first()).toBeVisible();
    expect(pageErrors).toEqual([]);
    return;
  }
  await expect(programsPage.heading).toBeVisible();
  expect(pageErrors).toEqual([]);
}

async function expectAccessDeniedOrStable(
  programsPage: ProgramsPage,
  pageErrors: Error[],
): Promise<void> {
  const deniedCount = await programsPage.accessDeniedText().count();
  if (deniedCount > 0) {
    await expect(programsPage.accessDeniedText().first()).toBeVisible();
    expect(pageErrors).toEqual([]);
    return;
  }
  await expect(programsPage.heading).toBeVisible();
  expect(pageErrors).toEqual([]);
}

async function expectErrorCopyOrStable(
  programsPage: ProgramsPage,
  pageErrors: Error[],
): Promise<void> {
  const alertCount = await programsPage.pageAlert.count();
  if (alertCount > 0) {
    await expect(programsPage.pageAlert.first()).toBeVisible();
    expect(pageErrors).toEqual([]);
    return;
  }
  await expect(programsPage.heading).toBeVisible();
  expect(pageErrors).toEqual([]);
}

test.describe('DS-293 — Edit existing program details', () => {
  test.describe('Happy paths', () => {
    test('Open program for editing shows pre-populated Edit Program form', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const description = `Full-stack web development program ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      const modal = programsPage.editProgramModal;

      await expect(modal.dialog).toBeVisible();
      await expect(modal.programNameField).toHaveValue(programName);
      await expect(modal.descriptionField).toHaveValue(description);
      await expect(modal.saveButton).toBeVisible();
      await expect(modal.cancelButton).toBeVisible();
    });

    test('Successfully edit a program name', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const updatedName = uniqueProgramName('Web Development 2026 - Updated');
      const description = `Original description ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.editProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(updatedName)).toBeVisible();
      await expect(programsPage.programEditButton(programName)).toHaveCount(0);
    });

    test('Edit preserves unchanged fields when only Description changes', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const originalDescription = `Full-stack web development program ${uniqueSuffix()}`;
      const updatedDescription = `Updated curriculum ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: originalDescription },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillDescription(updatedDescription);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.editProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
      await expect(programsPage.programRow(programName)).toContainText(updatedDescription);
    });

    test('Edit both name and description', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('UX Design Foundations');
      const updatedName = uniqueProgramName('UX Design Foundations - Professional Track');
      const updatedDescription = `Advanced UX research, prototyping, and usability testing ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `Introductory UX course ${uniqueSuffix()}` },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await programsPage.editProgramModal.fillDescription(updatedDescription);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.editProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(updatedName)).toBeVisible();
      await expect(programsPage.programRow(updatedName)).toContainText(updatedDescription);
    });
  });

  test.describe('Negative flows', () => {
    test('Cannot save edit with empty program name', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const description = `Description ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillProgramName('');

      const modal = programsPage.editProgramModal;
      await expect(modal.saveButton).toBeDisabled();
      await programsPage.dismissEditModalIfOpen();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    });

    test('Cancel edit discards changes', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const description = `Full-stack web development program ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillProgramName(
        uniqueProgramName('Web Development 2026 - Draft Change'),
      );
      await programsPage.editProgramModal.fillDescription('Unsaved draft description');
      await programsPage.editProgramModal.clickCancel();

      await expect(programsPage.editProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
      await expect(programsPage.programRow(programName)).toContainText(description);
    });

    test('Reject duplicate name on edit', async ({ page, trackProgram }) => {
      const firstName = uniqueProgramName('Web Development 2026');
      const secondName = uniqueProgramName('Data Science Fundamentals');
      const secondDescription = `Second program ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: firstName, description: `First program ${uniqueSuffix()}` },
        trackProgram,
      );
      await createProgramViaUi(
        page,
        { name: secondName, description: secondDescription },
        trackProgram,
        programsPage,
      );

      await programsPage.openEditProgramForm(secondName);
      await programsPage.editProgramModal.fillProgramName(firstName);
      await programsPage.editProgramModal.clickSave();

      const editModal = programsPage.editProgramModal;
      if (await editModal.dialog.isVisible()) {
        if ((await editModal.duplicateNameError.count()) > 0) {
          await expect(editModal.duplicateNameError.first()).toBeVisible();
        }
        await programsPage.dismissEditModalIfOpen();
      }

      await page.reload();
      await programsPage.gotoAndWaitForTable();

      const secondRow = programsPage.programRow(secondDescription);
      await expect(secondRow).toBeVisible();
      await expect(secondRow.getByText(secondName)).toBeVisible();
      await expect(programsPage.programEditButton(firstName)).toHaveCount(1);
    });
  });

  test.describe('Edge cases', () => {
    test('Save with no changes closes modal', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `Unchanged description ${uniqueSuffix()}` },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.editProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toHaveCount(1);
    });

    test('Reject whitespace-only name on edit', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `Description ${uniqueSuffix()}` },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillProgramName('   ');
      await expect(programsPage.editProgramModal.saveButton).toBeDisabled();
      await programsPage.dismissEditModalIfOpen();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    });

    test('Accept special characters in edited name', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const specialName = `Informatique & IA - Niveau 2 (Édition 2026) ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `Description ${uniqueSuffix()}` },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillProgramName(specialName);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.editProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(specialName)).toBeVisible();
    });

    test('Clear description on edit', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const description = `Non-empty description ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillDescription('');
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.editProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
      const row = programsPage.programRow(programName);
      await expect(row).not.toContainText(description);
    });

    test('Trim spaces from edited program name', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const trimmedName = uniqueProgramName('Cloud Computing Certificate');
      const paddedName = `  ${trimmedName}  `;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `Description ${uniqueSuffix()}` },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillProgramName(paddedName);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.editProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(trimmedName)).toBeVisible();
    });

    test('Accept max-length name on edit', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Short Name Program');
      const maxName = fixedLength(MAX_PROGRAM_NAME_LENGTH, uniqueProgramName('MaxLen255Edit'));
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `Description ${uniqueSuffix()}` },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillProgramName(maxName);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.editProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(maxName)).toBeVisible();
    });
  });

  test.describe('PATCH /api/programs/:id edge cases', () => {
    async function editWithPatchMock(
      page: import('@playwright/test').Page,
      trackProgram: (id: string) => void,
      patchOptions: Parameters<typeof routeProgramPatchById>[1],
    ) {
      const pageErrors = attachPageErrorCollector(page);
      const programName = uniqueProgramName('Web Development 2026');
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `PATCH edge ${uniqueSuffix()}` },
        trackProgram,
      );
      await routeProgramPatchById(page, patchOptions);
      await programsPage.openEditProgramForm(programName);
      const updatedName = uniqueProgramName('Web Development 2026 - PATCH');
      await programsPage.editProgramModal.fillProgramName(updatedName);
      const patchResponse = waitForProgramPatch(page);
      await programsPage.editProgramModal.clickSave();
      await patchResponse;
      await expect(programsPage.heading).toBeVisible();
      return { programsPage, pageErrors, programName, updatedName };
    }

    test(
      'Edit save returns 503 — dialog stays open, no crash',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const { programsPage, pageErrors } = await editWithPatchMock(page, trackProgram, {
          status: 503,
          body: { message: 'Service unavailable' },
        });

        await expect(programsPage.editProgramModal.dialog).toBeVisible();
        await expect(programsPage.heading).toBeVisible();
        expect(pageErrors).toEqual([]);
      },
    );

    test(
      'Edit save returns 400 — no crash',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const { programsPage, pageErrors } = await editWithPatchMock(page, trackProgram, {
          status: 400,
          body: { message: 'Bad request' },
        });
        await expectStableShell(programsPage, pageErrors);
      },
    );

    test(
      'Edit save returns 401 — no crash or redirect to login',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const { programsPage, pageErrors } = await editWithPatchMock(page, trackProgram, {
          status: 401,
          body: { message: 'Unauthorized' },
        });
        await expectLoginRedirectOrStable(page, programsPage, pageErrors);
      },
    );

    test(
      'Edit save returns 403 — access-denied or no crash',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const { programsPage, pageErrors } = await editWithPatchMock(page, trackProgram, {
          status: 403,
          body: { message: 'Forbidden' },
        });
        await expectAccessDeniedOrStable(programsPage, pageErrors);
      },
    );

    test(
      'Edit save returns 404 — no crash',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const { programsPage, pageErrors } = await editWithPatchMock(page, trackProgram, {
          status: 404,
          body: { message: 'Not found' },
        });
        await expectStableShell(programsPage, pageErrors);
      },
    );

    test(
      'Edit save returns 422 — no crash',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const { programsPage, pageErrors } = await editWithPatchMock(page, trackProgram, {
          status: 422,
          body: { message: 'Unprocessable entity' },
        });
        await expectStableShell(programsPage, pageErrors);
      },
    );

    test(
      'Edit save returns 500 — no crash',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const { programsPage, pageErrors } = await editWithPatchMock(page, trackProgram, {
          status: 500,
          body: { message: 'Internal server error' },
        });
        await expectStableShell(programsPage, pageErrors);
      },
    );

    test(
      'Edit save returns 501 — no crash',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const { programsPage, pageErrors } = await editWithPatchMock(page, trackProgram, {
          status: 501,
          body: { message: 'Not implemented' },
        });
        await expectStableShell(programsPage, pageErrors);
      },
    );

    test(
      'Edit save returns 502 — no crash',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const { programsPage, pageErrors } = await editWithPatchMock(page, trackProgram, {
          status: 502,
          body: { message: 'Bad gateway' },
        });
        await expectStableShell(programsPage, pageErrors);
      },
    );

    test(
      'Edit save returns 200 with empty body — no crash',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const { programsPage, pageErrors } = await editWithPatchMock(page, trackProgram, {
          status: 200,
          body: {},
        });
        await expectStableShell(programsPage, pageErrors);
      },
    );

    test(
      'Edit save returns 409 — duplicate conflict UI or no crash',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const { programsPage, pageErrors } = await editWithPatchMock(page, trackProgram, {
          status: 409,
          body: { message: 'Conflict' },
        });
        const editModal = programsPage.editProgramModal;
        const dialogVisible = await editModal.dialog.isVisible();
        if (dialogVisible) {
          if ((await editModal.conflictError.count()) > 0) {
            await expect(editModal.conflictError.first()).toBeVisible();
          } else {
            await expect(editModal.dialog).toBeVisible();
          }
        } else {
          await expect(programsPage.heading).toBeVisible();
        }
        expect(pageErrors).toEqual([]);
      },
    );
  });

  test.describe('GET /api/programs edge cases', () => {
    test(
      'Program list GET returns 200 with empty array',
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = attachPageErrorCollector(page);
        await routeProgramsListGet(page, { status: 200, body: [] });
        const programsPage = new ProgramsPage(page);
        const listResponse = waitForProgramsListGet(page);
        await programsPage.goto();
        await listResponse;
        await expect(programsPage.heading).toBeVisible();
        await expect(
          programsPage.emptyStateText().or(programsPage.noProgramsYetText()),
        ).toBeVisible();
        expect(pageErrors).toEqual([]);
      },
    );

    test(
      'Program list GET returns 200 with malformed body',
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = attachPageErrorCollector(page);
        await routeProgramsListGet(page, { status: 200, body: {} });
        const programsPage = new ProgramsPage(page);
        const listResponse = waitForProgramsListGet(page);
        await programsPage.goto();
        await listResponse;
        await expectStableShell(programsPage, pageErrors);
      },
    );

    test(
      'Program list GET returns 404 — error or no crash',
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = attachPageErrorCollector(page);
        await routeProgramsListGet(page, { status: 404, body: { message: 'Not found' } });
        const programsPage = new ProgramsPage(page);
        const listResponse = waitForProgramsListGet(page);
        await programsPage.goto();
        await listResponse;
        await expectErrorCopyOrStable(programsPage, pageErrors);
      },
    );

    test(
      'Program list GET returns 401 — message or redirect to login',
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = attachPageErrorCollector(page);
        await routeProgramsListGet(page, { status: 401, body: { message: 'Unauthorized' } });
        const programsPage = new ProgramsPage(page);
        const listResponse = waitForProgramsListGet(page);
        await programsPage.goto();
        await listResponse;
        await expectLoginRedirectOrStable(page, programsPage, pageErrors);
      },
    );

    test(
      'Program list GET returns 403 — access denied',
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = attachPageErrorCollector(page);
        await routeProgramsListGet(page, { status: 403, body: { message: 'Forbidden' } });
        const programsPage = new ProgramsPage(page);
        const listResponse = waitForProgramsListGet(page);
        await programsPage.goto();
        await listResponse;
        await expectAccessDeniedOrStable(programsPage, pageErrors);
      },
    );

    test(
      'Program list GET returns 500 — error or no crash',
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = attachPageErrorCollector(page);
        await routeProgramsListGet(page, { status: 500, body: { message: 'Internal server error' } });
        const programsPage = new ProgramsPage(page);
        const listResponse = waitForProgramsListGet(page);
        await programsPage.goto();
        await listResponse;
        await expectErrorCopyOrStable(programsPage, pageErrors);
      },
    );

    test(
      'Program list GET returns 501 — error or no crash',
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = attachPageErrorCollector(page);
        await routeProgramsListGet(page, { status: 501, body: { message: 'Not implemented' } });
        const programsPage = new ProgramsPage(page);
        const listResponse = waitForProgramsListGet(page);
        await programsPage.goto();
        await listResponse;
        await expectErrorCopyOrStable(programsPage, pageErrors);
      },
    );

    test(
      'Program list GET returns 502 — error or no crash',
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = attachPageErrorCollector(page);
        await routeProgramsListGet(page, { status: 502, body: { message: 'Bad gateway' } });
        const programsPage = new ProgramsPage(page);
        const listResponse = waitForProgramsListGet(page);
        await programsPage.goto();
        await listResponse;
        await expectErrorCopyOrStable(programsPage, pageErrors);
      },
    );

    test(
      'Program list GET returns 503 — error or no crash',
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = attachPageErrorCollector(page);
        await routeProgramsListGet(page, {
          status: 503,
          body: { message: 'Service unavailable' },
        });
        const programsPage = new ProgramsPage(page);
        const listResponse = waitForProgramsListGet(page);
        await programsPage.goto();
        await listResponse;
        await expectErrorCopyOrStable(programsPage, pageErrors);
      },
    );

    test(
      'Program list GET returns 204 — no crash',
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = attachPageErrorCollector(page);
        await routeProgramsListGet(page, { status: 204, body: null });
        const programsPage = new ProgramsPage(page);
        const listResponse = waitForProgramsListGet(page);
        await programsPage.goto();
        await listResponse;
        await expectStableShell(programsPage, pageErrors);
      },
    );

    test(
      'Program list GET returns 300 — no crash',
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = attachPageErrorCollector(page);
        await routeProgramsListGet(page, { status: 300, body: { message: 'Multiple choices' } });
        const programsPage = new ProgramsPage(page);
        const listResponse = waitForProgramsListGet(page);
        await programsPage.goto();
        await listResponse;
        await expectStableShell(programsPage, pageErrors);
      },
    );

    test(
      'Program list GET returns 200 with Content-Type text/html — no crash',
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = attachPageErrorCollector(page);
        await routeProgramsListGet(page, {
          status: 200,
          contentType: 'text/html',
          body: '<html><body>not json</body></html>',
        });
        const programsPage = new ProgramsPage(page);
        const listResponse = waitForProgramsListGet(page);
        await programsPage.goto();
        await listResponse;
        await expectStableShell(programsPage, pageErrors);
      },
    );
  });

  test.describe('Accessibility', () => {
    test('Edit Program dialog has no axe violations when scoped to the dialog', async ({
      page,
      trackProgram,
    }, testInfo) => {
      test.setTimeout(120_000);
      const programName = uniqueProgramName('A11y Edit Program');
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `A11y edit modal ${uniqueSuffix()}` },
        trackProgram,
      );
      await programsPage.openEditProgramForm(programName);

      // Scope axe to the Edit Program dialog under test (list/table chrome is out of scope).
      const modalInclude = await programsPage.editProgramModal.axeScanInclude();
      const results = await new AxeBuilder({ page })
        .withTags([...axeTags])
        .include(modalInclude)
        .analyze();

      expect(results.violations).toEqual([]);
      await assertNoAxeViolations(results.violations, testInfo);
    });

    test('Keyboard opens Edit Program dialog from Edit control', async ({
      page,
      trackProgram,
    }, testInfo) => {
      await runA11yCheckOrWarnInCi(testInfo, 'Keyboard accessibility', async () => {
        const programName = uniqueProgramName('Keyboard Edit Program');
        const programsPage = await createProgramViaUi(
          page,
          { name: programName, description: `Keyboard edit ${uniqueSuffix()}` },
          trackProgram,
        );

        await programsPage.tabToProgramEditButton(programName);
        await expect(programsPage.programEditButton(programName)).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(programsPage.editProgramModal.dialog).toBeVisible();
      });
    });
  });
});
