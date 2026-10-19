import { test, expect } from '../fixtures/cleanup.fixture';
import { signInWithCredentials } from '../fixtures/auth.helpers';
import {
  submitProgramCreate,
  submitProgramCreateIfSucceeded,
} from '../fixtures/program-create.helpers';
import { ProgramsPage } from '../pages/ProgramsPage';
import { assertProgramsPageReady } from './helpers/createProgramViaUi';

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

test.describe('DS-1 — Create new academic program', () => {
  test.describe('Positive flows', () => {
    test('TC-001: Program creation form displays required fields after clicking "+ New Program"', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();

      const modal = programsPage.newProgramModal;
      await expect(modal.programNameField).toBeVisible();
      await expect(modal.descriptionField).toBeVisible();
      await expect(modal.createButton).toBeVisible();
      await expect(modal.cancelButton).toBeVisible();
      await expect(modal.headerCloseButton).toBeVisible();
    });

    test('TC-002: New program appears in the list after successful creation', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const description = `Full-stack web development program ${uniqueSuffix()}`;
      const programsPage = new ProgramsPage(page);

      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await expect(programsPage.table).toBeVisible({ timeout: 60_000 });
      await programsPage.openNewProgramForm();
      await submitProgramCreate(page, trackProgram, () =>
        programsPage.createProgram({ name: programName, description }),
      );

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible({ timeout: 30_000 });
      await expect(programsPage.programRow(programName)).toContainText(description);
    });

    test('TC-003: Program can be created with an empty Description when Program Name is provided', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Data Science Fundamentals');
      const programsPage = new ProgramsPage(page);

      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
      await submitProgramCreate(page, trackProgram, () =>
        programsPage.createProgram({ name: programName, description: '' }),
      );

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    });

    test('TC-004: Cancel closes the creation form without adding a program', async ({ page }) => {
      const programName = uniqueProgramName('Temporary Draft Program');
      const programsPage = new ProgramsPage(page);

      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fill({
        name: programName,
        description: 'Draft description',
      });
      await programsPage.newProgramModal.clickCancel();

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toHaveCount(0);
    });
  });

  test.describe('Negative flows', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
    });

    test('TC-005: Create button remains disabled when Program Name is empty', async ({ page }) => {
      const modal = new ProgramsPage(page).newProgramModal;
      await modal.descriptionField.fill('Optional description text');
      await expect(modal.createButton).toBeDisabled();
    });

    test('TC-006: Form is not submitted when Program Name contains only whitespace', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.newProgramModal.fill({
        name: '   ',
        description: 'Valid description text',
      });

      const modal = programsPage.newProgramModal;
      await expect(modal.createButton).toBeDisabled();
      await expect(modal.dialog).toBeVisible();
    });
  });

  test.describe('Negative flows — access control', () => {
    test('TC-008: Non-admin user cannot access program creation', async ({ browser }) => {
      const email = process.env.DIDAXIS_NON_ADMIN_EMAIL;
      const password = process.env.DIDAXIS_NON_ADMIN_PASSWORD;
      test.skip(
        !email || !password,
        'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD for TC-008',
      );

      const context = await browser.newContext({ baseURL: process.env.DIDAXIS_URL });
      const page = await context.newPage();
      try {
        await signInWithCredentials(page, email!, password!);
        const programsPage = new ProgramsPage(page);
        await programsPage.goto();
        await expect(programsPage.newProgramButton).toBeHidden();
      } finally {
        await context.close();
      }
    });
  });

  test.describe('Edge cases', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
    });

    test('TC-009: Program name at maximum allowed length is accepted', async ({
      page,
      trackProgram,
    }) => {
      const seed = uniqueProgramName('MaxLen255');
      const programName = fixedLength(MAX_PROGRAM_NAME_LENGTH, seed);
      const programsPage = new ProgramsPage(page);

      await programsPage.newProgramModal.fill({
        name: programName,
        description: 'Max length validation test',
      });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    });

    test('TC-010: Very long program name has no client-side maxlength block', async ({
      page,
      trackProgram,
    }) => {
      const seed = uniqueProgramName('OverMax');
      const programName = fixedLength(MAX_PROGRAM_NAME_LENGTH + 1, seed);
      const programsPage = new ProgramsPage(page);

      await programsPage.newProgramModal.fill({
        name: programName,
        description: 'Over limit test',
      });

      const modal = programsPage.newProgramModal;
      await expect(modal.createButton).toBeEnabled();

      const created = await submitProgramCreateIfSucceeded(page, trackProgram, () =>
        modal.clickCreate(),
      );

      if (created) {
        await expect(programsPage.newProgramModal.dialog).toBeHidden();
        await expect(programsPage.programEditButton(programName)).toBeVisible();
        return;
      }

      await expect(modal.dialog).toBeVisible();
    });

    test('TC-007: Duplicate program name is allowed during creation', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const programsPage = new ProgramsPage(page);

      await programsPage.newProgramModal.fill({
        name: programName,
        description: 'First program description',
      });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());
      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toHaveCount(1);

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fill({
        name: programName,
        description: 'Another description',
      });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toHaveCount(2);
    });

    test('TC-011: Program name with special characters is accepted', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Informatique & IA - Niveau 2');
      const description = 'Programme bilingue avec caractères spéciaux';
      const programsPage = new ProgramsPage(page);

      await programsPage.newProgramModal.fill({ name: programName, description });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    });

    test('TC-012: Description at maximum allowed length is accepted', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Cybersecurity Essentials');
      const description = fixedLength(
        MAX_DESCRIPTION_LENGTH,
        `Long description ${uniqueSuffix()} `,
      );
      const programsPage = new ProgramsPage(page);

      await programsPage.newProgramModal.fill({ name: programName, description });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    });

    test('TC-013: Leading and trailing spaces in Program Name are trimmed on save', async ({
      page,
      trackProgram,
    }) => {
      const trimmedName = uniqueProgramName('Mobile App Development');
      const paddedName = `  ${trimmedName}  `;
      const programsPage = new ProgramsPage(page);

      await programsPage.newProgramModal.fill({
        name: paddedName,
        description: 'iOS and Android development track',
      });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(trimmedName)).toBeVisible();
      await expect(programsPage.programRow(trimmedName).getByText(trimmedName)).toBeVisible();
    });

    test('TC-014: Escape closes the creation form without adding a program', async ({ page }) => {
      const programName = uniqueProgramName('Draft Program');
      const programsPage = new ProgramsPage(page);

      await programsPage.newProgramModal.fill({
        name: programName,
        description: 'Unsaved draft',
      });
      await programsPage.newProgramModal.pressEscape();

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toHaveCount(0);
    });

    test('TC-015: Create form shows Program Name, Description, and AI config section', async ({
      page,
    }) => {
      const modal = new ProgramsPage(page).newProgramModal;
      await expect(modal.programNameField).toBeVisible();
      await expect(modal.descriptionField).toBeVisible();
      await expect(modal.totalProgramHoursLabel).toBeVisible();
      await expect(modal.aiGenerationConfigToggle).toBeVisible();
    });
  });
});
