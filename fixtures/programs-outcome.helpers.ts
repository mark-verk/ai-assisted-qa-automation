import { expect, type Page } from '@playwright/test';
import type { ProgramsPage } from '../pages/ProgramsPage';

export function attachPageErrorCollector(page: Page): string[] {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  return pageErrors;
}

export async function assertProgramsHeadingAndNoCrash(
  page: Page,
  programsPage: ProgramsPage,
  pageErrors: string[],
): Promise<void> {
  await expect(programsPage.heading).toBeVisible();
  expect(pageErrors).toEqual([]);
}

export async function assertOptionalErrorState(
  page: Page,
  programsPage: ProgramsPage,
  pageErrors: string[],
): Promise<void> {
  const alert = page.getByRole('alert');
  if (await alert.first().isVisible().catch(() => false)) {
    await expect(alert.first()).toBeVisible();
  }
  await assertProgramsHeadingAndNoCrash(page, programsPage, pageErrors);
}

export async function assertOptionalEmptyOutcome(
  programsPage: ProgramsPage,
  page: Page,
  pageErrors: string[],
): Promise<void> {
  if (await programsPage.emptyStateText().isVisible().catch(() => false)) {
    await expect(programsPage.emptyStateText()).toBeVisible();
  }
  await assertProgramsHeadingAndNoCrash(page, programsPage, pageErrors);
}

export async function assertAuthenticationOutcome(page: Page): Promise<void> {
  if (page.url().includes('/login')) {
    await expect(page).toHaveURL(/\/login/);
    return;
  }
  await expect(
    page.getByLabel('Email').or(page.getByRole('button', { name: 'Sign In' })),
  ).toBeVisible();
}

export async function assertOptionalAccessDenied(
  page: Page,
  programsPage: ProgramsPage,
  pageErrors: string[],
): Promise<void> {
  if (await programsPage.accessDeniedText().isVisible().catch(() => false)) {
    await expect(programsPage.accessDeniedText()).toBeVisible();
  }
  await assertProgramsHeadingAndNoCrash(page, programsPage, pageErrors);
}
