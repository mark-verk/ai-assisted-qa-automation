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

export async function createAndOpenEditProgram(
  page: Page,
  options: { name: string; description?: string },
  trackProgram: (uuid: string) => void,
  programsPage = new ProgramsPage(page),
): Promise<{ programsPage: ProgramsPage; programName: string; description: string }> {
  const description =
    options.description ?? `Full-stack web development program ${Date.now()}`;
  await createProgramViaUi(page, { name: options.name, description }, trackProgram, programsPage);
  await programsPage.openEditProgramForm(options.name);
  return { programsPage, programName: options.name, description };
}

export function uniqueProgramName(base: string): string {
  return `${base} ${Date.now()}`;
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
  await expect(programsPage.programEditButton(options.name)).toBeVisible();
  return programsPage;
}
