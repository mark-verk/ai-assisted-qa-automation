import { test, expect } from '../fixtures/cleanup.fixture';
import {
  submitProgramCreate,
  submitProgramCreateIfSucceeded,
  type CreatedProgram,
} from '../fixtures/program-create.helpers';
import { ProgramsPage } from '../pages/ProgramsPage';
import { assertProgramsPageReady } from './helpers/createProgramViaUi';

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

test.describe('DS-300 — Create Program rejects a duplicate Program Name', () => {
  test(
    'Reject duplicate Program Name on create',
    { tag: '@regression' },
    async ({ page, trackProgram }) => {
      test.setTimeout(120_000);
      const programName = uniqueProgramName('Web Development 2026');
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();

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
    },
  );
});
