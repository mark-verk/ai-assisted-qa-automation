import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { adminBearerToken } from '../fixtures/cleanup.fixture';

/**
 * Manual purge. `npm test` does not run this file.
 *
 *   npm run test:purge-programs -- 10
 *
 * Use any positive integer, or all. The integer deletes that many ids from
 * the start of the GET response. Nothing is deleted when the count is missing.
 */

type ProgramRecord = { id?: unknown; name?: unknown };

function deletionLimit(): { all: true } | { all: false; count: number } {
  const raw = process.env.DELETE_PROGRAMS?.trim() ?? '';
  if (!raw) {
    throw new Error(
      'Set DELETE_PROGRAMS before running this file. Examples: 100, 300, 1000, or all.',
    );
  }
  if (raw.toLowerCase() === 'all') return { all: true };
  const count = Number(raw);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`DELETE_PROGRAMS must be a positive integer or "all". Received "${raw}".`);
  }
  return { all: false, count };
}

function apiBaseUrl(): string {
  return (process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio').replace(/\/$/, '');
}

async function authorized<T>(
  page: Page,
  token: string,
  send: (request: APIRequestContext, bearer: string) => Promise<T>,
  unauthorized: (result: T) => boolean,
): Promise<{ token: string; result: T }> {
  let current = token;
  let result = await send(page.request, current);
  if (unauthorized(result)) {
    current = await adminBearerToken(page);
    result = await send(page.request, current);
  }
  return { token: current, result };
}

test('delete programs from GET /api/programs', async ({ page }) => {
  test.setTimeout(60 * 60 * 1000);
  const limit = deletionLimit();
  const baseUrl = apiBaseUrl();
  let token = await adminBearerToken(page);

  const listed = await authorized(
    page,
    token,
    (request, bearer) =>
      request.get(`${baseUrl}/api/programs`, {
        headers: { Authorization: `Bearer ${bearer}` },
      }),
    (response) => response.status() === 401,
  );
  token = listed.token;
  expect(listed.result.ok(), `GET /api/programs returned ${listed.result.status()}`).toBeTruthy();

  const body = await listed.result.json();
  const programs: ProgramRecord[] = Array.isArray(body?.data) ? body.data : [];
  const programIds: string[] = [];
  for (const program of programs) {
    if (typeof program.id === 'string' && program.id) programIds.push(program.id);
  }

  const idsToDelete = limit.all ? programIds : programIds.slice(0, limit.count);
  const requested = limit.all ? 'all' : String(limit.count);
  console.log(
    `GET /api/programs returned ${programIds.length} ids. DELETE_PROGRAMS=${requested}. Deleting ${idsToDelete.length}.`,
  );
  if (idsToDelete.length === 0) return;

  const failures: string[] = [];
  for (let index = 0; index < idsToDelete.length; index += 1) {
    const uuid = idsToDelete[index];
    const deleted = await authorized(
      page,
      token,
      (request, bearer) =>
        request.delete(`${baseUrl}/api/programs/${uuid}`, {
          headers: { Authorization: `Bearer ${bearer}` },
        }),
      (response) => response.status() === 401,
    );
    token = deleted.token;
    const status = deleted.result.status();
    if (status !== 404 && !deleted.result.ok()) {
      failures.push(`${uuid} (${status})`);
    }
    if ((index + 1) % 25 === 0 || index + 1 === idsToDelete.length) {
      console.log(`deleted ${index + 1}/${idsToDelete.length}`);
    }
  }

  expect(failures, `Failed to delete:\n${failures.join('\n')}`).toEqual([]);
});
