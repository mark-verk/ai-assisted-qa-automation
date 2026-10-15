import { expect, type Page, type Response } from '@playwright/test';

export function isProgramCreate(response: Response): boolean {
  if (response.request().method() !== 'POST') return false;
  try {
    return new URL(response.url()).pathname.replace(/\/$/, '') === '/api/programs';
  } catch {
    return false;
  }
}

export async function trackCreatedProgram(
  response: Response,
  trackProgram: (uuid: string) => void,
): Promise<void> {
  const body = await response.json();
  const id = body?.data?.id;
  expect(typeof id, 'Create program response did not include data.id').toBe('string');
  trackProgram(id);
}

export async function submitProgramCreate(
  page: Page,
  trackProgram: (uuid: string) => void,
  clickCreate: () => Promise<void>,
): Promise<void> {
  const createResponse = page.waitForResponse(isProgramCreate);
  await clickCreate();
  const response = await createResponse;
  expect(response.ok(), `Create program failed with ${response.status()}`).toBeTruthy();
  await trackCreatedProgram(response, trackProgram);
}

export async function submitProgramCreateIfSucceeded(
  page: Page,
  trackProgram: (uuid: string) => void,
  clickCreate: () => Promise<void>,
): Promise<boolean> {
  const createResponse = page
    .waitForResponse(isProgramCreate, { timeout: 15_000 })
    .catch(() => null);
  await clickCreate();
  const response = await createResponse;
  if (response?.ok()) {
    await trackCreatedProgram(response, trackProgram);
    return true;
  }
  return false;
}
