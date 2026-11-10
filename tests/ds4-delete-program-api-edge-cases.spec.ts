import { test, expect } from '../fixtures/cleanup.fixture';
import type { Page } from '@playwright/test';
import { ProgramsPage } from '../pages/ProgramsPage';
import { createProgramViaUi } from './helpers/createProgramViaUi';

const DELETE_FAILURE_STATUSES = [404, 500, 501, 502, 503] as const;

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueProgramName(base: string): string {
  return `${base} ${uniqueSuffix()}`;
}

function collectPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  return errors;
}

async function routeDeleteFailure(page: Page, status: number): Promise<void> {
  await page.route('**/api/programs/*', async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Simulated DELETE failure ${status}` }),
    });
  });
}

async function confirmAndDeleteProgram(
  page: Page,
  programsPage: ProgramsPage,
  programName: string,
): Promise<void> {
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain(programName);
    await dialog.accept();
  });
  await programsPage.programDeleteButton(programName).click();
}

test.describe('DS-4 — Delete program API edge cases', () => {
  for (const status of DELETE_FAILURE_STATUSES) {
    test(
      `DELETE /api/programs/:id returns ${status} — program remains listed with no pageerror`,
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const programName = uniqueProgramName('Delete API Edge Program');
        const description = `Program for DELETE ${status} edge case ${uniqueSuffix()}`;
        const pageErrors = collectPageErrors(page);

        const programsPage = await createProgramViaUi(
          page,
          { name: programName, description },
          trackProgram,
        );

        await routeDeleteFailure(page, status);
        await confirmAndDeleteProgram(page, programsPage, programName);

        await expect(programsPage.heading).toBeVisible();
        await expect(programsPage.programDeleteButton(programName)).toBeVisible();
        await expect(programsPage.programEditButton(programName)).toBeVisible();
        await expect(programsPage.programRow(programName)).toContainText(programName);

        expect(pageErrors).toEqual([]);
      },
    );
  }
});
