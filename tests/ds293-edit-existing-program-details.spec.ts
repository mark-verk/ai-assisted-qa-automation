import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  assertLoginRedirectOrAuthOutcome,
  assertOptionalAccessDenied,
  assertOptionalEmptyState,
  assertOptionalErrorState,
  assertProgramsShellVisible,
  assertValidationOrDisabledSave,
  trackPageErrors,
} from './helpers/programsEdgeOutcomes';
import {
  fulfillProgramUpdate,
  fulfillProgramsList,
} from './helpers/programsApiRoutes';
import {
  createAndOpenEditProgram,
  createProgramOnCurrentPage,
  createProgramViaUi,
  uniqueProgramName,
} from './helpers/createProgramViaUi';

const FULL_STACK_DESCRIPTION = 'Full-stack web development program';
const KEEP_DESCRIPTION = 'Keep this description';

test.describe('DS-293 — Edit existing program details', () => {
  test('Open program for editing', { tag: '@happy' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const description = `${FULL_STACK_DESCRIPTION} ${Date.now()}`;
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description },
      trackProgram,
    );
    const modal = programsPage.editProgramModal;

    await expect(modal.dialog).toBeVisible();
    await expect(modal.programNameField).toHaveValue(programName);
    await expect(modal.descriptionField).toHaveValue(description);
  });

  test('Successfully edit a program name', { tag: '@happy' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const updatedName = uniqueProgramName('Web Development 2026 - Updated');
    const description = `${FULL_STACK_DESCRIPTION} ${Date.now()}`;
    const programsPage = await createProgramViaUi(
      page,
      { name: programName, description },
      trackProgram,
    );

    await programsPage.openEditProgramForm(programName);
    await programsPage.editProgramModal.fillProgramName(updatedName);
    await programsPage.editProgramModal.clickSave();

    await expect(programsPage.editProgramModal.dialog).toBeHidden();
    await expect(programsPage.programEditButton(updatedName)).toBeVisible();
    await expect(programsPage.programEditButton(programName)).toHaveCount(0);
  });

  test('Edit preserves unchanged fields', { tag: '@happy' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const originalDescription = `${FULL_STACK_DESCRIPTION} ${Date.now()}`;
    const updatedDescription = `${FULL_STACK_DESCRIPTION} — revised ${Date.now()}`;
    const programsPage = await createProgramViaUi(
      page,
      { name: programName, description: originalDescription },
      trackProgram,
    );

    await programsPage.openEditProgramForm(programName);
    await programsPage.editProgramModal.fillDescription(updatedDescription);
    await programsPage.editProgramModal.clickSave();

    await expect(programsPage.editProgramModal.dialog).toBeHidden();
    await expect(programsPage.programEditButton(programName)).toBeVisible();
    await expect(programsPage.programRow(programName)).toContainText(updatedDescription);
  });

  test('Cancel edit leaves the program unchanged', { tag: '@happy' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const description = `${FULL_STACK_DESCRIPTION} ${Date.now()}`;
    const draftName = uniqueProgramName('Web Development 2026 - Updated');
    const programsPage = await createProgramViaUi(
      page,
      { name: programName, description },
      trackProgram,
    );

    await programsPage.openEditProgramForm(programName);
    await programsPage.editProgramModal.fillProgramName(draftName);
    await programsPage.editProgramModal.clickCancel();

    await expect(programsPage.editProgramModal.dialog).toBeHidden();
    await expect(programsPage.programEditButton(programName)).toBeVisible();
    await expect(programsPage.programEditButton(draftName)).toHaveCount(0);
  });

  test('Empty program name is not saved', { tag: '@negative' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );
    const modal = programsPage.editProgramModal;

    await modal.clearProgramName();
    await modal.attemptSave();

    await expect(programsPage.programEditButton(programName)).toBeVisible();
    await assertValidationOrDisabledSave(modal);
    await programsPage.dismissEditModalIfOpen();
  });

  test('Editing one program does not change another', { tag: '@negative' }, async ({
    page,
    trackProgram,
  }) => {
    const firstName = uniqueProgramName('Web Development 2026');
    const secondName = uniqueProgramName('Test Program');
    const secondDescription = `${KEEP_DESCRIPTION} ${Date.now()}`;
    const updatedFirstName = uniqueProgramName('Web Development 2026 - Updated');

    const programsPage = await createProgramViaUi(
      page,
      { name: firstName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );
    await createProgramOnCurrentPage(
      page,
      { name: secondName, description: secondDescription },
      trackProgram,
      programsPage,
    );

    await programsPage.openEditProgramForm(firstName);
    await programsPage.editProgramModal.fillProgramName(updatedFirstName);
    await programsPage.editProgramModal.clickSave();

    await expect(programsPage.editProgramModal.dialog).toBeHidden();
    await expect(programsPage.programEditButton(updatedFirstName)).toBeVisible();
    await expect(programsPage.programRow(secondName)).toBeVisible();
    await expect(programsPage.programRow(secondName)).toContainText(secondDescription);
  });

  test('Edit a program name that contains special characters', { tag: '@edge' }, async ({
    page,
    trackProgram,
  }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const specialName = `Web Development 2026 & "QA" <293> ${Date.now()}`;
    const programsPage = await createProgramViaUi(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );

    await programsPage.openEditProgramForm(programName);
    await programsPage.editProgramModal.fillProgramName(specialName);
    await programsPage.editProgramModal.clickSave();

    await expect(programsPage.editProgramModal.dialog).toBeHidden();
    await expect(programsPage.programEditButton(specialName)).toBeVisible();
  });

  test('Edited program keeps its description when only the name changes', { tag: '@edge' }, async ({
    page,
    trackProgram,
  }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const description = `${FULL_STACK_DESCRIPTION} ${Date.now()}`;
    const updatedName = uniqueProgramName('Web Development 2026 - Updated');
    const programsPage = await createProgramViaUi(
      page,
      { name: programName, description },
      trackProgram,
    );

    await programsPage.openEditProgramForm(programName);
    await programsPage.editProgramModal.fillProgramName(updatedName);
    await programsPage.editProgramModal.clickSave();

    await expect(programsPage.editProgramModal.dialog).toBeHidden();
    await expect(programsPage.programEditButton(updatedName)).toBeVisible();
    await expect(programsPage.programRow(updatedName)).toContainText(description);
  });

  test('Edit save returns 503', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const updatedName = uniqueProgramName('Web Development 2026 - Updated');
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );

    await programsPage.editProgramModal.fillProgramName(updatedName);
    await fulfillProgramUpdate(page, { status: 503 });
    await programsPage.editProgramModal.clickSave();

    await assertOptionalErrorState(page, programsPage, programsPage.editProgramModal);
    await expect(programsPage.programEditButton(programName)).toBeVisible();
    await expect(programsPage.programEditButton(updatedName)).toHaveCount(0);
  });

  test('Program list returns 200 with an empty array', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await fulfillProgramsList(page, {
      status: 200,
      body: JSON.stringify({ data: [] }),
    });
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsShellVisible(programsPage, pageErrors);
    await assertOptionalEmptyState(programsPage);
  });

  test('Program list returns 200 with a malformed body', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await fulfillProgramsList(page, {
      status: 200,
      body: JSON.stringify({ data: null }),
    });
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsShellVisible(programsPage, pageErrors);
  });

  test('Program list returns 404', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await fulfillProgramsList(page, {
      status: 404,
      body: JSON.stringify({ message: 'Not found' }),
    });
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsShellVisible(programsPage, pageErrors);
    const hasAlert = await page.getByRole('alert').first().isVisible().catch(() => false);
    const denied = await programsPage.accessDeniedText.first().isVisible().catch(() => false);
    if (hasAlert || denied) {
      await assertOptionalErrorState(page, programsPage);
    }
  });

  test('Program list returns 401', { tag: '@edge' }, async ({ page }) => {
    await fulfillProgramsList(page, {
      status: 401,
      body: JSON.stringify({ message: 'Unauthorized' }),
    });
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertLoginRedirectOrAuthOutcome(page);
  });

  test('Program list returns 403', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await fulfillProgramsList(page, {
      status: 403,
      body: JSON.stringify({ message: 'Forbidden' }),
    });
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsShellVisible(programsPage, pageErrors);
    await assertOptionalAccessDenied(programsPage);
  });

  test('Edit save returns 400', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );

    await fulfillProgramUpdate(page, { status: 400 });
    await programsPage.editProgramModal.clickSave();
    await assertOptionalErrorState(page, programsPage, programsPage.editProgramModal);
  });

  test('Edit save returns 401', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );

    await fulfillProgramUpdate(page, {
      status: 401,
      body: JSON.stringify({ message: 'Unauthorized' }),
    });
    await programsPage.editProgramModal.clickSave();
    await assertLoginRedirectOrAuthOutcome(page);
  });

  test('Edit save returns 403', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const pageErrors = trackPageErrors(page);
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );

    await fulfillProgramUpdate(page, { status: 403 });
    await programsPage.editProgramModal.clickSave();
    await assertProgramsShellVisible(programsPage, pageErrors);
    await assertOptionalAccessDenied(programsPage);
  });

  test('Edit save returns 404', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const pageErrors = trackPageErrors(page);
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );

    await fulfillProgramUpdate(page, { status: 404 });
    await programsPage.editProgramModal.clickSave();
    await assertProgramsShellVisible(programsPage, pageErrors);
    const hasErrorUi =
      (await page.getByRole('alert').first().isVisible().catch(() => false)) ||
      (await programsPage.editProgramModal.dialog.isVisible().catch(() => false));
    if (hasErrorUi) {
      await assertOptionalErrorState(page, programsPage, programsPage.editProgramModal);
    }
  });

  test('Edit save returns 422', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );

    await fulfillProgramUpdate(page, { status: 422 });
    await programsPage.editProgramModal.clickSave();
    await assertOptionalErrorState(page, programsPage, programsPage.editProgramModal);
  });

  test('Edit save returns 409', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );

    await fulfillProgramUpdate(page, { status: 409 });
    await programsPage.editProgramModal.clickSave();
    await assertOptionalErrorState(page, programsPage, programsPage.editProgramModal);
  });

  test('Program list returns 500', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await fulfillProgramsList(page, { status: 500, body: JSON.stringify({ message: 'Error' }) });
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsShellVisible(programsPage, pageErrors);
    const hasAlert = await page.getByRole('alert').first().isVisible().catch(() => false);
    if (hasAlert) {
      await assertOptionalErrorState(page, programsPage);
    }
  });

  test('Program list returns 501', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await fulfillProgramsList(page, { status: 501, body: JSON.stringify({ message: 'Error' }) });
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsShellVisible(programsPage, pageErrors);
  });

  test('Program list returns 502', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await fulfillProgramsList(page, { status: 502, body: JSON.stringify({ message: 'Error' }) });
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsShellVisible(programsPage, pageErrors);
  });

  test('Edit save returns 500', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );

    await fulfillProgramUpdate(page, { status: 500 });
    await programsPage.editProgramModal.clickSave();
    await assertOptionalErrorState(page, programsPage, programsPage.editProgramModal);
  });

  test('Edit save returns 501', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );

    await fulfillProgramUpdate(page, { status: 501 });
    await programsPage.editProgramModal.clickSave();
    await assertOptionalErrorState(page, programsPage, programsPage.editProgramModal);
  });

  test('Edit save returns 502', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );

    await fulfillProgramUpdate(page, { status: 502 });
    await programsPage.editProgramModal.clickSave();
    await assertOptionalErrorState(page, programsPage, programsPage.editProgramModal);
  });

  test('Edit save returns 200 with a body that has no program object', { tag: '@edge' }, async ({
    page,
    trackProgram,
  }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const updatedName = uniqueProgramName('Web Development 2026 - Updated');
    const pageErrors = trackPageErrors(page);
    const { programsPage } = await createAndOpenEditProgram(
      page,
      { name: programName, description: `${FULL_STACK_DESCRIPTION} ${Date.now()}` },
      trackProgram,
    );

    await programsPage.editProgramModal.fillProgramName(updatedName);
    await fulfillProgramUpdate(page, {
      status: 200,
      body: JSON.stringify({ message: 'ok' }),
    });
    await programsPage.editProgramModal.clickSave();

    await assertProgramsShellVisible(programsPage, pageErrors);
    await expect(programsPage.programEditButton(updatedName)).toHaveCount(0);
  });

  test('Program list returns 204', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await fulfillProgramsList(page, { status: 204, body: '' });
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsShellVisible(programsPage, pageErrors);
  });

  test('Program list returns 300', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await fulfillProgramsList(page, {
      status: 300,
      body: JSON.stringify({ data: [] }),
    });
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsShellVisible(programsPage, pageErrors);
  });
});
