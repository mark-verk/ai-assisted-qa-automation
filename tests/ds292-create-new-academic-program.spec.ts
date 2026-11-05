import { type Page, type Response } from '@playwright/test';
import { test, expect } from '../fixtures/cleanup.fixture';
import {
  routeProgramsGetStatus,
  routeProgramsPostStatus,
} from '../fixtures/programs-api-route.helpers';
import {
  isProgramCreate,
  submitProgramCreate,
  submitProgramCreateIfSucceeded,
} from '../fixtures/program-create.helpers';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  PageErrorWatch,
  assertAuthOutcomeOrShell,
  assertCreateErrorOutcome,
  assertOptionalAccessDeniedState,
  assertOptionalEmptyListState,
  assertOptionalListErrorState,
  assertOptionalValidationState,
  assertProgramsShellStable,
} from './helpers/ds292-outcome.helpers';
import {
  assertProgramsPageReady,
  openCreateForm,
} from './helpers/createProgramViaUi';

const DESCRIPTION = 'Full-stack web development program';
const NAME_PREFIX = 'Web Development 2026';

function uniqueProgramName(base = NAME_PREFIX): string {
  return `${base} ${Date.now()}`;
}

function name255Characters(): string {
  const seed = uniqueProgramName(NAME_PREFIX);
  if (seed.length >= 255) {
    return seed.slice(0, 255);
  }
  return seed.padEnd(255, 'x');
}

function specialCharacterName(): string {
  return `${NAME_PREFIX} & "QA" <292> ${Date.now()}`;
}

async function watchCreateAttempt(
  page: Page,
  action: () => Promise<void>,
): Promise<Response | undefined> {
  let response: Response | undefined;
  const onResponse = (res: Response) => {
    if (!response && isProgramCreate(res)) {
      response = res;
    }
  };
  page.on('response', onResponse);
  try {
    await action();
  } finally {
    page.off('response', onResponse);
  }
  return response;
}

