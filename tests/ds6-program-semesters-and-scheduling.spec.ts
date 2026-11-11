import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import { createProgramViaUi } from './helpers/createProgramViaUi';

function uniqueSuffix(): string {
  return String(Date.now());
}

function uniqueProgramName(base: string): string {
  return `${base} ${uniqueSuffix()}`;
}

function uniqueSemesterName(base: string): string {
  return `${base} ${uniqueSuffix()}`;
}

test.describe('DS-6 — Program semesters and scheduling', () => {
  test('TC-001: Selecting a program opens the detail panel with an empty semesters state', async ({
    page,
    trackProgram,
  }) => {
    const programName = uniqueProgramName('Semester Panel Program');
    const programsPage = await createProgramViaUi(
      page,
      { name: programName, description: `Program for semester panel ${uniqueSuffix()}` },
      trackProgram,
    );

    await expect(programsPage.selectProgramPrompt).toBeVisible();
    await programsPage.selectProgram(programName);

    await expect(programsPage.programDetailHeading(programName)).toBeVisible();
    await expect(programsPage.semestersSchedulingHeading).toBeVisible();
    await expect(programsPage.newSemesterButton).toBeVisible();
    await expect(programsPage.noSemestersYetText).toBeVisible();
  });

  test('TC-002: Creating a semester adds it to the panel and removes the empty state', async ({
    page,
    trackProgram,
  }) => {
    const programName = uniqueProgramName('Semester Create Program');
    const semesterName = uniqueSemesterName('Fall 2026');
    const programsPage = await createProgramViaUi(
      page,
      { name: programName, description: `Program for semester create ${uniqueSuffix()}` },
      trackProgram,
    );

    await programsPage.selectProgram(programName);
    await programsPage.openNewSemesterForm();
    await programsPage.createSemester({
      name: semesterName,
      startDate: '2026-09-01',
      endDate: '2026-12-15',
    });

    await expect(programsPage.newSemesterModal.dialog).toBeHidden();
    await expect(programsPage.semesterEntry(semesterName)).toBeVisible();
    await expect(programsPage.noSemestersYetText).toHaveCount(0);
  });

  test(
    'TC-003: Create Semester stays disabled until required fields are filled; Cancel keeps empty state',
    { tag: '@regression' },
    async ({ page, trackProgram }) => {
      const programName = uniqueProgramName('Semester Edge Program');
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: `Program for semester edge ${uniqueSuffix()}` },
        trackProgram,
      );

      await programsPage.selectProgram(programName);
      await programsPage.openNewSemesterForm();

      const modal = programsPage.newSemesterModal;
      await expect(modal.createButton).toBeDisabled();

      await modal.clickCancel();
      await expect(modal.dialog).toBeHidden();
      await expect(programsPage.noSemestersYetText).toBeVisible();
    },
  );
});
