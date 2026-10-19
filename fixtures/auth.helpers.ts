import { expect, type Page } from '@playwright/test';
import path from 'path';

/** Clears the admin session from playwright.config.ts `storageState`. */
export const unauthenticatedStorageState = { cookies: [], origins: [] };

export const adminStorageStatePath = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');

export async function signInWithCredentials(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).not.toHaveURL(/\/login\/?$/);
}
