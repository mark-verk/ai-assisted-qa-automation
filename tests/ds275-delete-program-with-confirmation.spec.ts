import { test, expect } from '../fixtures/cleanup.fixture';
import {
  clickDeleteAndHandleDialog,
  clickDeleteAwaitingDialog,
  confirmDeletionOfProgram,
} from '../fixtures/delete-program.helpers';
import {
  fulfillProgramsRoute,
  routeProgramDeleteForId,
  routeProgramsListGet,
  routeProgramsListGetSequence,
} from '../fixtures/programs-api-route.helpers';
import {
  assertAuthenticationOutcome,
  assertOptionalAccessDenied,
  assertOptionalEmptyOutcome,
  assertOptionalErrorState,
  assertProgramsHeadingAndNoCrash,
  attachPageErrorCollector,
} from '../fixtures/programs-outcome.helpers';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  assertProgramsPageReady,
  createProgramOnCurrentPage,
  createProgramViaUi,
  createProgramViaUiReturningId,
} from './helpers/createProgramViaUi';

function uniqueSuffix(): string {
  return String(Date.now());
}

function uniqueProgramName(base: string): string {
  return `${base} ${uniqueSuffix()}`;
}

function minimalProgramRecord(id: string, name: string, description: string) {
  return {
    id,
    name,
    description,
    updated_at: new Date().toISOString(),
  };
}

