import { test, expect } from '../fixtures/cleanup.fixture';
import { signInWithCredentials } from '../fixtures/auth.helpers';
import { ProgramsPage } from '../pages/ProgramsPage';
import { createProgramViaUi } from './helpers/createProgramViaUi';

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

test.describe('DS-2 — Edit existing program details', () => {
  test.describe('Positive flows', () => {
    test('TC-001: Edit form opens pre-populated with the selected program\'s current data', async ({
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

      await expect(modal.programNameField).toHaveValue(programName);
      await expect(modal.descriptionField).toHaveValue(description);
      await expect(modal.saveButton).toBeVisible();
      await expect(modal.cancelButton).toBeVisible();
    });

    test('TC-002: Updated program name is reflected immediately in the program list', async ({
      page,
      trackProgram,
    }) => {
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
      await expect(programsPage.programRow(updatedName)).toContainText(description);
    });

    test('TC-003: Unchanged fields are preserved when only Description is edited', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const originalDescription = `Full-stack web development program ${uniqueSuffix()}`;
      const updatedDescription = `Updated full-stack curriculum with React and Node.js modules ${uniqueSuffix()}`;
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

    test('TC-004: Both Program Name and Description can be updated in a single save', async ({
      page,
      trackProgram,
    }) => {
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
      await expect(programsPage.programEditButton(programName)).toHaveCount(0);
      await expect(programsPage.programRow(updatedName)).toContainText(updatedDescription);
    });
  });

  test.describe('Negative flows', () => {
    test('TC-005: Save is blocked when Program Name is cleared during edit', async ({
      page,
      trackProgram,
    }) => {
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
      await expect(modal.dialog).toBeVisible();
      await programsPage.dismissEditModalIfOpen();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    });

    test('TC-006: Cancel discards unsaved edits and preserves original program data', async ({
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
      await programsPage.editProgramModal.fillProgramName(
        uniqueProgramName('Web Development 2026 - Draft Change'),
      );
      await programsPage.editProgramModal.fillDescription('Unsaved draft description');
      await programsPage.editProgramModal.clickCancel();

      await expect(programsPage.editProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
      await expect(programsPage.programRow(programName)).toContainText(description);
    });

    test('TC-007: Renaming a program to an existing name is rejected', async ({
      page,
      trackProgram,
    }) => {
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
        const errorInDialog = editModal.dialog.getByText(DUPLICATE_NAME_PATTERN);
        if ((await errorInDialog.count()) > 0) {
          await expect(errorInDialog.first()).toBeVisible();
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

  test.describe('Negative flows — access control', () => {
    test('TC-008: Non-admin user cannot edit program details', async ({ browser }) => {
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
        await programsPage.gotoAndWaitForTable();
        await expect(programsPage.anyEditButton()).toHaveCount(0);
      } finally {
        await context.close();
      }
    });
  });

  test.describe('Edge cases', () => {
    test('TC-009: Saving with no changes closes modal without error', async ({
      page,
      trackProgram,
    }) => {
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

    test('TC-010: Whitespace-only Program Name is rejected on edit', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `Description ${uniqueSuffix()}` },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillProgramName('     ');
      await expect(programsPage.editProgramModal.saveButton).toBeDisabled();
      await programsPage.dismissEditModalIfOpen();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    });

    test('TC-011: Program name with special characters is accepted on edit', async ({
      page,
      trackProgram,
    }) => {
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

    test('TC-012: Description can be cleared during edit if optional', async ({
      page,
      trackProgram,
    }) => {
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
      const nameCellText = await row.getByRole('cell').first().innerText();
      expect(nameCellText).toContain(programName);
    });

    test('TC-013: Leading and trailing spaces in edited name are trimmed on save', async ({
      page,
      trackProgram,
    }) => {
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
      await expect(programsPage.programRow(trimmedName).getByText(trimmedName)).toBeVisible();
    });

    test('TC-014: Program name at maximum length boundary is accepted on edit', async ({
      page,
      trackProgram,
    }) => {
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
});
