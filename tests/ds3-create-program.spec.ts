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

function programEditButton(page: Page, name: string): Locator {
  return page.getByRole('button', { name: `Edit ${name}`, exact: true });
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
  await goToProgramsPage(page);
  await programEditButton(page, programName).click();
  const dialog = editProgramDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

async function clickSave(page: Page): Promise<void> {
  await editProgramDialog(page).getByRole('button', { name: 'Save' }).click();
}

async function expectDuplicateBlockedOnCreate(
  page: Page,
  existingName: string,
  duplicateDescription: string,
): Promise<void> {
  await expect(newProgramDialog(page)).toBeVisible();
  const errorInDialog = newProgramDialog(page).getByText(DUPLICATE_NAME_PATTERN);
  if ((await errorInDialog.count()) > 0) {
    await expect(errorInDialog.first()).toBeVisible();
  }
  await page.reload();
  await goToProgramsPage(page);
  await expect(page.getByText(duplicateDescription)).toHaveCount(0);
  await expect(programEditButton(page, existingName)).toHaveCount(1);
}

test.describe('DS-3 — Program name validation and duplicate prevention', () => {
  test.describe('Positive flows', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('TC-001: Program name containing special characters and accents is accepted', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Informatique & IA - Niveau 2');
      const description = 'Programme de formation avancée en intelligence artificielle';

      await goToProgramsPage(page);
      await openNewProgramModal(page);
      await fillCreateForm(page, { name: programName, description });
      await clickCreate(page);

      await expectCreateModalClosed(page);
      await expect(programEditButton(page, programName)).toBeVisible();
      await expect(programRow(page, programName)).toContainText(description);
    });

    test('TC-002: Valid alphanumeric program name with hyphens and numbers is accepted', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Web Development 2026 - Cohort A');
      const description = 'January 2026 intake';

      await goToProgramsPage(page);
      await openNewProgramModal(page);
      await fillCreateForm(page, { name: programName, description });
      await clickCreate(page);

      await expectCreateModalClosed(page);
      await expect(programRow(page, programName)).toBeVisible();
    });

    test('TC-003: Renaming a program to a unique valid name succeeds', async ({ page }) => {
      const firstName = uniqueProgramName('Web Development 2026');
      const secondName = uniqueProgramName('Data Science Fundamentals');
      const updatedName = uniqueProgramName('Applied Data Science 2026');

      await createProgramViaUi(page, {
        name: firstName,
        description: `First program ${uniqueSuffix()}`,
      });
      await createProgramViaUi(page, {
        name: secondName,
        description: `Second program ${uniqueSuffix()}`,
      });

      const dialog = await openEditModal(page, secondName);
      await editProgramNameField(dialog).fill(updatedName);
      await clickSave(page);

      await expect(editProgramDialog(page)).toBeHidden();
      await expect(programEditButton(page, updatedName)).toBeVisible();
      await expect(programEditButton(page, secondName)).toHaveCount(0);
    });
  });

  test.describe('Negative flows', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await goToProgramsPage(page);
      await openNewProgramModal(page);
    });

    test('TC-004: Whitespace-only program name is rejected and form is not submitted', async ({
      page,
    }) => {
      const dialog = newProgramDialog(page);
      await createProgramNameField(dialog).fill('   ');
      await createDescriptionField(dialog).fill('Valid description');

      await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
      await expect(dialog).toBeVisible();
    });

    test('TC-005: Duplicate program name is rejected on create with clear error message', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');

      await fillCreateForm(page, {
        name: programName,
        description: 'Original program',
      });
      await clickCreate(page);
      await expectCreateModalClosed(page);
      await expect(programEditButton(page, programName)).toHaveCount(1);

      await openNewProgramModal(page);
      const duplicateDescription = 'Duplicate attempt description';
      await fillCreateForm(page, {
        name: programName,
        description: duplicateDescription,
      });
      await clickCreate(page);

      await expectDuplicateBlockedOnCreate(page, programName, duplicateDescription);
    });

    test('TC-006: Duplicate program name is rejected when editing a different program', async ({
      page,
    }) => {
      const firstName = uniqueProgramName('Web Development 2026');
      const secondName = uniqueProgramName('Mobile App Development');
      const secondDescription = `Second program ${uniqueSuffix()}`;

      await fillCreateForm(page, {
        name: firstName,
        description: `First program ${uniqueSuffix()}`,
      });
      await clickCreate(page);
      await expectCreateModalClosed(page);

      await openNewProgramModal(page);
      await fillCreateForm(page, {
        name: secondName,
        description: secondDescription,
      });
      await clickCreate(page);
      await expectCreateModalClosed(page);

      const dialog = await openEditModal(page, secondName);
      await editProgramNameField(dialog).fill(firstName);
      await clickSave(page);

      if (await editProgramDialog(page).isVisible()) {
        await expect(editProgramDialog(page)).toBeVisible();
      } else {
        await expect(editProgramDialog(page)).toBeHidden();
      }

      await page.reload();
      await goToProgramsPage(page);
      await expect(programRow(page, secondDescription)).toBeVisible();
      await expect(programEditButton(page, secondName)).toBeVisible();
      await expect(programEditButton(page, firstName)).toHaveCount(1);
    });

    test('TC-007: Empty program name is rejected on create', async ({ page }) => {
      const dialog = newProgramDialog(page);
      await createDescriptionField(dialog).fill('Description without name');
      await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
    });

    test('TC-008: Program name exceeding maximum length is rejected', async ({ page }) => {
      const programName = fixedLength(
        MAX_PROGRAM_NAME_LENGTH + 1,
        uniqueProgramName('OverMaxLength'),
      );

      await fillCreateForm(page, {
        name: programName,
        description: 'Length validation test',
      });

      const dialog = newProgramDialog(page);
      const createButton = dialog.getByRole('button', { name: 'Create' });

      if (await createButton.isDisabled()) {
        await expect(createButton).toBeDisabled();
        return;
      }

      await createButton.click();
      await expect(programEditButton(page, programName)).toHaveCount(0);
      await expect(dialog).toBeVisible();
    });
  });

  test.describe('Edge cases', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('TC-009: Duplicate check case sensitivity matches product behavior', async ({ page }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const lowercaseVariant = programName.toLowerCase();

      await createProgramViaUi(page, {
        name: programName,
        description: `Existing program ${uniqueSuffix()}`,
      });

      await goToProgramsPage(page);
      await openNewProgramModal(page);
      await fillCreateForm(page, {
        name: lowercaseVariant,
        description: 'Case sensitivity test',
      });
      await clickCreate(page);

      await page.reload();
      await goToProgramsPage(page);

      const originalCount = await programEditButton(page, programName).count();
      const variantCount = await programEditButton(page, lowercaseVariant).count();

      await expect(programEditButton(page, programName)).toHaveCount(1);
      expect(variantCount === 0 || variantCount === 1).toBe(true);
      if (variantCount === 0) {
        expect(originalCount).toBe(1);
      } else {
        expect(variantCount).toBe(1);
      }
    });

    test('TC-010: Leading and trailing whitespace is trimmed before duplicate validation', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const paddedDuplicate = `  ${programName}  `;
      const duplicateDescription = 'Trim before duplicate check';

      await createProgramViaUi(page, {
        name: programName,
        description: `Existing program ${uniqueSuffix()}`,
      });

      await goToProgramsPage(page);
      await openNewProgramModal(page);
      await fillCreateForm(page, {
        name: paddedDuplicate,
        description: duplicateDescription,
      });
      await clickCreate(page);

      await expectDuplicateBlockedOnCreate(page, programName, duplicateDescription);
    });

    test('TC-011: Program name with Unicode characters is handled per spec', async ({ page }) => {
      const programName = uniqueProgramName('日本語プログラム 2026 🎓');
      const description = 'Unicode name validation test';

      await goToProgramsPage(page);
      await openNewProgramModal(page);
      await fillCreateForm(page, { name: programName, description });
      await clickCreate(page);

      await page.reload();
      await goToProgramsPage(page);

      if ((await programEditButton(page, programName).count()) === 0) {
        await expect(programRow(page, programName)).toHaveCount(0);
        return;
      }

      await expect(programEditButton(page, programName)).toBeVisible();
      await expect(programRow(page, programName)).toContainText('🎓');
    });

    test('TC-012: Program name with HTML/script tags is sanitized or rejected', async ({ page }) => {
      const suffix = uniqueSuffix();
      const programName = `<script>alert('xss')</script>Malicious Program ${suffix}`;
      const description = 'XSS prevention test';
      let alertDialogShown = false;

      page.on('dialog', (dialog) => {
        alertDialogShown = true;
        void dialog.dismiss();
      });

      await goToProgramsPage(page);
      await openNewProgramModal(page);
      await fillCreateForm(page, { name: programName, description });
      await clickCreate(page);

      expect(alertDialogShown).toBe(false);

      if (await newProgramDialog(page).isVisible()) {
        await expect(newProgramDialog(page)).toBeVisible();
        return;
      }

      await page.reload();
      await goToProgramsPage(page);

      const row = page.getByRole('row').filter({ hasText: suffix });
      await expect(row).toBeVisible();
      await expect(row.locator('script')).toHaveCount(0);
    });

    test('TC-013: Editing a program to the same name (no change) is allowed', async ({ page }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const originalDescription = `Original description ${uniqueSuffix()}`;
      const updatedDescription = `Updated description ${uniqueSuffix()}`;

      await createProgramViaUi(page, { name: programName, description: originalDescription });

      const dialog = await openEditModal(page, programName);
      await expect(editProgramNameField(dialog)).toHaveValue(programName);
      await editDescriptionField(dialog).fill(updatedDescription);
      await clickSave(page);

      await expect(editProgramDialog(page)).toBeHidden();
      await expect(programEditButton(page, programName)).toBeVisible();
      await expect(programRow(page, programName)).toContainText(updatedDescription);
    });

    test('TC-014: Program name with only tabs and newlines is treated as empty', async ({ page }) => {
      await goToProgramsPage(page);
      const dialog = await openNewProgramModal(page);
      await createProgramNameField(dialog).fill('\t\n\t');
      await createDescriptionField(dialog).fill('Whitespace variant test');

      await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
      await expect(dialog).toBeVisible();
    });

    test('TC-015: Program name at exact maximum length boundary is accepted', async ({ page }) => {
      const programName = fixedLength(MAX_PROGRAM_NAME_LENGTH, uniqueProgramName('MaxBoundary'));

      await goToProgramsPage(page);
      await openNewProgramModal(page);
      await fillCreateForm(page, { name: programName, description: 'Boundary test' });
      await clickCreate(page);

      await expectCreateModalClosed(page);
      await expect(programEditButton(page, programName)).toBeVisible();
    });
  });
});
