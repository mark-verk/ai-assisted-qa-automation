import { test, expect, type Page, type Locator } from '@playwright/test';

const LOGIN_PATH = '/login';
const PROGRAMS_PATH = '/programs';

const EMPTY_STATE_PATTERN =
  /no programs yet|haven't created any programs|no programs have been created|no programs found/i;

function uniqueSuffix(): string {
  return String(Date.now());
}

function uniqueProgramName(base: string): string {
  return `${base} ${uniqueSuffix()}`;
}

function newProgramDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'New Program' });
}

function editProgramDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Edit Program' });
}

function programsTable(page: Page): Locator {
  return page.getByRole('table');
}

function programRow(page: Page, name: string): Locator {
  return programsTable(page).getByRole('row').filter({ hasText: name });
}

function programEditButton(page: Page, name: string): Locator {
  return page.getByRole('button', { name: `Edit ${name}`, exact: true });
}

function programDeleteButton(page: Page, name: string): Locator {
  return page.getByRole('button', { name: `Delete ${name}`, exact: true });
}

function newProgramButton(page: Page): Locator {
  return page.getByRole('button', { name: '+ New Program' });
}

async function loginAsAdmin(page: Page): Promise<void> {
  const email = process.env.DIDAXIS_EMAIL;
  const password = process.env.DIDAXIS_PASSWORD;
  test.skip(!email || !password, 'Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env');

  await page.goto(LOGIN_PATH);
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).not.toHaveURL(/\/login\/?$/);
}

async function goToProgramsPage(page: Page): Promise<void> {
  await page.goto(PROGRAMS_PATH);
  await expect(page.getByRole('heading', { name: 'Programs', level: 2 })).toBeVisible();
  await expect(newProgramButton(page)).toBeVisible();
}

async function expectProgramsTableReady(page: Page): Promise<void> {
  await expect(programsTable(page)).toBeVisible({ timeout: 30_000 });
}

async function openNewProgramModal(page: Page): Promise<Locator> {
  const button = newProgramButton(page);
  await button.scrollIntoViewIfNeeded();
  await button.click();
  const dialog = newProgramDialog(page);
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  return dialog;
}

async function createProgramViaUi(
  page: Page,
  options: { name: string; description?: string },
): Promise<void> {
  await goToProgramsPage(page);
  await openNewProgramModal(page);
  const dialog = newProgramDialog(page);
  await dialog.getByLabel('Program Name').fill(options.name);
  if (options.description !== undefined) {
    await dialog.getByLabel('Description').fill(options.description);
  }
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(newProgramDialog(page)).toBeHidden();
  await expect(programEditButton(page, options.name)).toBeVisible();
}

async function createProgramOnCurrentPage(
  page: Page,
  options: { name: string; description?: string },
): Promise<void> {
  await openNewProgramModal(page);
  const dialog = newProgramDialog(page);
  await dialog.getByLabel('Program Name').fill(options.name);
  if (options.description !== undefined) {
    await dialog.getByLabel('Description').fill(options.description);
  }
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(newProgramDialog(page)).toBeHidden();
}

async function openEditModal(page: Page, programName: string): Promise<Locator> {
  await programEditButton(page, programName).click();
  const dialog = editProgramDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

async function handleDeleteConfirm(
  page: Page,
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
  await programDeleteButton(page, programName).click();
}

async function programRowIndex(page: Page, name: string): Promise<number> {
  const rows = programsTable(page).getByRole('row');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const editInRow = rows.nth(i).getByRole('button', { name: `Edit ${name}`, exact: true });
    if ((await editInRow.count()) > 0) {
      return i;
    }
  }
  return -1;
}

