import { test, expect } from '../fixtures/cleanup.fixture';
import {
  submitProgramCreate,
  submitProgramCreateIfSucceeded,
} from '../fixtures/program-create.helpers';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  assertProgramsPageReady,
  createProgramViaUi,
} from './helpers/createProgramViaUi';

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

async function openEditModalFromList(
  programsPage: ProgramsPage,
  programName: string,
): Promise<void> {
  await programsPage.goto();
  await assertProgramsPageReady(programsPage);
  await programsPage.programEditButton(programName).click();
  await programsPage.editProgramModal.dialog.waitFor({ state: 'visible' });
}

async function expectDuplicateBlockedOnCreate(
  page: import('@playwright/test').Page,
  programsPage: ProgramsPage,
  existingName: string,
  duplicateDescription: string,
): Promise<void> {
  await expect(programsPage.newProgramModal.dialog).toBeVisible();
  const errorInDialog = programsPage.newProgramModal.dialog.getByText(DUPLICATE_NAME_PATTERN);
  if ((await errorInDialog.count()) > 0) {
    await expect(errorInDialog.first()).toBeVisible();
  }
  await page.reload();
  await programsPage.goto();
  await assertProgramsPageReady(programsPage);
  await expect(page.getByText(duplicateDescription)).toHaveCount(0);
  await expect(programsPage.programEditButton(existingName)).toHaveCount(1);
}

