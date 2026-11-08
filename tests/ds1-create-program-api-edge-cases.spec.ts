import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import { assertProgramsPageReady } from './helpers/createProgramViaUi';

const PROGRAMS_API = '**/api/programs';

function uniqueProgramName(base: string): string {
  return `${base} ${Date.now()}`;
}

function isProgramsCollectionUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return pathname === '/api/programs' || pathname === '/api/programs/';
  } catch {
    return false;
  }
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  return errors;
}

function assertNoPageErrors(errors: string[]): void {
  expect(errors, errors.join('\n')).toEqual([]);
}

async function routeProgramsPost(
  page: Page,
  status: number,
  body: Record<string, unknown> = { message: 'Error' },
): Promise<void> {
  await page.route(PROGRAMS_API, async (route) => {
    const request = route.request();
    if (request.method() !== 'POST' || !isProgramsCollectionUrl(request.url())) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

async function routeProgramsGet(page: Page, status: number, body: unknown): Promise<void> {
  await page.route(PROGRAMS_API, async (route) => {
    const request = route.request();
    if (request.method() !== 'GET' || !isProgramsCollectionUrl(request.url())) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

async function openCreateFormReady(page: Page): Promise<ProgramsPage> {
  const programsPage = new ProgramsPage(page);
  await programsPage.goto();
  await assertProgramsPageReady(programsPage);
  await programsPage.openNewProgramForm();
  return programsPage;
}

async function assertCreatePostFailureShell(
  page: Page,
  programsPage: ProgramsPage,
  errors: string[],
): Promise<void> {
  const modal = programsPage.newProgramModal;
  await expect(modal.dialog).toBeVisible();
  await expect(programsPage.heading).toBeVisible();
  await expect(modal.alert).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  assertNoPageErrors(errors);
}

test.describe('DS-1 — Create new academic program — API edge cases', () => {
  const createPostErrorStatuses = [503, 400, 403, 422, 500, 501, 502, 409] as const;

  for (const status of createPostErrorStatuses) {
    test(
      `POST /api/programs ${status} leaves New Program dialog open with no alert copy`,
      { tag: '@edge' },
      async ({ page }) => {
        const pageErrors = collectPageErrors(page);
        const programsPage = await openCreateFormReady(page);
        await routeProgramsPost(page, status, { message: `Synthetic ${status}` });

        await programsPage.newProgramModal.fill({
          name: uniqueProgramName(`DS1 POST ${status}`),
          description: 'API edge coverage',
        });
        await programsPage.newProgramModal.clickCreate();

        await assertCreatePostFailureShell(page, programsPage, pageErrors);
      },
    );
  }

  test(
    'POST /api/programs 401 leaves dialog open or redirects to login without pageerror',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = collectPageErrors(page);
      const programsPage = await openCreateFormReady(page);
      await routeProgramsPost(page, 401, { message: 'Unauthorized' });

      await programsPage.newProgramModal.fill({
        name: uniqueProgramName('DS1 POST 401'),
        description: 'API edge coverage',
      });
      await programsPage.newProgramModal.clickCreate();

      const onLogin = /\/login/.test(page.url());
      if (onLogin) {
        await expect(page).toHaveURL(/\/login/);
      } else {
        await expect(programsPage.newProgramModal.dialog).toBeVisible();
        await expect(programsPage.heading).toBeVisible();
        await expect(programsPage.newProgramModal.alert).toHaveCount(0);
      }
      await expect(page.getByRole('alert')).toHaveCount(0);
      assertNoPageErrors(pageErrors);
    },
  );

  test(
    'POST /api/programs 200 without program object closes dialog without crash',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = collectPageErrors(page);
      const programsPage = await openCreateFormReady(page);
      await routeProgramsPost(page, 200, { ok: true });

      await programsPage.newProgramModal.fill({
        name: uniqueProgramName('DS1 POST 200 ok'),
        description: 'No program object in response',
      });
      await programsPage.newProgramModal.clickCreate();

      await expect(programsPage.newProgramModal.dialog).toBeHidden();
      await expect(programsPage.heading).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
      assertNoPageErrors(pageErrors);
    },
  );

  test(
    'GET /api/programs 200 with empty data array shows empty state copy and Create Program control',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = collectPageErrors(page);
      await routeProgramsGet(page, 200, { data: [] });

      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expect(programsPage.heading).toBeVisible();
      await expect(programsPage.programsEmptyStateMessage).toBeVisible();
      await expect(programsPage.programsEmptyStateMessage).toHaveText(
        'No programs yet. Create your first program to get started.',
      );
      await expect(programsPage.createProgramButton).toBeVisible();
      assertNoPageErrors(pageErrors);
    },
  );

  test(
    'GET /api/programs 200 with data null keeps Programs shell visible without pageerror',
    { tag: '@edge' },
    async ({ page }) => {
      const pageErrors = collectPageErrors(page);
      await routeProgramsGet(page, 200, { data: null });

      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await expect(programsPage.heading).toBeVisible();
      assertNoPageErrors(pageErrors);
    },
  );
});
