import type { Page } from '@playwright/test';
import type { ProgramsPage } from '../pages/ProgramsPage';

export async function clickDeleteAndHandleDialog(
  page: Page,
  programsPage: ProgramsPage,
  programName: string,
  action: 'accept' | 'dismiss',
): Promise<void> {
  page.once('dialog', async (dialog) => {
    if (action === 'accept') {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
  await programsPage.clickProgramDelete(programName);
}

export async function confirmDeletionOfProgram(
  page: Page,
  programsPage: ProgramsPage,
  programName: string,
): Promise<void> {
  await clickDeleteAndHandleDialog(page, programsPage, programName, 'accept');
}

export async function clickDeleteAwaitingDialog(
  page: Page,
  programsPage: ProgramsPage,
  programName: string,
): Promise<import('@playwright/test').Dialog> {
  const dialogPromise = page.waitForEvent('dialog');
  await programsPage.clickProgramDelete(programName);
  return dialogPromise;
}
