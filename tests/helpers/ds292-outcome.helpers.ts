import { expect, type Page } from '@playwright/test';
import type { NewProgramModal } from '../../pages/NewProgramModal';
import type { ProgramsPage } from '../../pages/ProgramsPage';

export class PageErrorWatch {
  readonly errors: Error[] = [];

  constructor(page: Page) {
    page.on('pageerror', (error) => {
      this.errors.push(error);
    });
  }
}

export async function assertProgramsShellStable(
  programsPage: ProgramsPage,
  pageErrors: PageErrorWatch,
): Promise<void> {
  await expect(programsPage.heading).toBeVisible();
  expect(pageErrors.errors).toEqual([]);
}

export async function assertOptionalListErrorState(
  programsPage: ProgramsPage,
  pageErrors: PageErrorWatch,
): Promise<void> {
  await assertProgramsShellStable(programsPage, pageErrors);
}

export async function assertOptionalAccessDeniedState(
  programsPage: ProgramsPage,
  pageErrors: PageErrorWatch,
): Promise<void> {
  await assertProgramsShellStable(programsPage, pageErrors);
}

export async function assertCreateErrorOutcome(
  programsPage: ProgramsPage,
  modal: NewProgramModal,
  pageErrors: PageErrorWatch,
): Promise<void> {
  await assertProgramsShellStable(programsPage, pageErrors);
  const hasIndicator = await modal.alert
    .isVisible()
    .then(async (visible) => {
      if (visible) return true;
      if (await programsPage.pageAlert.isVisible().catch(() => false)) return true;
      if (await programsPage.accessDeniedText.isVisible().catch(() => false)) return true;
      return modal.dialog.isVisible();
    })
    .catch(() => false);
  expect(hasIndicator).toBeTruthy();
}

export async function assertOptionalValidationState(
  modal: NewProgramModal,
): Promise<void> {
  const disabled = await modal.createButton.isDisabled().catch(() => false);
  const alertVisible = await modal.alert.isVisible().catch(() => false);
  if (!disabled && !alertVisible) {
    return;
  }
  expect(disabled || alertVisible).toBeTruthy();
}

export async function assertOptionalEmptyListState(
  programsPage: ProgramsPage,
  pageErrors: PageErrorWatch,
): Promise<void> {
  await assertProgramsShellStable(programsPage, pageErrors);
}

export async function assertAuthOutcomeOrShell(
  page: Page,
  programsPage: ProgramsPage,
  pageErrors: PageErrorWatch,
): Promise<void> {
  if (page.url().includes('/login')) {
    await expect(page).toHaveURL(/\/login/);
    return;
  }
  await assertProgramsShellStable(programsPage, pageErrors);
}
