import { test, expect } from '../fixtures/cleanup.fixture';
import { createProgramViaUi } from './helpers/createProgramViaUi';

const MAX_PROGRAM_NAME_LENGTH = 255;

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

test.describe('DS-299 — Edit Program over-limit name must not drop the original row', () => {
  test(
    'Over-limit Program Name on edit is rejected and original row remains',
    { tag: '@regression' },
    async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const overLimitName = fixedLength(
        MAX_PROGRAM_NAME_LENGTH + 1,
        uniqueProgramName('OverMax256Edit'),
      );
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `Description ${uniqueSuffix()}` },
        trackProgram,
      );

      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillProgramName(overLimitName);
      await expect(programsPage.editProgramModal.programNameField).toHaveValue(overLimitName);
      await programsPage.editProgramModal.clickSave();

      await expect(programsPage.programEditButton(programName)).toBeVisible();
      await expect(programsPage.programEditButton(overLimitName)).toHaveCount(0);
      await expect(programsPage.programRow(programName)).toBeVisible();

      await programsPage.dismissEditModalIfOpen();
      await programsPage.openEditProgramForm(programName);
      await expect(programsPage.editProgramModal.programNameField).toHaveValue(programName);
    },
  );
});