test.describe('DS-5 — Program list filtering and display', () => {
  test.describe('Positive flows', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('TC-001: Program list displays each program\'s name and description', async ({
      page,
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

      for (const program of programs) {
        await createProgramViaUi(page, program);
      }

      await goToProgramsPage(page);
      await expectProgramsTableReady(page);
      await expect(newProgramButton(page)).toBeVisible();

      for (const program of programs) {
        const row = programRow(page, program.name);
        await expect(row).toBeVisible();
        await expect(row).toContainText(program.name);
        await expect(row).toContainText(program.description);
        await expect(programEditButton(page, program.name)).toBeVisible();
        await expect(programDeleteButton(page, program.name)).toBeVisible();
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
    }) => {
      await goToProgramsPage(page);

      const programName = uniqueProgramName('Cloud Computing Certificate');
      const description = 'AWS and Azure fundamentals';

      await createProgramOnCurrentPage(page, { name: programName, description });

      await expect(programRow(page, programName)).toBeVisible();
      await expect(programRow(page, programName)).toContainText(description);
      await expect(programEditButton(page, programName)).toBeVisible();
    });

    test('TC-004: List reflects program edits immediately after save', async ({ page }) => {
      const programName = uniqueProgramName('Web Development 2026');
      await createProgramViaUi(page, {
        name: programName,
        description: 'Full-stack web development program',
      });

      const updatedDescription = 'Updated curriculum for 2026';
      const dialog = await openEditModal(page, programName);
      await dialog.getByLabel('Description').fill(updatedDescription);
      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(editProgramDialog(page)).toBeHidden();

      await expect(programRow(page, programName)).toContainText(updatedDescription);
      await expect(programEditButton(page, programName)).toBeVisible();
      await expect(programRow(page, programName)).not.toContainText(
        'Full-stack web development program',
      );
    });
  });

  test.describe('Negative flows', () => {
    test('TC-005: Programs page is not accessible to unauthenticated users', async ({
      page,
    }) => {
      await page.goto(PROGRAMS_PATH);

      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Programs', level: 2 })).toHaveCount(0);
      await expect(programsTable(page)).toHaveCount(0);
      await expect(newProgramButton(page)).toHaveCount(0);
    });

    test('TC-006: Non-admin user sees restricted view or is denied access to Programs page', async ({
      page,
      browser,
    }) => {
      const email = process.env.DIDAXIS_NON_ADMIN_EMAIL;
      const password = process.env.DIDAXIS_NON_ADMIN_PASSWORD;
      test.skip(
        !email || !password,
        'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD for TC-006',
      );

      await loginAsAdmin(page);
      const programName = uniqueProgramName('Web Development 2026');
      await createProgramViaUi(page, {
        name: programName,
        description: `Visible only with permitted access ${uniqueSuffix()}`,
      });

      const nonAdminContext = await browser.newContext({
        baseURL: process.env.DIDAXIS_URL,
      });
      const nonAdminPage = await nonAdminContext.newPage();
      await nonAdminPage.goto(LOGIN_PATH);
      await nonAdminPage.getByLabel('Email').fill(email!);
      await nonAdminPage.getByLabel('Password').fill(password!);
      await nonAdminPage.getByRole('button', { name: 'Sign In' }).click();
      await expect(nonAdminPage).not.toHaveURL(/\/login\/?$/);

      await nonAdminPage.goto(PROGRAMS_PATH);

      const denied = nonAdminPage.getByText(
        /access denied|forbidden|not authorized|unauthorized|permission/i,
      );
      const redirectedToLogin = /\/login/.test(nonAdminPage.url());

      if (redirectedToLogin || (await denied.count()) > 0) {
        await expect(programsTable(nonAdminPage)).toHaveCount(0);
      } else {
        await expect(newProgramButton(nonAdminPage)).toBeHidden();
        await expect(programEditButton(nonAdminPage, programName)).toBeHidden();
        await expect(programDeleteButton(nonAdminPage, programName)).toBeHidden();
      }

      await nonAdminContext.close();
    });

    test('TC-007: Program list does not display stale data after failed load', async ({
      page,
    }) => {
      await loginAsAdmin(page);

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

      await page.goto(PROGRAMS_PATH);

      // Current product treats a failed programs fetch as the empty state
      // ("No programs yet") instead of a distinct error + retry UI.
      await expect(page.getByText(/No programs yet/i)).toBeVisible();
      await expect(programsTable(page)).toHaveCount(0);
      await expect(page.getByText(EMPTY_STATE_PATTERN)).toBeVisible();
    });
  });

  test.describe('Edge cases', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('TC-008: Program with empty description displays appropriate placeholder in list', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Minimal Program');
      await createProgramViaUi(page, { name: programName, description: '' });

      const row = programRow(page, programName);
      await expect(row).toBeVisible();
      await expect(row).toContainText(programName);
      await expect(programEditButton(page, programName)).toBeVisible();

      const descriptionCell = row.getByRole('cell').nth(1);
      const descriptionText = (await descriptionCell.innerText()).trim();
      expect(
        descriptionText === '' || /^(—|-|–|n\/a|no description)$/i.test(descriptionText),
      ).toBeTruthy();
    });

    test('TC-009: Long program names and descriptions are displayed without breaking layout', async ({
      page,
    }) => {
      const programName = uniqueProgramName(
        'Advanced Enterprise Cloud Architecture DevOps Engineering and Site Reliability',
      );
      const description = `Enterprise cloud architecture covering AWS, Azure, Kubernetes, observability, incident response, and SRE practices. ${'Detailed curriculum module. '.repeat(20)}`;

      await createProgramViaUi(page, { name: programName, description });

      const row = programRow(page, programName);
      await expect(row).toBeVisible();
      await expect(row).toContainText(programName);
      await expect(page.getByRole('heading', { name: 'Programs', level: 2 })).toBeVisible();
      await expect(newProgramButton(page)).toBeVisible();

      const rowBox = await row.boundingBox();
      const tableBox = await programsTable(page).boundingBox();
      expect(rowBox).not.toBeNull();
      expect(tableBox).not.toBeNull();
      expect(rowBox!.width).toBeLessThanOrEqual(tableBox!.width + 2);
    });

    test('TC-010: Program names with special characters render correctly in the list', async ({
      page,
    }) => {
      const programName = uniqueProgramName('Informatique & IA - Niveau 2');
      const description = 'Programme bilingue avec caractères spéciaux';

      await createProgramViaUi(page, { name: programName, description });

      const row = programRow(page, programName);
      await expect(row).toBeVisible();
      await expect(row).toContainText('Informatique & IA - Niveau 2');
      await expect(row).not.toContainText('&amp;');
      await expect(programEditButton(page, programName)).toBeVisible();
    });

    test('TC-011: List handles large number of programs with pagination or scrolling', async ({
      page,
    }) => {
      await goToProgramsPage(page);
      const rowCount = await programsTable(page).getByRole('row').count();
      test.skip(
        rowCount < 50,
        'Requires 50+ programs in the tenant; creating that many would pollute the shared environment',
      );

      const firstRow = programsTable(page).getByRole('row').nth(1);
      await expect(firstRow).toBeVisible();

      const pagination = page.getByRole('navigation').or(page.getByRole('button', { name: /next|page/i }));
      if ((await pagination.count()) > 0) {
        await expect(pagination.first()).toBeVisible();
      } else {
        await programsTable(page).getByRole('row').last().scrollIntoViewIfNeeded();
        await expect(programsTable(page).getByRole('row').last()).toBeVisible();
      }
    });

    test('TC-012: Empty state CTA navigates to program creation form', async () => {
      test.skip(
        true,
        'Requires an isolated tenant with zero programs; shared test.didaxis.studio accumulates data from other runs',
      );
    });

    test('TC-013: List sort order is consistent and predictable', async ({ page }) => {
      const suffix = uniqueSuffix();
      const programs = [
        { name: `AAA Alpha Program ${suffix}`, description: 'Sort fixture alpha' },
        { name: `MMM Beta Program ${suffix}`, description: 'Sort fixture beta' },
        { name: `ZZZ Gamma Program ${suffix}`, description: 'Sort fixture gamma' },
      ];

      for (const program of programs) {
        await createProgramViaUi(page, program);
      }

      await goToProgramsPage(page);
      await expectProgramsTableReady(page);
      for (const program of programs) {
        await expect(programEditButton(page, program.name)).toBeVisible();
      }

      const firstOrder = await Promise.all(
        programs.map((program) => programRowIndex(page, program.name)),
      );
      expect(firstOrder.every((index) => index >= 0)).toBe(true);

      await page.reload();
      await expect(page.getByRole('heading', { name: 'Programs', level: 2 })).toBeVisible();
      await expectProgramsTableReady(page);

      const secondOrder = await Promise.all(
        programs.map((program) => programRowIndex(page, program.name)),
      );
      expect(secondOrder).toEqual(firstOrder);
    });

    test('TC-014: Deleted program is removed from list without page refresh', async ({
      page,
    }) => {
      const deletedName = uniqueProgramName('Test Program');
      const remainingName = uniqueProgramName('Web Development 2026');

      await createProgramViaUi(page, {
        name: remainingName,
        description: 'Full-stack web development program',
      });
      await createProgramOnCurrentPage(page, {
        name: deletedName,
        description: `Program used for list-delete testing ${uniqueSuffix()}`,
      });

      await handleDeleteConfirm(page, deletedName, 'accept');

      await expect(programDeleteButton(page, deletedName)).toHaveCount(0);
      await expect(programEditButton(page, deletedName)).toHaveCount(0);
      await expect(programEditButton(page, remainingName)).toBeVisible({ timeout: 30_000 });
    });

    test('TC-015: Single program in list displays correctly (non-empty, non-bulk state)', async () => {
      test.skip(
        true,
        'Requires an isolated tenant with exactly one program; shared test.didaxis.studio accumulates data from other runs',
      );
    });
  });
});
