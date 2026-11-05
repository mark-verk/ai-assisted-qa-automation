import type { Page, Route } from '@playwright/test';

function programsCollectionPathname(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, '');
    return pathname === '/api/programs' ? pathname : null;
  } catch {
    return null;
  }
}

async function fulfillJson(route: Route, status: number, body?: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: body === undefined ? '' : JSON.stringify(body),
  });
}

export async function routeProgramsGet(
  page: Page,
  handler: (route: Route) => Promise<void>,
): Promise<void> {
  await page.route('**/api/programs', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    if (!programsCollectionPathname(route.request().url())) {
      await route.continue();
      return;
    }
    await handler(route);
  });
}

export async function routeProgramsGetStatus(
  page: Page,
  status: number,
  body?: unknown,
): Promise<void> {
  await routeProgramsGet(page, async (route) => {
    if (status === 204) {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (status === 300) {
      await route.fulfill({
        status: 300,
        headers: { Location: '/programs' },
        body: '',
      });
      return;
    }
    await fulfillJson(route, status, body ?? { message: 'synthetic error' });
  });
}

export async function routeProgramsPost(
  page: Page,
  handler: (route: Route) => Promise<void>,
): Promise<void> {
  await page.route('**/api/programs', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    if (!programsCollectionPathname(route.request().url())) {
      await route.continue();
      return;
    }
    await handler(route);
  });
}

export async function routeProgramsPostStatus(
  page: Page,
  status: number,
  body?: unknown,
): Promise<void> {
  await routeProgramsPost(page, async (route) => {
    await fulfillJson(route, status, body ?? { message: 'synthetic error' });
  });
}
