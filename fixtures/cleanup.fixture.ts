import { test as base, expect, type Page, type Response } from '@playwright/test';

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

function isAuthTokenResponse(response: Response): boolean {
  return (
    response.ok() &&
    response.request().method() === 'POST' &&
    /\/api\/auth\/(login|refresh)$/.test(response.url())
  );
}

async function readAccessToken(response: Response): Promise<string | undefined> {
  try {
    const body = await response.json();
    const token = body?.data?.access_token;
    return typeof token === 'string' ? token : undefined;
  } catch {
    return undefined;
  }
}

async function tokenFromUi(page: Page): Promise<string> {
  const pending = page.waitForResponse(isAuthTokenResponse);
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
  const token = usableAdminToken(await readAccessToken(await pending));
  if (!token) throw new Error('UI login did not return a usable access token');
  return token;
}

async function bearerToken(page: Page, captured: string | undefined): Promise<string> {
  const fromEnv = usableAdminToken(
    process.env.DIDAXIS_API_TOKEN || process.env.DIDAXIS_API_KEY,
  );
  if (fromEnv) return fromEnv;
  const fromLogin = usableAdminToken(captured);
  if (fromLogin) return fromLogin;
  return tokenFromUi(page);
}

export async function adminBearerToken(page: Page): Promise<string> {
  return bearerToken(page, undefined);
}

export const test = base.extend<{ trackProgram: (uuid: string) => void }>({
  trackProgram: async ({ page }, use) => {
    const ids: string[] = [];
    let captured: string | undefined;

    const onResponse = (response: Response) => {
      if (!isAuthTokenResponse(response)) return;
      void readAccessToken(response).then((token) => {
        if (usableAdminToken(token)) captured = token;
      });
    };
    page.on('response', onResponse);

    await use((uuid: string) => {
      if (uuid) ids.push(uuid);
    });

    page.off('response', onResponse);
    if (ids.length === 0) return;

    let token = await bearerToken(page, captured);
    const baseUrl = (process.env.DIDAXIS_URL ?? '').replace(/\/$/, '');

    for (const uuid of ids) {
      let response = await page.request.delete(`${baseUrl}/api/programs/${uuid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status() === 401) {
        token = await tokenFromUi(page);
        response = await page.request.delete(`${baseUrl}/api/programs/${uuid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (response.status() !== 404) {
        expect(response.ok(), `DELETE /api/programs/${uuid} returned ${response.status()}`).toBeTruthy();
      }

      const check = await page.request.get(`${baseUrl}/api/programs/${uuid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(check.status(), `program ${uuid} still exists after cleanup`).toBe(404);
      console.log(`cleanup removed program ${uuid}`);
    }
  },
});
