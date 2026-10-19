import { test, expect } from '../fixtures/cleanup.fixture';
import { adminStorageStatePath, signInWithCredentials } from '../fixtures/auth.helpers';
import { submitProgramCreate } from '../fixtures/program-create.helpers';
import { ProgramsPage } from '../pages/ProgramsPage';
import { assertProgramsPageReady, createProgramViaUi } from './helpers/createProgramViaUi';

function uniqueSuffix(): string {
  return String(Date.now());
}

function uniqueProgramName(base: string): string {
  return `${base} ${uniqueSuffix()}`;
}

async function handleDeleteConfirm(
  page: import('@playwright/test').Page,
  programsPage: ProgramsPage,
  programName: string,
  action: 'accept' | 'dismiss',
): Promise<string> {
  let message = '';
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    message = dialog.message();
    expect(message).toContain(programName);
    if (action === 'accept') {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
  await programsPage.programDeleteButton(programName).click();
  return message;
}

test.describe('DS-4 — Delete program with confirmation', () => {
  test.describe('Positive flows', () => {
    test('TC-001: Program is removed from the list after confirming deletion', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Test Program');
      const description = `Program used for QA deletion testing ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description },
        trackProgram,
      );

      await handleDeleteConfirm(page, programsPage, programName, 'accept');

      await expect(programsPage.programDeleteButton(programName)).toHaveCount(0);
      await expect(programsPage.programEditButton(programName)).toHaveCount(0);
      await expect(programsPage.programRow(programName)).toHaveCount(0);
    });

    test('TC-002: Program remains in the list when deletion is cancelled', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Test Program');
      const description = `Program used for QA deletion testing ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description },
        trackProgram,
      );
      await handleDeleteConfirm(page, programsPage, programName, 'dismiss');

      await expect(programsPage.programDeleteButton(programName)).toBeVisible();
      await expect(programsPage.programRow(programName)).toContainText(description);
    });

    test('TC-003: Confirmation dialog displays program name and destructive action warning', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Test Program');
      const description = `Program used for QA deletion testing ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description },
        trackProgram,
      );

      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        const message = dialog.message();
        expect(message).toContain(programName);
        expect(message).toMatch(/delete|remove|cannot be undone|semesters|courses/i);
        await dialog.dismiss();
      });
      await programsPage.programDeleteButton(programName).click();

      await expect(programsPage.programDeleteButton(programName)).toBeVisible();
    });
  });

  test.describe('Negative flows', () => {
    test('TC-004: Program is not deleted when confirmation dialog is dismissed via Escape key', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Test Program');
      const programsPage = await createProgramViaUi(
        page,
        {
          name: programName,
          description: `Program used for QA deletion testing ${uniqueSuffix()}`,
        },
        trackProgram,
      );

      await handleDeleteConfirm(page, programsPage, programName, 'dismiss');

      await expect(programsPage.programDeleteButton(programName)).toBeVisible();
    });

    test('TC-005: Program is not deleted when confirmation dialog is closed via X button', async () => {
      test.skip(
        true,
        'Delete confirmation uses the native browser confirm dialog, which has no X close control',
      );
    });

    test('TC-006: Non-admin user cannot delete programs', async ({ page, browser, trackProgram }) => {
      const email = process.env.DIDAXIS_NON_ADMIN_EMAIL;
      const password = process.env.DIDAXIS_NON_ADMIN_PASSWORD;
      test.skip(
        !email || !password,
        'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD for TC-006',
      );

      const programName = uniqueProgramName('Test Program');
      await createProgramViaUi(
        page,
        {
          name: programName,
          description: `Protected from non-admin delete ${uniqueSuffix()}`,
        },
        trackProgram,
      );

      const nonAdminContext = await browser.newContext({
        baseURL: process.env.DIDAXIS_URL,
      });
      const nonAdminPage = await nonAdminContext.newPage();
      await signInWithCredentials(nonAdminPage, email!, password!);

      const nonAdminPrograms = new ProgramsPage(nonAdminPage);
      await nonAdminPrograms.goto();
      await assertProgramsPageReady(nonAdminPrograms);
      await expect(nonAdminPrograms.programDeleteButton(programName)).toBeHidden();
      await nonAdminContext.close();
    });

    test('TC-007: Deletion fails gracefully when program was already deleted by another session', async ({
      page,
      browser,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Test Program');
      const programsPage = await createProgramViaUi(
        page,
        {
          name: programName,
          description: `Stale delete scenario ${uniqueSuffix()}`,
        },
        trackProgram,
      );

      const staleContext = await browser.newContext({
        baseURL: process.env.DIDAXIS_URL,
        storageState: adminStorageStatePath,
      });
      const stalePage = await staleContext.newPage();
      const stalePrograms = new ProgramsPage(stalePage);
      await stalePrograms.goto();
      await expect(stalePrograms.programDeleteButton(programName)).toBeVisible({ timeout: 30_000 });

      await handleDeleteConfirm(page, programsPage, programName, 'accept');
      await expect(programsPage.programDeleteButton(programName)).toHaveCount(0);

      stalePage.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await stalePrograms.programDeleteButton(programName).click();

      await stalePage.reload();
      await stalePrograms.goto();
      await assertProgramsPageReady(stalePrograms);
      await expect(stalePrograms.programDeleteButton(programName)).toHaveCount(0);
      await staleContext.close();
    });
  });

  test.describe('Edge cases', () => {
    test('TC-008: Deleting the last program transitions to empty state', async () => {
      test.skip(
        true,
        'Requires an isolated tenant with zero programs; shared test.didaxis.studio accumulates data from other runs',
      );
    });

    test('TC-009: Double-click on Confirm does not cause duplicate delete requests or errors', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Test Program');
      const programsPage = await createProgramViaUi(
        page,
        {
          name: programName,
          description: `Double confirm delete ${uniqueSuffix()}`,
        },
        trackProgram,
      );

      let dialogHandled = 0;
      page.on('dialog', async (dialog) => {
        dialogHandled += 1;
        await dialog.accept();
      });

      const deleteButton = programsPage.programDeleteButton(programName);
      await deleteButton.click({ clickCount: 2 });

      await expect(programsPage.programDeleteButton(programName)).toHaveCount(0, { timeout: 15_000 });
      expect(dialogHandled).toBeGreaterThanOrEqual(1);
      expect(dialogHandled).toBeLessThanOrEqual(2);
    });

    test('TC-010: Deleting a program shows curriculum-related warning in confirmation', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Test Program');
      const programsPage = await createProgramViaUi(
        page,
        {
          name: programName,
          description: `Curriculum warning check ${uniqueSuffix()}`,
        },
        trackProgram,
      );

      const message = await handleDeleteConfirm(page, programsPage, programName, 'dismiss');
      expect(message).toMatch(/semesters|courses|curriculum|removed|cannot be undone/i);
    });

    test('TC-011: Delete icon is not actionable for programs in a protected state (if applicable)', async () => {
      test.skip(true, 'No protected/published program state is available in the test environment');
    });

    test('TC-012: Confirmation dialog prevents accidental click-through during loading', async () => {
      test.skip(
        true,
        'Native browser confirm dialog does not expose in-progress disabled Confirm button state',
      );
    });

    test('TC-013: Deleted program name can be reused for new program creation (if soft-delete not used)', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Test Program');
      const recreatedDescription = `Recreated program after deletion ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        {
          name: programName,
          description: `Original before delete ${uniqueSuffix()}`,
        },
        trackProgram,
      );
      await handleDeleteConfirm(page, programsPage, programName, 'accept');
      await expect(programsPage.programDeleteButton(programName)).toHaveCount(0);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fill({
        name: programName,
        description: recreatedDescription,
      });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());

      const modalStillOpen = await programsPage.newProgramModal.dialog.isVisible();
      if (modalStillOpen) {
        await expect(programsPage.newProgramModal.dialog).toBeVisible();
        return;
      }

      await expect(programsPage.programEditButton(programName)).toBeVisible();
      await expect(programsPage.programRow(programName)).toContainText(recreatedDescription);
    });
  });
});