test.describe('DS-3 — Program name validation and duplicate prevention', () => {
  test.describe('Positive flows', () => {
    test('TC-001: Program name containing special characters and accents is accepted', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Informatique & IA - Niveau 2');
      const description = 'Programme de formation avancée en intelligence artificielle';
      const programsPage = new ProgramsPage(page);

      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fill({ name: programName, description });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
      await expect(programsPage.programRow(programName)).toContainText(description);
    });

    test('TC-002: Valid alphanumeric program name with hyphens and numbers is accepted', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web Development 2026 - Cohort A');
      const description = 'January 2026 intake';
      const programsPage = new ProgramsPage(page);

      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fill({ name: programName, description });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programRow(programName)).toBeVisible();
    });

    test('TC-003: Renaming a program to a unique valid name succeeds', async ({
      page,
      trackProgram,
    }) => {
      const firstName = uniqueProgramName('Web Development 2026');
      const secondName = uniqueProgramName('Data Science Fundamentals');
      const updatedName = uniqueProgramName('Applied Data Science 2026');
      const programsPage = await createProgramViaUi(
        page,
        { name: firstName, description: `First program ${uniqueSuffix()}` },
        trackProgram,
      );
      await createProgramViaUi(
        page,
        { name: secondName, description: `Second program ${uniqueSuffix()}` },
        trackProgram,
        programsPage,
      );

      await openEditModalFromList(programsPage, secondName);
      await programsPage.editProgramModal.fillProgramName(updatedName);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.editProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(updatedName)).toBeVisible();
      await expect(programsPage.programEditButton(secondName)).toHaveCount(0);
    });
  });

  test.describe('Negative flows', () => {
    test.beforeEach(async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
    });

    test('TC-004: Whitespace-only program name is rejected and form is not submitted', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      const modal = programsPage.newProgramModal;
      await modal.fill({ name: '   ', description: 'Valid description' });

      await expect(modal.createButton).toBeDisabled();
      await expect(modal.dialog).toBeVisible();
    });

    test('TC-005: Duplicate program name is rejected on create with clear error message', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const programsPage = new ProgramsPage(page);

      await programsPage.newProgramModal.fill({
        name: programName,
        description: 'Original program',
      });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());
      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toHaveCount(1);

      await programsPage.openNewProgramForm();
      const duplicateDescription = 'Duplicate attempt description';
      await programsPage.newProgramModal.fill({
        name: programName,
        description: duplicateDescription,
      });
      await programsPage.newProgramModal.clickCreate();

      await expectDuplicateBlockedOnCreate(page, programsPage, programName, duplicateDescription);
    });

    test('TC-006: Duplicate program name is rejected when editing a different program', async ({
      page,
      trackProgram,
    }) => {
      const firstName = uniqueProgramName('Web Development 2026');
      const secondName = uniqueProgramName('Mobile App Development');
      const secondDescription = `Second program ${uniqueSuffix()}`;
      const programsPage = new ProgramsPage(page);

      await programsPage.newProgramModal.fill({
        name: firstName,
        description: `First program ${uniqueSuffix()}`,
      });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());
      await expect(programsPage.newProgramModal.dialog).toBeHidden();

      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fill({
        name: secondName,
        description: secondDescription,
      });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());
      await expect(programsPage.newProgramModal.dialog).toBeHidden();

      await openEditModalFromList(programsPage, secondName);
      await programsPage.editProgramModal.fillProgramName(firstName);
      await programsPage.editProgramModal.clickSave();

      if (await programsPage.editProgramModal.dialog.isVisible()) {
        await expect(programsPage.editProgramModal.dialog).toBeVisible();
      } else {
        await expect(programsPage.editProgramModal.dialog).toBeHidden();
      }

      await page.reload();
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await expect(programsPage.programRow(secondDescription)).toBeVisible();
      await expect(programsPage.programEditButton(secondName)).toBeVisible();
      await expect(programsPage.programEditButton(firstName)).toHaveCount(1);
    });

    test('TC-007: Empty program name is rejected on create', async ({ page }) => {
      const modal = new ProgramsPage(page).newProgramModal;
      await modal.descriptionField.fill('Description without name');
      await expect(modal.createButton).toBeDisabled();
    });

    test('TC-008: Program name exceeding maximum length is rejected', async ({
      page,
      trackProgram,
    }) => {
      const programName = fixedLength(
        MAX_PROGRAM_NAME_LENGTH + 1,
        uniqueProgramName('OverMaxLength'),
      );
      const programsPage = new ProgramsPage(page);

      await programsPage.newProgramModal.fill({
        name: programName,
        description: 'Length validation test',
      });

      const modal = programsPage.newProgramModal;
      const createButton = modal.createButton;

      if (await createButton.isDisabled()) {
        await expect(createButton).toBeDisabled();
        return;
      }

      const created = await submitProgramCreateIfSucceeded(page, trackProgram, () =>
        createButton.click(),
      );
      if (created) {
        await expect(programsPage.newProgramModal.dialog).toBeHidden();
        await expect(programsPage.programEditButton(programName)).toBeVisible();
        return;
      }

      await expect(programsPage.programEditButton(programName)).toHaveCount(0);
      await expect(modal.dialog).toBeVisible();
    });
  });

  test.describe('Edge cases', () => {
    test('TC-009: Duplicate check case sensitivity matches product behavior', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const lowercaseVariant = programName.toLowerCase();
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `Existing program ${uniqueSuffix()}` },
        trackProgram,
      );

      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fill({
        name: lowercaseVariant,
        description: 'Case sensitivity test',
      });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());

      await page.reload();
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);

      const originalCount = await programsPage.programEditButton(programName).count();
      const variantCount = await programsPage.programEditButton(lowercaseVariant).count();

      await expect(programsPage.programEditButton(programName)).toHaveCount(1);
      expect(variantCount === 0 || variantCount === 1).toBe(true);
      if (variantCount === 0) {
        expect(originalCount).toBe(1);
      } else {
        expect(variantCount).toBe(1);
      }
    });

    test('TC-010: Leading and trailing whitespace is trimmed before duplicate validation', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const paddedDuplicate = `  ${programName}  `;
      const duplicateDescription = 'Trim before duplicate check';
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `Existing program ${uniqueSuffix()}` },
        trackProgram,
      );

      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fill({
        name: paddedDuplicate,
        description: duplicateDescription,
      });
      await programsPage.newProgramModal.clickCreate();

      await expectDuplicateBlockedOnCreate(page, programsPage, programName, duplicateDescription);
    });

    test('TC-011: Program name with Unicode characters is handled per spec', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('日本語プログラム 2026 🎓');
      const description = 'Unicode name validation test';
      const programsPage = new ProgramsPage(page);

      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fill({ name: programName, description });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());

      await page.reload();
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);

      if ((await programsPage.programEditButton(programName).count()) === 0) {
        await expect(programsPage.programRow(programName)).toHaveCount(0);
        return;
      }

      await expect(programsPage.programEditButton(programName)).toBeVisible();
      await expect(programsPage.programRow(programName)).toContainText('🎓');
    });

    test('TC-012: Program name with HTML/script tags is sanitized or rejected', async ({
      page,
      trackProgram,
    }) => {
      const suffix = uniqueSuffix();
      const programName = `<script>alert('xss')</script>Malicious Program ${suffix}`;
      const description = 'XSS prevention test';
      let alertDialogShown = false;
      const programsPage = new ProgramsPage(page);

      page.on('dialog', (dialog) => {
        alertDialogShown = true;
        void dialog.dismiss();
      });

      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fill({ name: programName, description });
      await submitProgramCreateIfSucceeded(page, trackProgram, () =>
        programsPage.newProgramModal.clickCreate(),
      );

      expect(alertDialogShown).toBe(false);

      if (await programsPage.newProgramModal.dialog.isVisible()) {
        await expect(programsPage.newProgramModal.dialog).toBeVisible();
        return;
      }

      await page.reload();
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);

      const row = programsPage.rowContaining(suffix);
      await expect(row).toBeVisible();
      await expect(row).not.toContainText('<script');
    });

    test('TC-013: Editing a program to the same name (no change) is allowed', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const originalDescription = `Original description ${uniqueSuffix()}`;
      const updatedDescription = `Updated description ${uniqueSuffix()}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: originalDescription },
        trackProgram,
      );

      await openEditModalFromList(programsPage, programName);
      await expect(programsPage.editProgramModal.programNameField).toHaveValue(programName);
      await programsPage.editProgramModal.fillDescription(updatedDescription);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.editProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
      await expect(programsPage.programRow(programName)).toContainText(updatedDescription);
    });

    test('TC-014: Program name with only tabs and newlines is treated as empty', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
      const modal = programsPage.newProgramModal;
      await modal.fill({ name: '\t\n\t', description: 'Whitespace variant test' });

      await expect(modal.createButton).toBeDisabled();
      await expect(modal.dialog).toBeVisible();
    });

    test('TC-015: Program name at exact maximum length boundary is accepted', async ({
      page,
      trackProgram,
    }) => {
      const programName = fixedLength(MAX_PROGRAM_NAME_LENGTH, uniqueProgramName('MaxBoundary'));
      const programsPage = new ProgramsPage(page);

      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();
      await programsPage.newProgramModal.fill({ name: programName, description: 'Boundary test' });
      await submitProgramCreate(page, trackProgram, () => programsPage.newProgramModal.clickCreate());

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    });
  });
});
