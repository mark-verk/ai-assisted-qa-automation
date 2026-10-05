import { test, expect, type Page, type Locator } from '@playwright/test';

const LOGIN_PATH = '/login';
const PROGRAMS_PATH = '/programs';

const MAX_PROGRAM_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 2000;

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

function programNameField(dialog: Locator): Locator {
  return dialog.getByLabel('Program Name');
}

function descriptionField(dialog: Locator): Locator {
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
  await page.goto(PROGRAMS_PATH, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Programs', level: 2 })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ New Program' })).toBeVisible();
}

async function waitForProgramsList(page: Page): Promise<void> {
  await expect(programsTable(page)).toBeVisible({ timeout: 60_000 });
}

async function openNewProgramModal(page: Page): Promise<Locator> {
  const newProgramButton = page.getByRole('button', { name: '+ New Program' });
  await newProgramButton.scrollIntoViewIfNeeded();

  const dialog = newProgramDialog(page);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await newProgramButton.click();
    try {
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      break;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
    }
  }

  await expect(programNameField(dialog)).toBeVisible();
  return dialog;
}

async function fillProgramForm(
  page: Page,
  options: { name: string; description?: string },
): Promise<void> {
  const dialog = newProgramDialog(page);
  await programNameField(dialog).fill(options.name);
  if (options.description !== undefined) {
    await descriptionField(dialog).fill(options.description);
  }
}

async function clickCreate(page: Page): Promise<void> {
  await newProgramDialog(page).getByRole('button', { name: 'Create' }).click();
}

async function expectModalClosed(page: Page): Promise<void> {
  await expect(newProgramDialog(page)).toBeHidden();
}