test.describe('DS-275 — Delete program with confirmation', () => {
  test('Delete program with confirmation', { tag: '@happy' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Test Program DS-275');
    const programsPage = await createProgramViaUi(
      page,
      {
        name: programName,
        description: `Delete confirm happy path ${uniqueSuffix()}`,
      },
      trackProgram,
    );

    const dialog = await clickDeleteAwaitingDialog(page, programsPage, programName);
    expect(dialog.type()).toBe('confirm');
    await dialog.accept();

    await expect(programsPage.programDeleteButton(programName)).toHaveCount(0);
    await expect(programsPage.programEditButton(programName)).toHaveCount(0);
  });

  test('Cancel program deletion', { tag: '@happy' }, async ({ page, trackProgram }) => {
    const programName = uniqueProgramName('Test Program DS-275');
    const description = `Cancel delete ${uniqueSuffix()}`;
    const programsPage = await createProgramViaUi(
      page,
      { name: programName, description },
      trackProgram,
    );

    const dialog = await clickDeleteAwaitingDialog(page, programsPage, programName);
    expect(dialog.type()).toBe('confirm');
    await dialog.dismiss();

    await expect(programsPage.programDeleteButton(programName)).toBeVisible();
    await expect(programsPage.programRow(programName)).toContainText(description);
  });

  test('Dismissing the confirmation does not delete the program', { tag: '@negative' }, async ({
    page,
    trackProgram,
  }) => {
    const programName = uniqueProgramName('Test Program DS-275');
    const programsPage = await createProgramViaUi(
      page,
      {
        name: programName,
        description: `Dismiss dialog ${uniqueSuffix()}`,
      },
      trackProgram,
    );

    await clickDeleteAndHandleDialog(page, programsPage, programName, 'dismiss');

    await expect(programsPage.programDeleteButton(programName)).toBeVisible();
  });

  test('Delete confirmation for one program does not remove another', { tag: '@negative' }, async ({
    page,
    trackProgram,
  }) => {
    const firstName = uniqueProgramName('Test Program DS-275');
    const secondName = uniqueProgramName('Web Development 2026 DS-275');
    const secondDescription = `Sibling program ${uniqueSuffix()}`;

    const { programsPage } = await createProgramViaUiReturningId(
      page,
      {
        name: firstName,
        description: `First of two ${uniqueSuffix()}`,
      },
      trackProgram,
    );

    await createProgramOnCurrentPage(
      page,
      { name: secondName, description: secondDescription },
      trackProgram,
      programsPage,
    );
    await expect(programsPage.programEditButton(secondName)).toBeVisible();

    await confirmDeletionOfProgram(page, programsPage, firstName);

    await expect(programsPage.programDeleteButton(firstName)).toHaveCount(0);
    await expect(programsPage.programDeleteButton(secondName)).toBeVisible();
    await expect(programsPage.programRow(secondName)).toContainText(secondDescription);
  });

  test('Delete a program whose name contains special characters', { tag: '@edge' }, async ({
    page,
    trackProgram,
  }) => {
    const programName = uniqueProgramName('Test Program & "QA" <275>');
    const programsPage = await createProgramViaUi(
      page,
      {
        name: programName,
        description: `Special chars delete ${uniqueSuffix()}`,
      },
      trackProgram,
    );

    await confirmDeletionOfProgram(page, programsPage, programName);

    await expect(programsPage.programDeleteButton(programName)).toHaveCount(0);
    await expect(programsPage.programEditButton(programName)).toHaveCount(0);
  });

  test('Confirming deletion once removes the program a single time', { tag: '@edge' }, async ({
    page,
    trackProgram,
  }) => {
    const programName = uniqueProgramName('Test Program DS-275');
    const programsPage = await createProgramViaUi(
      page,
      {
        name: programName,
        description: `Single delete ${uniqueSuffix()}`,
      },
      trackProgram,
    );

    await confirmDeletionOfProgram(page, programsPage, programName);

    await expect(programsPage.programRow(programName)).toHaveCount(0);
    await expect(programsPage.programEditButton(programName)).toHaveCount(0);
  });

  test('Deleting the only visible program reaches an empty outcome', { tag: '@edge' }, async ({
    page,
    trackProgram,
  }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programName = uniqueProgramName('Test Program DS-275');
    const description = `Only list row ${uniqueSuffix()}`;

    const { programsPage, programId } = await createProgramViaUiReturningId(
      page,
      { name: programName, description },
      trackProgram,
    );

    await routeProgramsListGetSequence(page, [
      { status: 200, body: { data: [minimalProgramRecord(programId, programName, description)] } },
      { status: 200, body: { data: [] } },
    ]);

    await page.reload();
    await assertProgramsPageReady(programsPage);
    await expect(programsPage.programDeleteButton(programName)).toBeVisible();

    await confirmDeletionOfProgram(page, programsPage, programName);

    await assertOptionalEmptyOutcome(programsPage, page, pageErrors);
  });

  test('Delete save returns 503', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programName = uniqueProgramName('Test Program DS-275');
    const { programsPage, programId } = await createProgramViaUiReturningId(
      page,
      { name: programName, description: `Delete 503 ${uniqueSuffix()}` },
      trackProgram,
    );

    await routeProgramDeleteForId(page, programId, 503);
    await confirmDeletionOfProgram(page, programsPage, programName);

    await assertOptionalErrorState(page, programsPage, pageErrors);
    await expect(programsPage.programDeleteButton(programName)).toBeVisible();
  });

  test('Program list returns 200 with an empty array', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programsPage = new ProgramsPage(page);

    await routeProgramsListGet(page, async (route) => {
      await fulfillProgramsRoute(route, 200, { data: [] });
    });

    await programsPage.goto();
    await assertOptionalEmptyOutcome(programsPage, page, pageErrors);
  });

  test('Program list returns 200 with a malformed body', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programsPage = new ProgramsPage(page);

    await routeProgramsListGet(page, async (route) => {
      await fulfillProgramsRoute(route, 200, {});
    });

    await programsPage.goto();
    await assertProgramsHeadingAndNoCrash(page, programsPage, pageErrors);
  });

  test('Program list returns 404', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programsPage = new ProgramsPage(page);

    await routeProgramsListGet(page, async (route) => {
      await fulfillProgramsRoute(route, 404, { message: 'Not found' });
    });

    await programsPage.goto();
    await assertOptionalErrorState(page, programsPage, pageErrors);
  });

  test('Program list returns 401', { tag: '@edge' }, async ({ page }) => {
    const programsPage = new ProgramsPage(page);

    await routeProgramsListGet(page, async (route) => {
      await fulfillProgramsRoute(route, 401, { message: 'Unauthorized' });
    });

    await programsPage.goto();
    await assertAuthenticationOutcome(page);
  });

  test('Program list returns 403', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programsPage = new ProgramsPage(page);

    await routeProgramsListGet(page, async (route) => {
      await fulfillProgramsRoute(route, 403, { message: 'Forbidden' });
    });

    await programsPage.goto();
    await assertOptionalAccessDenied(page, programsPage, pageErrors);
  });

  test('Delete save returns 400', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programName = uniqueProgramName('Test Program DS-275');
    const { programsPage, programId } = await createProgramViaUiReturningId(
      page,
      { name: programName, description: `Delete 400 ${uniqueSuffix()}` },
      trackProgram,
    );

    await routeProgramDeleteForId(page, programId, 400);
    await confirmDeletionOfProgram(page, programsPage, programName);

    await assertOptionalErrorState(page, programsPage, pageErrors);
    await expect(programsPage.programDeleteButton(programName)).toBeVisible();
  });

  test('Delete save returns 422', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programName = uniqueProgramName('Test Program DS-275');
    const { programsPage, programId } = await createProgramViaUiReturningId(
      page,
      { name: programName, description: `Delete 422 ${uniqueSuffix()}` },
      trackProgram,
    );

    await routeProgramDeleteForId(page, programId, 422);
    await confirmDeletionOfProgram(page, programsPage, programName);

    await assertOptionalErrorState(page, programsPage, pageErrors);
  });

  test('Delete save returns 409', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programName = uniqueProgramName('Test Program DS-275');
    const { programsPage, programId } = await createProgramViaUiReturningId(
      page,
      { name: programName, description: `Delete 409 ${uniqueSuffix()}` },
      trackProgram,
    );

    await routeProgramDeleteForId(page, programId, 409);
    await confirmDeletionOfProgram(page, programsPage, programName);

    await assertOptionalErrorState(page, programsPage, pageErrors);
  });

  test('Program list returns 500', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programsPage = new ProgramsPage(page);

    await routeProgramsListGet(page, async (route) => {
      await fulfillProgramsRoute(route, 500, { message: 'Internal server error' });
    });

    await programsPage.goto();
    await assertOptionalErrorState(page, programsPage, pageErrors);
  });

  test('Program list returns 501', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programsPage = new ProgramsPage(page);

    await routeProgramsListGet(page, async (route) => {
      await fulfillProgramsRoute(route, 501, { message: 'Not implemented' });
    });

    await programsPage.goto();
    await assertOptionalErrorState(page, programsPage, pageErrors);
  });

  test('Program list returns 502', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programsPage = new ProgramsPage(page);

    await routeProgramsListGet(page, async (route) => {
      await fulfillProgramsRoute(route, 502, { message: 'Bad gateway' });
    });

    await programsPage.goto();
    await assertOptionalErrorState(page, programsPage, pageErrors);
  });

  test('Delete save returns 500', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programName = uniqueProgramName('Test Program DS-275');
    const { programsPage, programId } = await createProgramViaUiReturningId(
      page,
      { name: programName, description: `Delete 500 ${uniqueSuffix()}` },
      trackProgram,
    );

    await routeProgramDeleteForId(page, programId, 500);
    await confirmDeletionOfProgram(page, programsPage, programName);

    await assertOptionalErrorState(page, programsPage, pageErrors);
  });

  test('Delete save returns 501', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programName = uniqueProgramName('Test Program DS-275');
    const { programsPage, programId } = await createProgramViaUiReturningId(
      page,
      { name: programName, description: `Delete 501 ${uniqueSuffix()}` },
      trackProgram,
    );

    await routeProgramDeleteForId(page, programId, 501);
    await confirmDeletionOfProgram(page, programsPage, programName);

    await assertOptionalErrorState(page, programsPage, pageErrors);
  });

  test('Delete save returns 502', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programName = uniqueProgramName('Test Program DS-275');
    const { programsPage, programId } = await createProgramViaUiReturningId(
      page,
      { name: programName, description: `Delete 502 ${uniqueSuffix()}` },
      trackProgram,
    );

    await routeProgramDeleteForId(page, programId, 502);
    await confirmDeletionOfProgram(page, programsPage, programName);

    await assertOptionalErrorState(page, programsPage, pageErrors);
  });

  test('Delete target returns 404', { tag: '@edge' }, async ({ page, trackProgram }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programName = uniqueProgramName('Test Program DS-275');
    const { programsPage, programId } = await createProgramViaUiReturningId(
      page,
      { name: programName, description: `Delete target 404 ${uniqueSuffix()}` },
      trackProgram,
    );

    await routeProgramDeleteForId(page, programId, 404);
    await confirmDeletionOfProgram(page, programsPage, programName);

    const rowRemoved = (await programsPage.programDeleteButton(programName).count()) === 0;
    const alertVisible = await page.getByRole('alert').first().isVisible().catch(() => false);
    expect(rowRemoved || alertVisible).toBeTruthy();
    await assertProgramsHeadingAndNoCrash(page, programsPage, pageErrors);
  });

  test('Program list returns 204', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programsPage = new ProgramsPage(page);

    await routeProgramsListGet(page, async (route) => {
      await route.fulfill({ status: 204 });
    });

    await programsPage.goto();
    await assertProgramsHeadingAndNoCrash(page, programsPage, pageErrors);
  });

  test('Program list returns 300', { tag: '@edge' }, async ({ page }) => {
    const pageErrors = attachPageErrorCollector(page);
    const programsPage = new ProgramsPage(page);

    await routeProgramsListGet(page, async (route) => {
      await fulfillProgramsRoute(route, 300, { message: 'Multiple choices' });
    });

    await programsPage.goto();
    await assertProgramsHeadingAndNoCrash(page, programsPage, pageErrors);
  });
});
