import type { Page, Route } from '@playwright/test';

function programsListPathname(url: string): string | undefined {
  try {
    return new URL(url).pathname.replace(/\/$/, '');
  } catch {
    return undefined;
  }
}

export function isProgramsListGet(route: Route): boolean {
  if (route.request().method() !== 'GET') {
    return false;
  }
  return programsListPathname(route.request().url()) === '/api/programs';
}

export function isProgramUpdate(route: Route): boolean {
  const method = route.request().method();
  if (method !== 'PUT' && method !== 'PATCH') {
    return false;
  }
  const pathname = programsListPathname(route.request().url());
  if (!pathname) {
    return false;
  }
  return /^\/api\/programs\/[^/]+$/.test(pathname);
}

export async function fulfillProgramsList(
  page: Page,
  options: { status: number; body?: string; contentType?: string },
): Promise<void> {
  await page.route('**/api/programs', async (route) => {
    if (!isProgramsListGet(route)) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: options.status,
      contentType: options.contentType ?? 'application/json',
      body: options.body ?? JSON.stringify({ data: [] }),
    });
  });
}

export async function fulfillProgramUpdate(
  page: Page,
  options: { status: number; body?: string },
): Promise<void> {
  await page.route('**/api/programs/*', async (route) => {
    if (!isProgramUpdate(route)) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: options.status,
      contentType: 'application/json',
      body:
        options.body ??
        JSON.stringify({
          message: 'Synthetic programs API response for test',
        }),
    });
  });
}
