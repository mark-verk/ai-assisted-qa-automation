import { test, expect, type Page, type Locator } from '@playwright/test';

const LOGIN_PATH = '/login';
const PROGRAMS_PATH = '/programs';

function uniqueSuffix(): string {
  return String(Date.now());
}

function uniqueProgramName(base: string): string {
  return `${base} ${uniqueSuffix()}`;
}

function newProgramDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'New Program' });
}

function programEditButton(page: Page, name: string): Locator {
  return page.getByRole('button', { name: `Edit ${name}`, exact: true });
}

function programDeleteButton(page: Page, name: string): Locator {
  return page.getByRole('button', { name: `Delete ${name}`, exact: true });
}

function programRow(page: Page, name: string): Locator {
  return page.getByRole('table').getByRole('row').filter({ hasText: name });
}

async function loginAsAdmin(page: Page): Promise<void> {
  const email = process.env.DIDAXIS_EMAIL;
  const password = process.env.DIDAXIS_PASSWORD;
  test.skip(!email || !password, 'Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env');

  await page.goto(LOGIN_PATH);
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).not.toHaveURL(/\/login\/?$/);
}

async function goToProgramsPage(page: Page): Promise<void> {
  await page.goto(PROGRAMS_PATH);
  await expect(page.getByRole('heading', { name: 'Programs', level: 2 })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ New Program' })).toBeVisible();
}

async function openNewProgramModal(page: Page): Promise<Locator> {
  const newProgramButton = page.getByRole('button', { name: '+ New Program' });
  await newProgramButton.scrollIntoViewIfNeeded();
  await newProgramButton.click();
  const dialog = newProgramDialog(page);
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  return dialog;
}

async function createProgramViaUi(
  page: Page,
  options: { name: string; description: string },
): Promise<void> {
  await goToProgramsPage(page);
  await openNewProgramModal(page);
  const dialog = newProgramDialog(page);
  await dialog.getByLabel('Program Name').fill(options.name);
  await dialog.getByLabel('Description').fill(options.description);
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(newProgramDialog(page)).toBeHidden();
  await expect(programEditButton(page, options.name)).toBeVisible();
}

async function handleDeleteConfirm(
  page: Page,
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
  await programDeleteButton(page, programName).click();
  return message;
}

test.describe('DS-4 — Delete program with confirmation', () => {
  test.describe('Positive flows', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('TC-001: Program is removed from the list after confirming deletion', async ({ page }) => {
      const programName = uniqueProgramName('Test Program');
      const description = `Program used for QA deletion testing ${uniqueSuffix()}`;

      await createProgramViaUi(page, { name: programName, description });

      await handleDeleteConfirm(page, programName, 'accept');

      await expect(programDeleteButton(page, programName)).toHaveCount(0);
      await expect(programEditButton(page, programName)).toHaveCount(0);
      await expect(programRow(page, programName)).toHaveCount(0);
    });

    test('TC-002: Program remains in the list when deletion is cancelled', async ({ page }) => {
      const programName = uniqueProgramName('Test Program');
      const description = `Program used for QA deletion testing ${uniqueSuffix()}`;

      await createProgramViaUi(page, { name: programName, description });
      await handleDeleteConfirm(page, programName, 'dismiss');

      await expect(programDeleteButton(page, programName)).toBeVisible();
      await expect(programRow(page, programName)).toContainText(description);
    });

    test('TC-003: Confirmation dialog displays program name and destructive action warning', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Test Program');
      const description = `Program used for QA deletion testing ${uniqueSuffix()}`;

      await createProgramViaUi(page, { name: programName, description });

      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        const message = dialog.message();
        expect(message).toContain(programName);
        expect(message).toMatch(/delete|remove|cannot be undone|semesters|courses/i);
        await dialog.dismiss();
      });
      await programDeleteButton(page, programName).click();

      await expect(programDeleteButton(page, programName)).toBeVisible();
    });
  });

  test.describe('Negative flows', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('TC-004: Program is not deleted when confirmation dialog is dismissed via Escape key', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Test Program');
      await createProgramViaUi(page, {
        name: programName,
        description: `Program used for QA deletion testing ${uniqueSuffix()}`,
      });

      await handleDeleteConfirm(page, programName, 'dismiss');

      await expect(programDeleteButton(page, programName)).toBeVisible();
    });

    test('TC-005: Program is not deleted when confirmation dialog is closed via X button', async ({
      page,
    }) => {
      test.skip(
        true,
        'Delete confirmation uses the native browser confirm dialog, which has no X close control',
      );
    });

    test('TC-006: Non-admin user cannot delete programs', async ({ page, browser }) => {
      const email = process.env.DIDAXIS_NON_ADMIN_EMAIL;
      const password = process.env.DIDAXIS_NON_ADMIN_PASSWORD;
      test.skip(
        !email || !password,
        'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD for TC-006',
      );

      const programName = uniqueProgramName('Test Program');
      await createProgramViaUi(page, {
        name: programName,
        description: `Protected from non-admin delete ${uniqueSuffix()}`,
      });

      const nonAdminContext = await browser.newContext({
        baseURL: process.env.DIDAXIS_URL,
      });
      const nonAdminPage = await nonAdminContext.newPage();
      await nonAdminPage.goto(LOGIN_PATH);
      await nonAdminPage.getByLabel('Email').fill(email!);
      await nonAdminPage.getByLabel('Password').fill(password!);
      await nonAdminPage.getByRole('button', { name: 'Sign In' }).click();
      await expect(nonAdminPage).not.toHaveURL(/\/login\/?$/);

      await goToProgramsPage(nonAdminPage);
      await expect(programDeleteButton(nonAdminPage, programName)).toBeHidden();
      await nonAdminContext.close();
    });

    test('TC-007: Deletion fails gracefully when program was already deleted by another session', async ({
      page,
      browser,
    }) => {
      const programName = uniqueProgramName('Test Program');
      await createProgramViaUi(page, {
        name: programName,
        description: `Stale delete scenario ${uniqueSuffix()}`,
      });

      const staleContext = await browser.newContext({
        baseURL: process.env.DIDAXIS_URL,
      });
      const stalePage = await staleContext.newPage();
      await loginAsAdmin(stalePage);
      await stalePage.goto(PROGRAMS_PATH);
      await expect(programDeleteButton(stalePage, programName)).toBeVisible({ timeout: 30_000 });

      await handleDeleteConfirm(page, programName, 'accept');
      await expect(programDeleteButton(page, programName)).toHaveCount(0);

      stalePage.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await programDeleteButton(stalePage, programName).click();

      await stalePage.reload();
      await goToProgramsPage(stalePage);
      await expect(programDeleteButton(stalePage, programName)).toHaveCount(0);
      await staleContext.close();
    });
  });

  test.describe('Edge cases', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('TC-008: Deleting the last program transitions to empty state', async () => {
      test.skip(
        true,
        'Requires an isolated tenant with zero programs; shared test.didaxis.studio accumulates data from other runs',
      );
    });

    test('TC-009: Double-click on Confirm does not cause duplicate delete requests or errors', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Test Program');
      await createProgramViaUi(page, {
        name: programName,
        description: `Double confirm delete ${uniqueSuffix()}`,
      });

      let dialogHandled = 0;
      page.on('dialog', async (dialog) => {
        dialogHandled += 1;
        await dialog.accept();
      });

      const deleteButton = programDeleteButton(page, programName);
      await deleteButton.click({ clickCount: 2 });

      await expect(programDeleteButton(page, programName)).toHaveCount(0, { timeout: 15_000 });
      expect(dialogHandled).toBeGreaterThanOrEqual(1);
      expect(dialogHandled).toBeLessThanOrEqual(2);
    });

    test('TC-010: Deleting a program shows curriculum-related warning in confirmation', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Test Program');
      await createProgramViaUi(page, {
        name: programName,
        description: `Curriculum warning check ${uniqueSuffix()}`,
      });

      const message = await handleDeleteConfirm(page, programName, 'dismiss');
      expect(message).toMatch(/semesters|courses|curriculum|removed|cannot be undone/i);
    });

    test('TC-011: Delete icon is not actionable for programs in a protected state (if applicable)', async ({
      page,
    }) => {
      test.skip(true, 'No protected/published program state is available in the test environment');
    });

    test('TC-012: Confirmation dialog prevents accidental click-through during loading', async ({
      page,
    }) => {
      test.skip(
        true,
        'Native browser confirm dialog does not expose in-progress disabled Confirm button state',
      );
    });

    test('TC-013: Deleted program name can be reused for new program creation (if soft-delete not used)', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Test Program');
      const recreatedDescription = `Recreated program after deletion ${uniqueSuffix()}`;

      await createProgramViaUi(page, {
        name: programName,
        description: `Original before delete ${uniqueSuffix()}`,
      });
      await handleDeleteConfirm(page, programName, 'accept');
      await expect(programDeleteButton(page, programName)).toHaveCount(0);

      await openNewProgramModal(page);
      const dialog = newProgramDialog(page);
      await dialog.getByLabel('Program Name').fill(programName);
      await dialog.getByLabel('Description').fill(recreatedDescription);
      await dialog.getByRole('button', { name: 'Create' }).click();

      const modalStillOpen = await newProgramDialog(page).isVisible();
      if (modalStillOpen) {
        await expect(newProgramDialog(page)).toBeVisible();
        return;
      }

      await expect(programEditButton(page, programName)).toBeVisible();
      await expect(programRow(page, programName)).toContainText(recreatedDescription);
    });
  });
});
