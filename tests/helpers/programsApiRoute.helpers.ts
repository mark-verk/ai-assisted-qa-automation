import type { Page } from '@playwright/test';

const PROGRAMS_LIST_PATH = /\/api\/programs\/?(\?.*)?$/;
const PROGRAM_BY_ID_PATH = /\/api\/programs\/[^/]+\/?$/;

export function collectPageErrors(page: Page): {
  messages: string[];
  dispose: () => void;
} {
  const messages: string[] = [];
  const handler = (error: Error) => {
    messages.push(error.message);
  };
  page.on('pageerror', handler);
  return {
    messages,
    dispose: () => {
      page.off('pageerror', handler);
    },
  };
}

export async function routeProgramsListGet(
  page: Page,
  fulfill: (route: Parameters<Parameters<Page['route']>[1]>[0]) => Promise<void>,
): Promise<void> {
  await page.route(PROGRAMS_LIST_PATH, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const url = route.request().url();
    if (PROGRAM_BY_ID_PATH.test(new URL(url).pathname)) {
      await route.continue();
      return;
    }
    await fulfill(route);
  });
}

export async function routeProgramUpdate(
  page: Page,
  fulfill: (route: Parameters<Parameters<Page['route']>[1]>[0]) => Promise<void>,
): Promise<void> {
  await page.route(PROGRAM_BY_ID_PATH, async (route) => {
    const method = route.request().method();
    if (method !== 'PUT' && method !== 'PATCH') {
      await route.continue();
      return;
    }
    await fulfill(route);
  });
}

export async function fulfillJsonStatus(
  route: Parameters<Parameters<Page['route']>[1]>[0],
  status: number,
  body: unknown,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}
