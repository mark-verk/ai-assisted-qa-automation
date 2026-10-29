import AxeBuilder from '@axe-core/playwright';
import { type Page, type Response } from '@playwright/test';
import { test, expect } from '../fixtures/cleanup.fixture';
import {
  isProgramCreate,
  submitProgramCreate,
  submitProgramCreateIfSucceeded,
  trackCreatedProgram,
  type CreatedProgram,
} from '../fixtures/program-create.helpers';
import { ProgramsPage } from '../pages/ProgramsPage';
import { assertProgramsPageReady } from './helpers/createProgramViaUi';

const axeTags = ['wcag2a', 'wcag2aa'] as const;

function uniqueSuffix(): string {
  return `${Date.now()}-${test.info().workerIndex}`;
}

function uniqueProgramName(base: string): string {
  return `${base} ${uniqueSuffix()}`;
}

function expectSuccessfulCreate(created: CreatedProgram, name: string): void {
  expect(created.status).toBe(201);
  expect(created.message).toBe('Program created');
  expect(created.name).toBe(name);
}

async function openCreateForm(page: Page): Promise<ProgramsPage> {
  const programsPage = new ProgramsPage(page);
  await programsPage.goto();
  await assertProgramsPageReady(programsPage);
  await programsPage.openNewProgramForm();
  return programsPage;
}

async function expectExactListedName(programsPage: ProgramsPage, name: string): Promise<void> {
  const suffix = name.slice(name.lastIndexOf(' ') + 1);
  // textContent keeps internal double spaces. Accessible names and toHaveText collapse them.
  await expect.poll(async () => programsPage.programTitle(suffix).textContent()).toBe(name);
}

async function watchProgramCreate(
  page: Page,
  trackProgram: (uuid: string) => void,
  action: () => Promise<void>,
): Promise<{ created?: CreatedProgram; sawCreateResponse: boolean }> {
  let response: Response | undefined;
  const onResponse = (res: Response) => {
    if (!response && isProgramCreate(res)) {
      response = res;
    }
  };
  page.on('response', onResponse);
  let created: CreatedProgram | undefined;
  try {
    await action();
  } finally {
    page.off('response', onResponse);
    if (response?.ok()) {
      created = await trackCreatedProgram(response, trackProgram);
    }
  }
  return { created, sawCreateResponse: Boolean(response) };
}

