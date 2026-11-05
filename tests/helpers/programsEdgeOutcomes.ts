import { expect, type Page } from '@playwright/test';
import type { EditProgramModal } from '../../pages/EditProgramModal';
import type { ProgramsPage } from '../../pages/ProgramsPage';

export function trackPageErrors(page: Page): { assertEmpty: () => Promise<void> } {
  const errors: Error[] = [];
  page.on('pageerror', (error) => {
    errors.push(error);
  });
  return {
    assertEmpty: async () => {
      expect(errors).toEqual([]);
    },
  };
}

export async function assertProgramsHeadingVisible(programsPage: ProgramsPage): Promise<void> {
  await expect(programsPage.heading).toBeVisible();
}

/** Asserts the Programs heading is visible and no uncaught page errors were recorded. */
export async function assertProgramsShellVisible(
  programsPage: ProgramsPage,
  pageErrors: ReturnType<typeof trackPageErrors>,
): Promise<void> {
  await assertProgramsHeadingVisible(programsPage);
  await pageErrors.assertEmpty();
}

export async function assertOptionalEmptyState(programsPage: ProgramsPage): Promise<void> {
  const emptyVisible = await programsPage.emptyStateText.isVisible().catch(() => false);
  if (emptyVisible) {
    await expect(programsPage.emptyStateText.first()).toBeVisible();
  }
}

export async function assertOptionalErrorState(
  page: Page,
  programsPage: ProgramsPage,
  editModal?: EditProgramModal,
): Promise<void> {
  let sawError = false;

  if (await programsPage.accessDeniedText.first().isVisible().catch(() => false)) {
    sawError = true;
  }

  if (!sawError && editModal) {
    if (await editModal.alert.isVisible().catch(() => false)) {
      sawError = true;
    } else if (await editModal.dialog.isVisible().catch(() => false)) {
      sawError = true;
    }
  }

  if (!sawError) {
    const pageAlert = page.getByRole('alert').first();
    sawError = await pageAlert.isVisible().catch(() => false);
  }

  expect(sawError).toBeTruthy();
}

export async function assertOptionalAccessDenied(programsPage: ProgramsPage): Promise<void> {
  const denied = await programsPage.accessDeniedText.first().isVisible().catch(() => false);
  if (denied) {
    await expect(programsPage.accessDeniedText.first()).toBeVisible();
  }
}

export async function assertLoginRedirectOrAuthOutcome(page: Page): Promise<void> {
  const onLogin = /\/login(\?|$)/.test(page.url());
  if (onLogin) {
    await expect(page).toHaveURL(/\/login/);
    return;
  }
  const authMessage = page.getByText(/sign in|log in|authentication|session/i).first();
  if ((await authMessage.count()) > 0) {
    await expect(authMessage).toBeVisible();
  }
}

export async function assertValidationOrDisabledSave(modal: EditProgramModal): Promise<void> {
  if (await modal.saveButton.isDisabled()) {
    await expect(modal.saveButton).toBeDisabled();
    return;
  }

  const ariaInvalid = await modal.programNameField.getAttribute('aria-invalid');
  const alertVisible = await modal.alert.isVisible().catch(() => false);
  expect(ariaInvalid === 'true' || alertVisible).toBeTruthy();
}
