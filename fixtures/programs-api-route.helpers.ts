import type { Page, Route } from '@playwright/test';

const JSON_CONTENT_TYPE = 'application/json';

export async function fulfillProgramsRoute(
  route: Route,
  status: number,
  body?: string | Record<string, unknown> | unknown[],
): Promise<void> {
  const payload =
    body === undefined
      ? undefined
      : typeof body === 'string'
        ? body
        : JSON.stringify(body);
  await route.fulfill({
    status,
    contentType: JSON_CONTENT_TYPE,
    body: payload,
  });
}

function isProgramsCollectionPath(pathname: string): boolean {
  return pathname.replace(/\/$/, '') === '/api/programs';
}

function programIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/\/api\/programs\/([^/]+)$/);
  return match?.[1];
}

export async function routeProgramsListGet(
  page: Page,
  fulfill: (route: Route) => Promise<void>,
): Promise<void> {
  await page.route('**/api/programs', async (route) => {
    const url = new URL(route.request().url());
    if (!isProgramsCollectionPath(url.pathname)) {
      await route.continue();
      return;
    }
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await fulfill(route);
  });
}

export async function routeProgramDeleteForId(
  page: Page,
  programId: string,
  status: number,
  body: Record<string, unknown> = { message: 'Synthetic delete failure' },
): Promise<void> {
  let fulfilled = false;
  await page.route('**/api/programs/*', async (route) => {
    const url = new URL(route.request().url());
    const id = programIdFromPath(url.pathname);
    if (!id) {
      await route.continue();
      return;
    }
    if (route.request().method() !== 'DELETE') {
      await route.continue();
      return;
    }
    if (id !== programId) {
      await route.continue();
      return;
    }
    if (fulfilled) {
      await route.continue();
      return;
    }
    fulfilled = true;
    await fulfillProgramsRoute(route, status, body);
  });
}

export async function routeProgramsListGetSequence(
  page: Page,
  responses: Array<{ status: number; body?: string | Record<string, unknown> | unknown[] }>,
): Promise<void> {
  let index = 0;
  await routeProgramsListGet(page, async (route) => {
    const entry = responses[Math.min(index, responses.length - 1)];
    index += 1;
    await fulfillProgramsRoute(route, entry.status, entry.body);
  });
}
