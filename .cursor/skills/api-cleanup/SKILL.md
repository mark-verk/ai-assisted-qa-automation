---
name: api-cleanup
description: Ensures Playwright tests clean up the data they create. Use whenever generating or reviewing tests that create programs (or any persistent records) in Didaxis, so test data does not accumulate. Apply this to every test that creates data — even if cleanup isn't explicitly requested.
---

# API Cleanup for Test Data

Tests that create data must remove it. Leftover data slows the app and
makes test runs unreliable. Every test that creates a program must track
its UUID and delete it via the API afterwards.

## Steps

1. Use the shared cleanup fixture in `fixtures/cleanup.fixture.ts`.
   Import `test` from there, not from `@playwright/test`.
2. When a test creates a program, capture the program's UUID and call
   `trackProgram(uuid)` immediately.
3. Do not write manual `afterAll` blocks for cleanup — the fixture
   handles teardown for every test that uses it.
4. Cleanup uses the DELETE API, not the UI:
   `DELETE /api/programs/<uuid>` with a Bearer token from
   `process.env.DIDAXIS_API_TOKEN`.
5. Never hardcode the token. Never delete data the test did not create.

## Reference

- Endpoint: DELETE https://test.didaxis.studio/api/programs/<uuid>
- Auth: Authorization: Bearer ${DIDAXIS_API_TOKEN}

Build the request URL from `process.env.DIDAXIS_URL` (`${DIDAXIS_URL}/api/programs/<uuid>`). The host above is that env value.

## Capturing the UUID

The programs table does not show the UUID. When Create is submitted, read the `POST /api/programs` response and pass `data.id` to `trackProgram` immediately. That id is the program UUID. Do not take an id from the existing programs list.

## When the token is expired

`DIDAXIS_API_TOKEN` is a short-lived JWT. If it is unset, use `process.env.DIDAXIS_API_KEY` (the name in the current `.env`). Treat the token as expired when it is missing, not a JWT, or its `exp` claim is in the past. A 401 from DELETE means the same thing.

The access token is not in `localStorage` or `sessionStorage`. The app keeps it in memory. Do not scrape storage for it. After UI login it arrives on the network:

- `POST /api/auth/login` with the email and password the test already types → `data.access_token`
- If a session already exists, navigation calls `POST /api/auth/refresh` → `data.access_token`. The refresh credential is the httpOnly cookie `didaxis_refresh_token`. Page script cannot read that cookie. The browser context sends it.

Capture a replacement only inside the fixture, and only after the UI login:

1. Decode the JWT payload to read `exp` and `role`. Do not verify the signature. Do not log the token or the payload.
2. Use the env token when it is unexpired. Prefer a token whose `role` is `ADMIN`.
3. Otherwise wait on the test page for the next successful `POST /api/auth/login` or `POST /api/auth/refresh` and read `data.access_token`. The specs already sign in through `/login` (Email, Password, Sign In). Reuse that response. Do not add a second login if this already returned a token.
4. If teardown still has no usable admin token, open `/login` on the test page. A valid refresh cookie redirects and the refresh response carries `data.access_token`. If the login form is shown, sign in with `DIDAXIS_EMAIL` and `DIDAXIS_PASSWORD` and read `data.access_token` from `POST /api/auth/login`.
5. Retry DELETE once with that bearer token. Do not write the token into a spec, a log, or git.

DELETE outcomes: 200 or 204 means removed. 404 means already gone — continue. Any other status after the single retry fails teardown so the leftover record is visible.

## Fixture

Create `fixtures/cleanup.fixture.ts` when it is missing. It is test-scoped. `trackProgram` only records ids. Teardown runs after the test, including when the test fails, and deletes just those ids. Re-export `expect` from this module so a spec has one `test`.

```typescript
import { test as base, expect, type Page } from '@playwright/test';

export { expect };

function jwtPayload(token: string): { exp?: number; role?: string } | undefined {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  } catch {
    return undefined;
  }
}

function usableAdminToken(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const payload = jwtPayload(token);
  if (!payload?.exp || payload.exp * 1000 <= Date.now()) return undefined;
  if (payload.role && payload.role !== 'ADMIN') return undefined;
  return token;
}

async function tokenFromUi(page: Page): Promise<string> {
  const pending = page.waitForResponse(
    (res) =>
      res.ok() &&
      res.request().method() === 'POST' &&
      /\/api\/auth\/(login|refresh)$/.test(res.url()),
  );
  await page.goto('/login');
  const formVisible = await page
    .getByLabel('Email')
    .isVisible()
    .catch(() => false);
  if (formVisible) {
    await page.getByLabel('Email').fill(process.env.DIDAXIS_EMAIL ?? '');
    await page.getByLabel('Password').fill(process.env.DIDAXIS_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Sign In' }).click();
  }
  const body = await (await pending).json();
  const token = usableAdminToken(body?.data?.access_token);
  if (!token) throw new Error('UI login did not return a usable access token');
  return token;
}

async function bearerToken(page: Page): Promise<string> {
  const fromEnv = usableAdminToken(
    process.env.DIDAXIS_API_TOKEN || process.env.DIDAXIS_API_KEY,
  );
  if (fromEnv) return fromEnv;
  return tokenFromUi(page);
}

export const test = base.extend<{ trackProgram: (uuid: string) => void }>({
  trackProgram: async ({ page }, use) => {
    const ids: string[] = [];
    await use((uuid: string) => {
      if (uuid) ids.push(uuid);
    });
    if (ids.length === 0) return;
    const token = await bearerToken(page);
    const baseUrl = process.env.DIDAXIS_URL;
    for (const uuid of ids) {
      let response = await page.request.delete(`${baseUrl}/api/programs/${uuid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status() === 401) {
        const refreshed = await tokenFromUi(page);
        response = await page.request.delete(`${baseUrl}/api/programs/${uuid}`, {
          headers: { Authorization: `Bearer ${refreshed}` },
        });
      }
      if (response.status() !== 404) {
        await expect(response).toBeOK();
      }
    }
  },
});
```

In a spec, import `{ test, expect }` from `../fixtures/cleanup.fixture` and call `trackProgram` with the created program's `data.id` before any later assertion. Review existing create-program specs the same way: flag any test that creates a program and never tracks it.