test.describe('DS-1 — Create new academic program', () => {
  test.describe('Positive flows', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('TC-001: Program creation form displays required fields after clicking "+ New Program"', async ({
      page,
    }) => {
      await goToProgramsPage(page);
      const dialog = await openNewProgramModal(page);

      await expect(programNameField(dialog)).toBeVisible();
      await expect(descriptionField(dialog)).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Create' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(dialog.getByRole('banner').getByRole('button')).toBeVisible();
    });

    test('TC-002: New program appears in the list after successful creation', async ({ page }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const description = `Full-stack web development program ${uniqueSuffix()}`;

      await goToProgramsPage(page);
      await waitForProgramsList(page);
      await openNewProgramModal(page);
      await fillProgramForm(page, { name: programName, description });
      await clickCreate(page);

      await expectModalClosed(page);
      await expect(programEditButton(page, programName)).toBeVisible({ timeout: 30_000 });
      await expect(programRow(page, programName)).toContainText(description);
    });

    test('TC-003: Program can be created with an empty Description when Program Name is provided', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Data Science Fundamentals');

      await goToProgramsPage(page);
      await openNewProgramModal(page);
      await fillProgramForm(page, { name: programName, description: '' });
      await clickCreate(page);

      await expectModalClosed(page);
      await expect(programEditButton(page, programName)).toBeVisible();
    });

    test('TC-004: Cancel closes the creation form without adding a program', async ({ page }) => {
      const programName = uniqueProgramName('Temporary Draft Program');

      await goToProgramsPage(page);
      await openNewProgramModal(page);
      await fillProgramForm(page, {
        name: programName,
        description: 'Draft description',
      });
      await newProgramDialog(page).getByRole('button', { name: 'Cancel' }).click();

      await expectModalClosed(page);
      await expect(programEditButton(page, programName)).toHaveCount(0);
    });
  });

  test.describe('Negative flows', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await goToProgramsPage(page);
      await openNewProgramModal(page);
    });

    test('TC-005: Create button remains disabled when Program Name is empty', async ({ page }) => {
      const dialog = newProgramDialog(page);
      await descriptionField(dialog).fill('Optional description text');
      await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
    });

    test('TC-006: Form is not submitted when Program Name contains only whitespace', async ({
      page,
    }) => {
      await fillProgramForm(page, {
        name: '   ',
        description: 'Valid description text',
      });

      const dialog = newProgramDialog(page);
      await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
      await expect(dialog).toBeVisible();
    });

  });

  test.describe('Negative flows — access control', () => {
    test('TC-008: Non-admin user cannot access program creation', async ({ page }) => {
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

      await page.goto(PROGRAMS_PATH);
      await expect(page.getByRole('button', { name: '+ New Program' })).toBeHidden();
    });
  });

  test.describe('Edge cases', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await goToProgramsPage(page);
      await openNewProgramModal(page);
    });

    test('TC-009: Program name at maximum allowed length is accepted', async ({ page }) => {
      const seed = uniqueProgramName('MaxLen255');
      const programName = fixedLength(MAX_PROGRAM_NAME_LENGTH, seed);

      await fillProgramForm(page, {
        name: programName,
        description: 'Max length validation test',
      });
      await clickCreate(page);

      await expectModalClosed(page);
      await expect(programEditButton(page, programName)).toBeVisible();
    });

    test('TC-010: Very long program name has no client-side maxlength block', async ({ page }) => {
      const seed = uniqueProgramName('OverMax');
      const programName = fixedLength(MAX_PROGRAM_NAME_LENGTH + 1, seed);

      await fillProgramForm(page, {
        name: programName,
        description: 'Over limit test',
      });

      const dialog = newProgramDialog(page);
      const createButton = dialog.getByRole('button', { name: 'Create' });
      await expect(createButton).toBeEnabled();

      await createButton.click();
      const created = await programEditButton(page, programName)
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (created) {
        await expectModalClosed(page);
        await expect(programEditButton(page, programName)).toBeVisible();
        return;
      }

      await expect(dialog).toBeVisible();
    });

    test('TC-007: Duplicate program name is allowed during creation', async ({ page }) => {
      const programName = uniqueProgramName('Web Development 2026');

      await fillProgramForm(page, {
        name: programName,
        description: 'First program description',
      });
      await clickCreate(page);
      await expectModalClosed(page);
      await expect(programEditButton(page, programName)).toHaveCount(1);

      await openNewProgramModal(page);
      await fillProgramForm(page, {
        name: programName,
        description: 'Another description',
      });
      await clickCreate(page);

      await expectModalClosed(page);
      await expect(programEditButton(page, programName)).toHaveCount(2);
    });

    test('TC-011: Program name with special characters is accepted', async ({ page }) => {
      const programName = uniqueProgramName('Informatique & IA - Niveau 2');
      const description = 'Programme bilingue avec caractères spéciaux';

      await fillProgramForm(page, { name: programName, description });
      await clickCreate(page);

      await expectModalClosed(page);
      await expect(programEditButton(page, programName)).toBeVisible();
    });

    test('TC-012: Description at maximum allowed length is accepted', async ({ page }) => {
      const programName = uniqueProgramName('Cybersecurity Essentials');
      const description = fixedLength(
        MAX_DESCRIPTION_LENGTH,
        `Long description ${uniqueSuffix()} `,
      );

      await fillProgramForm(page, { name: programName, description });
      await clickCreate(page);

      await expectModalClosed(page);
      await expect(programEditButton(page, programName)).toBeVisible();
    });

    test('TC-013: Leading and trailing spaces in Program Name are trimmed on save', async ({
      page,
    }) => {
      const trimmedName = uniqueProgramName('Mobile App Development');
      const paddedName = `  ${trimmedName}  `;

      await fillProgramForm(page, {
        name: paddedName,
        description: 'iOS and Android development track',
      });
      await clickCreate(page);

      await expectModalClosed(page);
      await expect(programEditButton(page, trimmedName)).toBeVisible();
      await expect(programRow(page, trimmedName).locator('p').first()).toHaveText(trimmedName);
    });

    test('TC-014: Escape closes the creation form without adding a program', async ({ page }) => {
      const programName = uniqueProgramName('Draft Program');

      await fillProgramForm(page, {
        name: programName,
        description: 'Unsaved draft',
      });
      await page.keyboard.press('Escape');

      await expectModalClosed(page);
      await expect(programEditButton(page, programName)).toHaveCount(0);
    });

    test('TC-015: Create form shows Program Name, Description, and AI config section', async ({
      page,
    }) => {
      const dialog = newProgramDialog(page);
      await expect(programNameField(dialog)).toBeVisible();
      await expect(descriptionField(dialog)).toBeVisible();
      await expect(dialog.getByText('Total Program Hours')).toBeVisible();
      await expect(
        dialog.getByRole('button', { name: /Show AI Generation Config|Hide AI Generation Config/i }),
      ).toBeVisible();
    });
  });
});
