import { test, expect, type Page, type Locator } from '@playwright/test';

const LOGIN_PATH = '/login';
const PROGRAMS_PATH = '/programs';

const MAX_PROGRAM_NAME_LENGTH = 255;

const DUPLICATE_NAME_PATTERN =
  /already exists|name already|duplicate|program with this name/i;

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

function newProgramDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'New Program' });
}

function editProgramDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Edit Program' });
}

function createProgramNameField(dialog: Locator): Locator {
  return dialog.getByLabel('Program Name');
}

function createDescriptionField(dialog: Locator): Locator {
  return dialog.getByLabel('Description');
}

function editProgramNameField(dialog: Locator): Locator {
  return dialog.getByLabel('Program Name');
}

function editDescriptionField(dialog: Locator): Locator {
  return dialog.getByLabel('Description');
}

function programsTable(page: Page): Locator {
  return page.getByRole('table');
}

function programRow(page: Page, name: string): Locator {
  return programsTable(page).getByRole('row').filter({ hasText: name });
}

function programEditButton(page: Page, name: string): Locator {
  return page.getByRole('button', { name: `Edit ${name}`, exact: true });
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
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) {
      await page.reload();
    } else {
      await page.goto(PROGRAMS_PATH);
    }
    await expect(page.getByRole('heading', { name: 'Programs', level: 2 })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ New Program' })).toBeVisible();
    try {
      await expect(programsTable(page)).toBeVisible({ timeout: 25_000 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
    }
  }
}

async function openNewProgramModal(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: '+ New Program' }).click();
  const dialog = newProgramDialog(page);
  await expect(dialog).toBeVisible();
  await expect(createProgramNameField(dialog)).toBeVisible();
  return dialog;
}

async function fillCreateForm(
  page: Page,
  options: { name: string; description: string },
): Promise<void> {
  const dialog = newProgramDialog(page);
  await createProgramNameField(dialog).fill(options.name);
  await createDescriptionField(dialog).fill(options.description);
}

async function clickCreate(page: Page): Promise<void> {
  await newProgramDialog(page).getByRole('button', { name: 'Create' }).click();
}

async function expectCreateModalClosed(page: Page): Promise<void> {
  await expect(newProgramDialog(page)).toBeHidden();
}

async function createProgramViaUi(
  page: Page,
  options: { name: string; description: string },
): Promise<void> {
  await goToProgramsPage(page);
  await openNewProgramModal(page);
  await fillCreateForm(page, options);
  await clickCreate(page);
  await expectCreateModalClosed(page);
  await expect(programEditButton(page, options.name)).toBeVisible();
}