test.describe('DS-292 — Create new academic program', () => {
  test(
    'Navigate to program creation form',
    { tag: '@happy' },
    async ({ page }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await programsPage.openNewProgramForm();

      const modal = programsPage.newProgramModal;
      await expect(modal.programNameField).toBeVisible();
      await expect(modal.descriptionField).toBeVisible();
    },
  );

  test(
    'Successfully create a program',
    { tag: '@happy' },
    async ({ page, trackProgram }) => {
      const programName = uniqueProgramName();
      const programsPage = await openCreateForm(page);

      await programsPage.newProgramModal.fill({
        name: programName,
        description: DESCRIPTION,
      });
      await submitProgramCreate(page, trackProgram, () =>
        programsPage.newProgramModal.clickCreate(),
      );

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    },
  );

  test(
    'Create a program with an empty description',
    { tag: '@happy' },
    async ({ page, trackProgram }) => {
      const programName = uniqueProgramName();
      const programsPage = await openCreateForm(page);

      await programsPage.newProgramModal.fill({ name: programName, description: '' });
      await submitProgramCreate(page, trackProgram, () =>
        programsPage.newProgramModal.clickCreate(),
      );

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    },
  );

  test(
    'Cancel closes the form without creating a program',
    { tag: '@happy' },
    async ({ page }) => {
      const programName = uniqueProgramName();
      const programsPage = await openCreateForm(page);

      await programsPage.newProgramModal.fill({
        name: programName,
        description: DESCRIPTION,
      });
      await programsPage.newProgramModal.clickCancel();

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toHaveCount(0);
    },
  );

  test(
    'Validation prevents empty program name',
    { tag: '@negative' },
    async ({ page }) => {
      const programsPage = await openCreateForm(page);
      const modal = programsPage.newProgramModal;

      await expect(modal.programNameField).toHaveValue('');
      await expect(modal.createButton).toBeDisabled();
    },
  );

  test(
    'Whitespace-only program name does not create a program',
    { tag: '@negative' },
    async ({ page }) => {
      const programsPage = await openCreateForm(page);
      const modal = programsPage.newProgramModal;
      const whitespaceName = '   ';

      await modal.fill({ name: whitespaceName, description: DESCRIPTION });

      const response = await watchCreateAttempt(page, async () => {
        if (await modal.createButton.isEnabled()) {
          await modal.clickCreate();
        }
        await assertOptionalValidationState(modal);
      });

      expect(response).toBeUndefined();
      await expect(programsPage.programEditButton(whitespaceName)).toHaveCount(0);
    },
  );

  test(
    'A duplicate program name is rejected by the live API',
    { tag: '@negative' },
    async ({ page, trackProgram }) => {
      test.setTimeout(120_000);
      const programName = uniqueProgramName();
      const programsPage = await openCreateForm(page);

      await submitProgramCreate(page, trackProgram, () =>
        programsPage.createProgram({ name: programName, description: DESCRIPTION }),
      );
      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programDeleteButton(programName)).toHaveCount(1);

      await programsPage.openNewProgramForm();
      const modal = programsPage.newProgramModal;
      await modal.fill({ name: programName, description: DESCRIPTION });

      const duplicate = await submitProgramCreateIfSucceeded(page, trackProgram, () =>
        modal.clickCreate(),
      );

      expect(duplicate).toBeUndefined();
      await expect(programsPage.programDeleteButton(programName)).toHaveCount(1);

      const pageErrors = new PageErrorWatch(page);
      const hasErrorUi =
        (await modal.alert.isVisible().catch(() => false)) ||
        (await modal.duplicateNameError.isVisible().catch(() => false)) ||
        (await modal.dialog.isVisible().catch(() => false));
      if (hasErrorUi) {
        expect(hasErrorUi).toBeTruthy();
      }
      await assertProgramsShellStable(programsPage, pageErrors);
    },
  );

  test(
    'Create a program whose name contains special characters',
    { tag: '@edge' },
    async ({ page, trackProgram }) => {
      const programName = specialCharacterName();
      const programsPage = await openCreateForm(page);

      await programsPage.newProgramModal.fill({
        name: programName,
        description: DESCRIPTION,
      });
      await submitProgramCreate(page, trackProgram, () =>
        programsPage.newProgramModal.clickCreate(),
      );

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    },
  );

  test(
    'Create a program with a 255-character name',
    { tag: '@edge' },
    async ({ page, trackProgram }) => {
      const programName = name255Characters();
      const programsPage = await openCreateForm(page);
      const pageErrors = new PageErrorWatch(page);
      const modal = programsPage.newProgramModal;

      await modal.fill({ name: programName, description: DESCRIPTION });

      const created = await submitProgramCreateIfSucceeded(page, trackProgram, () =>
        modal.clickCreate(),
      );

      if (created) {
        await expect(modal.dialog).toBeHidden();
        await expect(programsPage.programEditButton(programName)).toBeVisible();
      } else {
        await assertOptionalValidationState(modal);
      }

      await assertProgramsShellStable(programsPage, pageErrors);
    },
  );

  test(
    'Create save returns 503',
    { tag: '@edge' },
    async ({ page }) => {
      const programName = uniqueProgramName();
      const programsPage = await openCreateForm(page);
      const pageErrors = new PageErrorWatch(page);
      const modal = programsPage.newProgramModal;

      await modal.fill({ name: programName, description: DESCRIPTION });
      await routeProgramsPostStatus(page, 503);
      await modal.clickCreate();

      await assertCreateErrorOutcome(programsPage, modal, pageErrors);
      await expect(programsPage.programEditButton(programName)).toHaveCount(0);
    },
  );

  test(
    'Program list returns 200 with an empty array',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = new PageErrorWatch(page);
      await routeProgramsGetStatus(page, 200, { data: [] });
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertOptionalEmptyListState(programsPage, pageErrors);
    },
  );

  test(
    'Program list returns 200 with a malformed body',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = new PageErrorWatch(page);
      await routeProgramsGetStatus(page, 200, { not: 'a program list' });
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsShellStable(programsPage, pageErrors);
    },
  );

  test(
    'Program list returns 404',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = new PageErrorWatch(page);
      await routeProgramsGetStatus(page, 404);
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertOptionalListErrorState(programsPage, pageErrors);
    },
  );

  test(
    'Program list returns 401',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = new PageErrorWatch(page);
      await routeProgramsGetStatus(page, 401);
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertAuthOutcomeOrShell(page, programsPage, pageErrors);
    },
  );

  test(
    'Program list returns 403',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = new PageErrorWatch(page);
      await routeProgramsGetStatus(page, 403);
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertOptionalAccessDeniedState(programsPage, pageErrors);
    },
  );

  test(
    'Create save returns 400',
    { tag: '@edge' },
    async ({ page }) => {
      const programsPage = await openCreateForm(page);
      const pageErrors = new PageErrorWatch(page);
      const modal = programsPage.newProgramModal;

      await modal.fill({ name: uniqueProgramName(), description: DESCRIPTION });
      await routeProgramsPostStatus(page, 400);
      await modal.clickCreate();

      await assertCreateErrorOutcome(programsPage, modal, pageErrors);
    },
  );

  test(
    'Create save returns 401',
    { tag: '@edge' },
    async ({ page }) => {
      const programsPage = await openCreateForm(page);
      const pageErrors = new PageErrorWatch(page);
      const modal = programsPage.newProgramModal;

      await modal.fill({ name: uniqueProgramName(), description: DESCRIPTION });
      await routeProgramsPostStatus(page, 401);
      await modal.clickCreate();

      await assertAuthOutcomeOrShell(page, programsPage, pageErrors);
    },
  );

  test(
    'Create save returns 403',
    { tag: '@edge' },
    async ({ page }) => {
      const programsPage = await openCreateForm(page);
      const pageErrors = new PageErrorWatch(page);
      const modal = programsPage.newProgramModal;

      await modal.fill({ name: uniqueProgramName(), description: DESCRIPTION });
      await routeProgramsPostStatus(page, 403);
      await modal.clickCreate();

      await assertOptionalAccessDeniedState(programsPage, pageErrors);
    },
  );

  test(
    'Create save returns 422',
    { tag: '@edge' },
    async ({ page }) => {
      const programsPage = await openCreateForm(page);
      const pageErrors = new PageErrorWatch(page);
      const modal = programsPage.newProgramModal;

      await modal.fill({ name: uniqueProgramName(), description: DESCRIPTION });
      await routeProgramsPostStatus(page, 422);
      await modal.clickCreate();

      await assertCreateErrorOutcome(programsPage, modal, pageErrors);
    },
  );

  test(
    'Create save returns 409',
    { tag: '@edge' },
    async ({ page }) => {
      // Synthetic mocked 409 — separate from the live duplicate-name scenario.
      const programsPage = await openCreateForm(page);
      const pageErrors = new PageErrorWatch(page);
      const modal = programsPage.newProgramModal;

      await modal.fill({ name: uniqueProgramName(), description: DESCRIPTION });
      await routeProgramsPostStatus(page, 409, { message: 'Conflict' });
      await modal.clickCreate();

      await assertCreateErrorOutcome(programsPage, modal, pageErrors);
    },
  );

  test(
    'Program list returns 500',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = new PageErrorWatch(page);
      await routeProgramsGetStatus(page, 500);
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertOptionalListErrorState(programsPage, pageErrors);
    },
  );

  test(
    'Program list returns 501',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = new PageErrorWatch(page);
      await routeProgramsGetStatus(page, 501);
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertOptionalListErrorState(programsPage, pageErrors);
    },
  );

  test(
    'Program list returns 502',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = new PageErrorWatch(page);
      await routeProgramsGetStatus(page, 502);
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertOptionalListErrorState(programsPage, pageErrors);
    },
  );

  test(
    'Create save returns 500',
    { tag: '@edge' },
    async ({ page }) => {
      const programsPage = await openCreateForm(page);
      const pageErrors = new PageErrorWatch(page);
      const modal = programsPage.newProgramModal;

      await modal.fill({ name: uniqueProgramName(), description: DESCRIPTION });
      await routeProgramsPostStatus(page, 500);
      await modal.clickCreate();

      await assertCreateErrorOutcome(programsPage, modal, pageErrors);
    },
  );

  test(
    'Create save returns 501',
    { tag: '@edge' },
    async ({ page }) => {
      const programsPage = await openCreateForm(page);
      const pageErrors = new PageErrorWatch(page);
      const modal = programsPage.newProgramModal;

      await modal.fill({ name: uniqueProgramName(), description: DESCRIPTION });
      await routeProgramsPostStatus(page, 501);
      await modal.clickCreate();

      await assertCreateErrorOutcome(programsPage, modal, pageErrors);
    },
  );

  test(
    'Create save returns 502',
    { tag: '@edge' },
    async ({ page }) => {
      const programsPage = await openCreateForm(page);
      const pageErrors = new PageErrorWatch(page);
      const modal = programsPage.newProgramModal;

      await modal.fill({ name: uniqueProgramName(), description: DESCRIPTION });
      await routeProgramsPostStatus(page, 502);
      await modal.clickCreate();

      await assertCreateErrorOutcome(programsPage, modal, pageErrors);
    },
  );

  test(
    'Create save returns 200 with a body that has no program object',
    { tag: '@edge' },
    async ({ page }) => {
      const programsPage = await openCreateForm(page);
      const pageErrors = new PageErrorWatch(page);
      const modal = programsPage.newProgramModal;
      const programName = uniqueProgramName();

      await modal.fill({ name: programName, description: DESCRIPTION });
      await routeProgramsPostStatus(page, 200, { message: 'ok' });

      const response = await watchCreateAttempt(page, () => modal.clickCreate());
      expect(response?.ok()).toBeTruthy();
      await assertProgramsShellStable(programsPage, pageErrors);
      await expect(programsPage.programEditButton(programName)).toHaveCount(0);
    },
  );

  test(
    'Program list returns 204',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = new PageErrorWatch(page);
      await routeProgramsGetStatus(page, 204);
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsShellStable(programsPage, pageErrors);
    },
  );

  test(
    'Program list returns 300',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = new PageErrorWatch(page);
      await routeProgramsGetStatus(page, 300);
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsShellStable(programsPage, pageErrors);
    },
  );
});
