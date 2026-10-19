import { expect, type Page } from '@playwright/test';
import { submitProgramCreate } from '../../fixtures/program-create.helpers';
import { ProgramsPage } from '../../pages/ProgramsPage';

export async function assertProgramsPageReady(programsPage: ProgramsPage): Promise<void> {
  await expect(programsPage.heading).toBeVisible();
  await expect(programsPage.newProgramButton).toBeVisible();
}

export async function createProgramViaUi(
  page: Page,
  options: { name: string; description?: string },
  trackProgram: (uuid: string) => void,
  programsPage = new ProgramsPage(page),
): Promise<ProgramsPage> {
  await programsPage.goto();
  await assertProgramsPageReady(programsPage);
  await programsPage.openNewProgramForm();
  await submitProgramCreate(page, trackProgram, () => programsPage.createProgram(options));
  await expect(programsPage.newProgramModal.dialog).toBeHidden();
  await expect(programsPage.programEditButton(options.name)).toBeVisible();
  return programsPage;
}

export async function createProgramOnCurrentPage(
  page: Page,
  options: { name: string; description?: string },
  trackProgram: (uuid: string) => void,
  programsPage = new ProgramsPage(page),
): Promise<ProgramsPage> {
  await programsPage.openNewProgramForm();
  await submitProgramCreate(page, trackProgram, () => programsPage.createProgram(options));
  await expect(programsPage.newProgramModal.dialog).toBeHidden();
  return programsPage;
}
