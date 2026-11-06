import type { Page, Route } from '@playwright/test';

export type ProgramsRouteFulfill = {
  status: number;
  body?: string | Record<string, unknown> | unknown[] | null;
  contentType?: string;
};

function programsListPathname(pathname: string): boolean {
  return /^\/api\/programs\/?$/.test(pathname);
}

function programByIdPathname(pathname: string): boolean {
  return /^\/api\/programs\/[^/]+\/?$/.test(pathname);
}

function fulfillBody(options: ProgramsRouteFulfill): string | undefined {
  if (options.body === undefined || options.body === null) {
    return undefined;
  }
  if (typeof options.body === 'string') {
    return options.body;
  }
  return JSON.stringify(options.body);
}

async function fulfillRoute(route: Route, options: ProgramsRouteFulfill) {
  const contentType = options.contentType ?? 'application/json';
  const body = fulfillBody(options);
  await route.fulfill({
    status: options.status,
    contentType: body !== undefined ? contentType : undefined,
    body,
  });
}

/** Fulfill GET /api/programs only; other methods and paths continue. */
export async function routeProgramsListGet(page: Page, options: ProgramsRouteFulfill): Promise<void> {
  await page.route('**/api/programs', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() !== 'GET' || !programsListPathname(pathname)) {
      await route.continue();
      return;
    }
    await fulfillRoute(route, options);
  });
}

/** Fulfill PATCH /api/programs/:id only; other methods and paths continue. */
export async function routeProgramPatchById(page: Page, options: ProgramsRouteFulfill): Promise<void> {
  await page.route('**/api/programs/*', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() !== 'PATCH' || !programByIdPathname(pathname)) {
      await route.continue();
      return;
    }
    await fulfillRoute(route, options);
  });
}

/** Start before navigation; await after `goto()` so mocked GET completes before pageerror checks. */
export function waitForProgramsListGet(page: Page): Promise<import('@playwright/test').Response> {
  return page.waitForResponse((response) => {
    const request = response.request();
    if (request.method() !== 'GET') {
      return false;
    }
    const pathname = new URL(response.url()).pathname;
    return programsListPathname(pathname);
  });
}

/** Start before save; await after `clickSave()` so mocked PATCH completes before pageerror checks. */
export function waitForProgramPatch(page: Page): Promise<import('@playwright/test').Response> {
  return page.waitForResponse((response) => {
    const request = response.request();
    if (request.method() !== 'PATCH') {
      return false;
    }
    const pathname = new URL(response.url()).pathname;
    return programByIdPathname(pathname);
  });
}

/** Collect uncaught page errors for stability assertions on API edge cases. */
export function attachPageErrorCollector(page: Page): Error[] {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error);
  });
  return pageErrors;
}