async function openEditModal(page: Page, programName: string): Promise<Locator> {
  const editButton = programEditButton(page, programName);
  await editButton.scrollIntoViewIfNeeded();
  await editButton.click();
  const dialog = editProgramDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

async function clickSave(page: Page): Promise<void> {
  await editProgramDialog(page).getByRole('button', { name: 'Save' }).click();
}

async function dismissEditModalIfOpen(page: Page): Promise<void> {
  const dialog = editProgramDialog(page);
  if (!(await dialog.isVisible())) {
    return;
  }
  try {
    await page.keyboard.press('Escape');
    await expectEditModalClosed(page);
  } catch {
    await expect(dialog).toBeHidden();
  }
}

async function expectEditModalClosed(page: Page): Promise<void> {
  await expect(editProgramDialog(page)).toBeHidden();
}

test.describe('DS-2 — Edit existing program details', () => {
  test.describe('Positive flows', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('TC-001: Edit form opens pre-populated with the selected program\'s current data', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const description = `Full-stack web development program ${uniqueSuffix()}`;

      await createProgramViaUi(page, { name: programName, description });
      const dialog = await openEditModal(page, programName);

      await expect(editProgramNameField(dialog)).toHaveValue(programName);
      await expect(editDescriptionField(dialog)).toHaveValue(description);
      await expect(dialog.getByRole('button', { name: 'Save' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    test('TC-002: Updated program name is reflected immediately in the program list', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const updatedName = uniqueProgramName('Web Development 2026 - Updated');
      const description = `Original description ${uniqueSuffix()}`;

      await createProgramViaUi(page, { name: programName, description });
      const dialog = await openEditModal(page, programName);
      await editProgramNameField(dialog).fill(updatedName);
      await clickSave(page);

      await expectEditModalClosed(page);
      await expect(programEditButton(page, updatedName)).toBeVisible();
      await expect(programEditButton(page, programName)).toHaveCount(0);
      await expect(programRow(page, updatedName)).toContainText(description);
    });

    test('TC-003: Unchanged fields are preserved when only Description is edited', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const originalDescription = `Full-stack web development program ${uniqueSuffix()}`;
      const updatedDescription = `Updated full-stack curriculum with React and Node.js modules ${uniqueSuffix()}`;

      await createProgramViaUi(page, {
        name: programName,
        description: originalDescription,
      });

      const dialog = await openEditModal(page, programName);
      await editDescriptionField(dialog).fill(updatedDescription);
      await clickSave(page);

      await expectEditModalClosed(page);
      await expect(programEditButton(page, programName)).toBeVisible();
      await expect(programRow(page, programName)).toContainText(updatedDescription);
    });

    test('TC-004: Both Program Name and Description can be updated in a single save', async ({
      page,
    }) => {
      const programName = uniqueProgramName('UX Design Foundations');
      const updatedName = uniqueProgramName('UX Design Foundations - Professional Track');
      const updatedDescription = `Advanced UX research, prototyping, and usability testing ${uniqueSuffix()}`;

      await createProgramViaUi(page, {
        name: programName,
        description: `Introductory UX course ${uniqueSuffix()}`,
      });

      const dialog = await openEditModal(page, programName);
      await editProgramNameField(dialog).fill(updatedName);
      await editDescriptionField(dialog).fill(updatedDescription);
      await clickSave(page);

      await expectEditModalClosed(page);
      await expect(programEditButton(page, updatedName)).toBeVisible();
      await expect(programEditButton(page, programName)).toHaveCount(0);
      await expect(programRow(page, updatedName)).toContainText(updatedDescription);
    });
  });

  test.describe('Negative flows', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('TC-005: Save is blocked when Program Name is cleared during edit', async ({ page }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const description = `Description ${uniqueSuffix()}`;

      await createProgramViaUi(page, { name: programName, description });
      const dialog = await openEditModal(page, programName);
      await editProgramNameField(dialog).fill('');

      const saveButton = dialog.getByRole('button', { name: 'Save' });
      await expect(saveButton).toBeDisabled();
      await expect(dialog).toBeVisible();
      await dismissEditModalIfOpen(page);
      await expect(programEditButton(page, programName)).toBeVisible();
    });

    test('TC-006: Cancel discards unsaved edits and preserves original program data', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const description = `Full-stack web development program ${uniqueSuffix()}`;

      await createProgramViaUi(page, { name: programName, description });
      const dialog = await openEditModal(page, programName);
      await editProgramNameField(dialog).fill(uniqueProgramName('Web Development 2026 - Draft Change'));
      await editDescriptionField(dialog).fill('Unsaved draft description');
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expectEditModalClosed(page);
      await expect(programEditButton(page, programName)).toBeVisible();
      await expect(programRow(page, programName)).toContainText(description);
    });

    test('TC-007: Renaming a program to an existing name is rejected', async ({ page }) => {
      const firstName = uniqueProgramName('Web Development 2026');
      const secondName = uniqueProgramName('Data Science Fundamentals');
      const secondDescription = `Second program ${uniqueSuffix()}`;

      await createProgramViaUi(page, {
        name: firstName,
        description: `First program ${uniqueSuffix()}`,
      });
      await createProgramViaUi(page, {
        name: secondName,
        description: secondDescription,
      });

      const dialog = await openEditModal(page, secondName);
      await editProgramNameField(dialog).fill(firstName);
      await clickSave(page);

      const editDialog = editProgramDialog(page);
      if (await editDialog.isVisible()) {
        const errorInDialog = editDialog.getByText(DUPLICATE_NAME_PATTERN);
        if ((await errorInDialog.count()) > 0) {
          await expect(errorInDialog.first()).toBeVisible();
        }
        await dismissEditModalIfOpen(page);
      }

      await page.reload();
      await goToProgramsPage(page);

      const secondRow = programRow(page, secondDescription);
      await expect(secondRow).toBeVisible();
      await expect(secondRow.locator('p').first()).toHaveText(secondName);
      await expect(programEditButton(page, firstName)).toHaveCount(1);
    });
  });

  test.describe('Negative flows — access control', () => {
    test('TC-008: Non-admin user cannot edit program details', async ({ page }) => {
      const email = process.env.DIDAXIS_NON_ADMIN_EMAIL;
      const password = process.env.DIDAXIS_NON_ADMIN_PASSWORD;
      test.skip(
        !email || !password,
        'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD for TC-008',
      );

      await page.goto(LOGIN_PATH);
      await page.getByLabel('Email').fill(email!);
      await page.getByLabel('Password').fill(password!);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).not.toHaveURL(/\/login\/?$/);

      await goToProgramsPage(page);
      await expect(page.getByRole('button', { name: /^Edit / })).toHaveCount(0);
    });
  });

  test.describe('Edge cases', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('TC-009: Saving with no changes closes modal without error', async ({ page }) => {
      const programName = uniqueProgramName('Web Development 2026');

      await createProgramViaUi(page, {
        name: programName,
        description: `Unchanged description ${uniqueSuffix()}`,
      });

      await openEditModal(page, programName);
      await clickSave(page);

      await expectEditModalClosed(page);
      await expect(programEditButton(page, programName)).toHaveCount(1);
    });

    test('TC-010: Whitespace-only Program Name is rejected on edit', async ({ page }) => {
      const programName = uniqueProgramName('Web Development 2026');

      await createProgramViaUi(page, {
        name: programName,
        description: `Description ${uniqueSuffix()}`,
      });

      const dialog = await openEditModal(page, programName);
      await editProgramNameField(dialog).fill('     ');
      await expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();
      await dismissEditModalIfOpen(page);
      await expect(programEditButton(page, programName)).toBeVisible();
    });

    test('TC-011: Program name with special characters is accepted on edit', async ({ page }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const specialName = `Informatique & IA - Niveau 2 (Édition 2026) ${uniqueSuffix()}`;

      await createProgramViaUi(page, {
        name: programName,
        description: `Description ${uniqueSuffix()}`,
      });

      const dialog = await openEditModal(page, programName);
      await editProgramNameField(dialog).fill(specialName);
      await clickSave(page);

      await expectEditModalClosed(page);
      await expect(programEditButton(page, specialName)).toBeVisible();
    });

    test('TC-012: Description can be cleared during edit if optional', async ({ page }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const description = `Non-empty description ${uniqueSuffix()}`;

      await createProgramViaUi(page, { name: programName, description });
      const dialog = await openEditModal(page, programName);
      await editDescriptionField(dialog).fill('');
      await clickSave(page);

      await expectEditModalClosed(page);
      await expect(programEditButton(page, programName)).toBeVisible();
      const row = programRow(page, programName);
      await expect(row).not.toContainText(description);
      const paragraphCount = await row.locator('p').count();
      if (paragraphCount > 1) {
        await expect(row.locator('p').nth(1)).toHaveText('');
      } else {
        expect(paragraphCount).toBe(1);
      }
    });

    test('TC-013: Leading and trailing spaces in edited name are trimmed on save', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const trimmedName = uniqueProgramName('Cloud Computing Certificate');
      const paddedName = `  ${trimmedName}  `;

      await createProgramViaUi(page, {
        name: programName,
        description: `Description ${uniqueSuffix()}`,
      });

      const dialog = await openEditModal(page, programName);
      await editProgramNameField(dialog).fill(paddedName);
      await clickSave(page);

      await expectEditModalClosed(page);
      await expect(programEditButton(page, trimmedName)).toBeVisible();
      await expect(programRow(page, trimmedName).locator('p').first()).toHaveText(trimmedName);
    });

    test('TC-014: Program name at maximum length boundary is accepted on edit', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Short Name Program');
      const maxName = fixedLength(MAX_PROGRAM_NAME_LENGTH, uniqueProgramName('MaxLen255Edit'));

      await createProgramViaUi(page, {
        name: programName,
        description: `Description ${uniqueSuffix()}`,
      });

      const dialog = await openEditModal(page, programName);
      await editProgramNameField(dialog).fill(maxName);
      await clickSave(page);

      await expectEditModalClosed(page);
      await expect(programEditButton(page, maxName)).toBeVisible();
    });
  });
});