test.describe('DS-3 — Program name validation and duplicate prevention', () => {
  test.describe('Happy paths', () => {
    test('Accept program name with special characters', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Informatique & IA - Niveau 2');
      const description = 'Programme bilingue avec caractères spéciaux';
      const programsPage = await openCreateForm(page);

      const created = await submitProgramCreate(page, trackProgram, () =>
        programsPage.createProgram({ name: programName, description }),
      );

      expectSuccessfulCreate(created, programName);
      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programDeleteButton(programName)).toBeVisible();
      await expectExactListedName(programsPage, programName);
      await expect(programsPage.programRow(programName)).toContainText(description);
    });

    test('Trim leading and trailing spaces from a unique program name', async ({
      page,
      trackProgram,
    }) => {
      const trimmedName = uniqueProgramName('Mobile App Development');
      const paddedName = `  ${trimmedName}  `;
      const description = 'iOS and Android development track';
      const programsPage = await openCreateForm(page);

      await programsPage.newProgramModal.fill({ name: paddedName, description });
      const created = await submitProgramCreate(page, trackProgram, () =>
        programsPage.newProgramModal.clickCreate(),
      );

      expectSuccessfulCreate(created, trimmedName);
      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programDeleteButton(trimmedName)).toBeVisible();
      await expectExactListedName(programsPage, trimmedName);
      await expect(programsPage.programRow(trimmedName)).toContainText(description);
    });

    test('Create a program when Description is left empty', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Data Science Fundamentals');
      const programsPage = await openCreateForm(page);

      const created = await submitProgramCreate(page, trackProgram, () =>
        programsPage.createProgram({ name: programName, description: '' }),
      );

      expectSuccessfulCreate(created, programName);
      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programDeleteButton(programName)).toBeVisible();
      await expectExactListedName(programsPage, programName);
    });
  });

  test.describe('Negative', () => {
    test('Reject program name with only whitespace', async ({ page, trackProgram }) => {
      const programsPage = await openCreateForm(page);
      const modal = programsPage.newProgramModal;

      const watched = await watchProgramCreate(page, trackProgram, async () => {
        await modal.fill({ name: '   ' });
        await expect(modal.programNameField).toHaveValue('   ');
        await expect(modal.createButton).toBeDisabled();
        await expect(modal.dialog).toBeVisible();
        await expect(modal.alert).toHaveCount(0);
      });

      expect(watched.sawCreateResponse).toBe(false);
      expect(watched.created).toBeUndefined();
    });

    test('Reject empty program name', async ({ page, trackProgram }) => {
      const programsPage = await openCreateForm(page);
      const modal = programsPage.newProgramModal;

      const watched = await watchProgramCreate(page, trackProgram, async () => {
        await expect(modal.programNameField).toHaveValue('');
        await expect(modal.createButton).toBeDisabled();
        await expect(modal.dialog).toBeVisible();
      });

      expect(watched.sawCreateResponse).toBe(false);
      expect(watched.created).toBeUndefined();
    });

    test('Reject duplicate program name', async ({ page, trackProgram }) => {
      test.setTimeout(120_000);
      const programName = uniqueProgramName('Web Development 2026');
      const programsPage = await openCreateForm(page);

      const created = await submitProgramCreate(page, trackProgram, () =>
        programsPage.createProgram({
          name: programName,
          description: 'Full-stack web development program',
        }),
      );
      expectSuccessfulCreate(created, programName);
      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programDeleteButton(programName)).toHaveCount(1);

      await programsPage.openNewProgramForm();
      const modal = programsPage.newProgramModal;
      await modal.fill({
        name: programName,
        description: 'Another full-stack cohort',
      });
      await expect(modal.createButton).toBeEnabled();
      const duplicate = await submitProgramCreateIfSucceeded(page, trackProgram, () =>
        modal.clickCreate(),
      );

      await expect(modal.duplicateNameError).toBeVisible();
      await expect(modal.dialog).toBeVisible();
      await expect(programsPage.programDeleteButton(programName)).toHaveCount(1);
      expect(duplicate).toBeUndefined();

      await modal.programNameField.click();
      await expect(modal.programNameField).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(modal.descriptionField).toBeFocused();
      await expect(modal.dialog).toBeVisible();
      await expect(modal.duplicateNameError).toBeVisible();

      const modalInclude = await modal.axeScanInclude();
      const results = await new AxeBuilder({ page })
        .withTags([...axeTags])
        .include(modalInclude)
        .analyze();
      await expect(results.violations).toEqual([]);
    });

    test('Reject a duplicate that differs only by surrounding whitespace', async ({
      page,
      trackProgram,
    }) => {
      test.setTimeout(120_000);
      const programName = uniqueProgramName('Web Development 2026');
      const programsPage = await openCreateForm(page);

      const created = await submitProgramCreate(page, trackProgram, () =>
        programsPage.createProgram({
          name: programName,
          description: 'Full-stack web development program',
        }),
      );
      expectSuccessfulCreate(created, programName);
      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programDeleteButton(programName)).toHaveCount(1);

      await programsPage.openNewProgramForm();
      const modal = programsPage.newProgramModal;
      await modal.fill({
        name: `  ${programName}  `,
        description: 'Padded duplicate attempt',
      });
      await expect(modal.createButton).toBeEnabled();
      const duplicate = await submitProgramCreateIfSucceeded(page, trackProgram, () =>
        modal.clickCreate(),
      );

      await expect(modal.duplicateNameError).toBeVisible();
      await expect(modal.dialog).toBeVisible();
      await expect(programsPage.programDeleteButton(programName)).toHaveCount(1);
      expect(duplicate).toBeUndefined();
    });
  });

  test.describe('Edge cases', () => {
    test('Accept a single-character program name', async ({ page, trackProgram }) => {
      const programName = 'A';
      const description = 'Single character name';
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);

      const exactRows = programsPage
        .programRowByExactName(programName)
        .filter({ hasText: description });
      const rowsBefore = await exactRows.count();

      await programsPage.openNewProgramForm();
      const created = await submitProgramCreate(page, trackProgram, () =>
        programsPage.createProgram({ name: programName, description }),
      );

      expectSuccessfulCreate(created, programName);
      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(exactRows).toHaveCount(rowsBefore + 1);
    });

    test('Cancel does not create a program', async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Temporary Draft Program');
      const programsPage = await openCreateForm(page);
      const modal = programsPage.newProgramModal;
      await modal.fill({
        name: programName,
        description: 'Should not be saved',
      });

      const watched = await watchProgramCreate(page, trackProgram, async () => {
        await modal.clickCancel();
        await expect(modal.dialog).toBeHidden();
        await expect(programsPage.programDeleteButton(programName)).toHaveCount(0);
      });

      expect(watched.sawCreateResponse).toBe(false);
      expect(watched.created).toBeUndefined();
    });

    test('Internal double spaces are preserved as part of the name', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web  Development  2026');
      const description = 'Internal spacing check';
      const programsPage = await openCreateForm(page);

      const created = await submitProgramCreate(page, trackProgram, () =>
        programsPage.createProgram({ name: programName, description }),
      );

      expectSuccessfulCreate(created, programName);
      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expectExactListedName(programsPage, programName);
      const suffix = programName.slice(programName.lastIndexOf(' ') + 1);
      await expect(programsPage.programRow(suffix)).toContainText(description);
    });
  });
});
