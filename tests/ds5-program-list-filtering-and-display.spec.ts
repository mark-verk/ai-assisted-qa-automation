import { test, expect } from '../fixtures/cleanup.fixture';
import { signInWithCredentials, unauthenticatedStorageState } from '../fixtures/auth.helpers';
import { ProgramsPage } from '../pages/ProgramsPage';
import {
  assertProgramsPageReady,
  createProgramOnCurrentPage,
  createProgramViaUi,
} from './helpers/createProgramViaUi';

function uniqueSuffix(): string {
  return String(Date.now());
}

function uniqueProgramName(base: string): string {
  return `${base} ${uniqueSuffix()}`;
}

async function handleDeleteConfirm(
  page: import('@playwright/test').Page,
  programsPage: ProgramsPage,
  programName: string,
  action: 'accept' | 'dismiss',
): Promise<void> {
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    if (action === 'accept') {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
  await programsPage.programDeleteButton(programName).click();
}

test.describe('DS-5 — Program list filtering and display', () => {
  test.describe('Positive flows', () => {
    test('TC-001: Program list displays each program\'s name and description', async ({
      page,
      trackProgram,
    }) => {
      const programs = [
        {
          name: uniqueProgramName('Web Development 2026'),
          description: 'Full-stack web development program',
        },
        {
          name: uniqueProgramName('Data Science Fundamentals'),
          description: 'Introduction to Python, statistics, and ML basics',
        },
        {
          name: uniqueProgramName('UX Design Foundations'),
          description: 'User research, wireframing, and prototyping',
        },
      ];

      let programsPage = new ProgramsPage(page);
      for (const program of programs) {
        programsPage = await createProgramViaUi(page, program, trackProgram, programsPage);
      }

      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await expect(programsPage.table).toBeVisible({ timeout: 30_000 });

      for (const program of programs) {
        const row = programsPage.programRow(program.name);
        await expect(row).toBeVisible();
        await expect(row).toContainText(program.name);
        await expect(row).toContainText(program.description);
        await expect(programsPage.programEditButton(program.name)).toBeVisible();
        await expect(programsPage.programDeleteButton(program.name)).toBeVisible();
      }
    });

    test('TC-002: Empty state is shown when no programs exist', async () => {
      test.skip(
        true,
        'Requires an isolated tenant with zero programs; shared test.didaxis.studio accumulates data from other runs',
      );
    });

    test('TC-003: Newly created program appears in the list without manual refresh', async ({
      page,
      trackProgram,
    }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);

      const programName = uniqueProgramName('Cloud Computing Certificate');
      const description = 'AWS and Azure fundamentals';

      await createProgramOnCurrentPage(page, { name: programName, description }, trackProgram, programsPage);

      await expect(programsPage.programRow(programName)).toBeVisible();
      await expect(programsPage.programRow(programName)).toContainText(description);
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    });

    test('TC-004: List reflects program edits immediately after save', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Web Development 2026');
      const programsPage = await createProgramViaUi(
        page,
        {
          name: programName,
          description: 'Full-stack web development program',
        },
        trackProgram,
      );

      const updatedDescription = 'Updated curriculum for 2026';
      await programsPage.openEditProgramForm(programName);
      await programsPage.editProgramModal.fillDescription(updatedDescription);
      await programsPage.editProgramModal.clickSave();
      await expect(programsPage.editProgramModal.dialog).toBeHidden();

      await expect(programsPage.programRow(programName)).toContainText(updatedDescription);
      await expect(programsPage.programEditButton(programName)).toBeVisible();
      await expect(programsPage.programRow(programName)).not.toContainText(
        'Full-stack web development program',
      );
    });
  });

  test.describe('Negative flows', () => {
    test.describe('Unauthenticated access', () => {
      test.use({ storageState: unauthenticatedStorageState });

      test('TC-005: Programs page is not accessible to unauthenticated users', async ({ page }) => {
        const programsPage = new ProgramsPage(page);
        await programsPage.goto();

        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
        await expect(programsPage.heading).toHaveCount(0);
        await expect(programsPage.table).toHaveCount(0);
        await expect(programsPage.newProgramButton).toHaveCount(0);
      });
    });

    test('TC-006: Non-admin user sees restricted view or is denied access to Programs page', async ({
      page,
      browser,
      trackProgram,
    }) => {
      const email = process.env.DIDAXIS_NON_ADMIN_EMAIL;
      const password = process.env.DIDAXIS_NON_ADMIN_PASSWORD;
      test.skip(
        !email || !password,
        'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD for TC-006',
      );

      const programName = uniqueProgramName('Web Development 2026');
      await createProgramViaUi(page, {
        name: programName,
        description: `Visible only with permitted access ${uniqueSuffix()}`,
      }, trackProgram);

      const nonAdminContext = await browser.newContext({
        baseURL: process.env.DIDAXIS_URL,
      });
      const nonAdminPage = await nonAdminContext.newPage();
      await signInWithCredentials(nonAdminPage, email!, password!);

      const nonAdminPrograms = new ProgramsPage(nonAdminPage);
      await nonAdminPrograms.goto();

      const redirectedToLogin = /\/login/.test(nonAdminPage.url());

      if (redirectedToLogin || (await nonAdminPrograms.accessDeniedText().count()) > 0) {
        await expect(nonAdminPrograms.table).toHaveCount(0);
      } else {
        await expect(nonAdminPrograms.newProgramButton).toBeHidden();
        await expect(nonAdminPrograms.programEditButton(programName)).toBeHidden();
        await expect(nonAdminPrograms.programDeleteButton(programName)).toBeHidden();
      }

      await nonAdminContext.close();
    });

    test('TC-007: Program list does not display stale data after failed load', async ({ page }) => {
      await page.route('**/*', async (route) => {
        const request = route.request();
        const isApiCall =
          request.resourceType() === 'xhr' || request.resourceType() === 'fetch';
        const isProgramListGet =
          isApiCall && request.method() === 'GET' && /program/i.test(request.url());

        if (isProgramListGet) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Internal Server Error' }),
          });
          return;
        }

        await route.continue();
      });

      const programsPage = new ProgramsPage(page);
      await programsPage.goto();

      await expect(programsPage.noProgramsYetText()).toBeVisible();
      await expect(programsPage.table).toHaveCount(0);
      await expect(programsPage.emptyStateText()).toBeVisible();
    });
  });

  test.describe('Edge cases', () => {
    test('TC-008: Program with empty description displays appropriate placeholder in list', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Minimal Program');
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description: '' },
        trackProgram,
      );

      const row = programsPage.programRow(programName);
      await expect(row).toBeVisible();
      await expect(row).toContainText(programName);
      await expect(programsPage.programEditButton(programName)).toBeVisible();

      const descriptionCell = programsPage.descriptionCellForProgram(programName);
      const descriptionText = (await descriptionCell.innerText()).trim();
      expect(
        descriptionText === '' || /^(—|-|–|n\/a|no description)$/i.test(descriptionText),
      ).toBeTruthy();
    });

    test('TC-009: Long program names and descriptions are displayed without breaking layout', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName(
        'Advanced Enterprise Cloud Architecture DevOps Engineering and Site Reliability',
      );
      const description = `Enterprise cloud architecture covering AWS, Azure, Kubernetes, observability, incident response, and SRE practices. ${'Detailed curriculum module. '.repeat(20)}`;
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description },
        trackProgram,
      );

      const row = programsPage.programRow(programName);
      await expect(row).toBeVisible();
      await expect(row).toContainText(programName);
      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.newProgramButton).toBeVisible();

      const rowBox = await row.boundingBox();
      const tableBox = await programsPage.table.boundingBox();
      expect(rowBox).not.toBeNull();
      expect(tableBox).not.toBeNull();
      expect(rowBox!.width).toBeLessThanOrEqual(tableBox!.width + 2);
    });

    test('TC-010: Program names with special characters render correctly in the list', async ({
      page,
      trackProgram,
    }) => {
      const programName = uniqueProgramName('Informatique & IA - Niveau 2');
      const description = 'Programme bilingue avec caractères spéciaux';
      const programsPage = await createProgramViaUi(
        page,
        { name: programName, description },
        trackProgram,
      );

      const row = programsPage.programRow(programName);
      await expect(row).toBeVisible();
      await expect(row).toContainText('Informatique & IA - Niveau 2');
      await expect(row).not.toContainText('&amp;');
      await expect(programsPage.programEditButton(programName)).toBeVisible();
    });

    test('TC-011: List handles large number of programs with pagination or scrolling', async ({
      page,
    }) => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      const rowCount = await programsPage.tableRows().count();
      test.skip(
        rowCount < 50,
        'Requires 50+ programs in the tenant; creating that many would pollute the shared environment',
      );

      const firstRow = programsPage.tableRows().nth(1);
      await expect(firstRow).toBeVisible();

      const pagination = programsPage.paginationOrPageControls();
      if ((await pagination.count()) > 0) {
        await expect(pagination.first()).toBeVisible();
      } else {
        await programsPage.tableRows().last().scrollIntoViewIfNeeded();
        await expect(programsPage.tableRows().last()).toBeVisible();
      }
    });

    test('TC-012: Empty state CTA navigates to program creation form', async () => {
      test.skip(
        true,
        'Requires an isolated tenant with zero programs; shared test.didaxis.studio accumulates data from other runs',
      );
    });

    test('TC-013: List sort order is consistent and predictable', async ({ page, trackProgram }) => {
      const suffix = uniqueSuffix();
      const programs = [
        { name: `AAA Alpha Program ${suffix}`, description: 'Sort fixture alpha' },
        { name: `MMM Beta Program ${suffix}`, description: 'Sort fixture beta' },
        { name: `ZZZ Gamma Program ${suffix}`, description: 'Sort fixture gamma' },
      ];

      let programsPage = new ProgramsPage(page);
      for (const program of programs) {
        programsPage = await createProgramViaUi(page, program, trackProgram, programsPage);
      }

      await programsPage.goto();
      await assertProgramsPageReady(programsPage);
      await expect(programsPage.table).toBeVisible({ timeout: 30_000 });
      for (const program of programs) {
        await expect(programsPage.programEditButton(program.name)).toBeVisible();
      }

      const firstOrder = await Promise.all(
        programs.map((program) => programsPage.programRowIndex(program.name)),
      );
      expect(firstOrder.every((index) => index >= 0)).toBe(true);

      await page.reload();
      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.table).toBeVisible({ timeout: 30_000 });

      const secondOrder = await Promise.all(
        programs.map((program) => programsPage.programRowIndex(program.name)),
      );
      expect(secondOrder).toEqual(firstOrder);
    });

    test('TC-014: Deleted program is removed from list without page refresh', async ({
      page,
      trackProgram,
    }) => {
      const deletedName = uniqueProgramName('Test Program');
      const remainingName = uniqueProgramName('Web Development 2026');
      const programsPage = await createProgramViaUi(
        page,
        {
          name: remainingName,
          description: 'Full-stack web development program',
        },
        trackProgram,
      );
      await createProgramOnCurrentPage(
        page,
        {
          name: deletedName,
          description: `Program used for list-delete testing ${uniqueSuffix()}`,
        },
        trackProgram,
        programsPage,
      );

      await handleDeleteConfirm(page, programsPage, deletedName, 'accept');

      await expect(programsPage.programDeleteButton(deletedName)).toHaveCount(0);
      await expect(programsPage.programEditButton(deletedName)).toHaveCount(0);
      await expect(programsPage.programEditButton(remainingName)).toBeVisible({ timeout: 30_000 });
    });

    test('TC-015: Single program in list displays correctly (non-empty, non-bulk state)', async () => {
      test.skip(
        true,
        'Requires an isolated tenant with exactly one program; shared test.didaxis.studio accumulates data from other runs',
      );
    });
  });
});
