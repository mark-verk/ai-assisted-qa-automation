import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import { assertProgramsPageReady } from './helpers/createProgramViaUi';

test(
  'Programs page has no WCAG 2.0 A or AA violations',
  { tag: '@a11y' },
  async ({ page }) => {
    test.setTimeout(120_000);
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsPageReady(programsPage);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    await expect(results.violations).toEqual([]);
  },
);

test(
  'Keyboard activates the primary programs control',
  { tag: '@a11y' },
  async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsPageReady(programsPage);

    await programsPage.tabToNewProgramButton();
    await expect(programsPage.newProgramButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(programsPage.newProgramModal.dialog).toBeVisible();
  },
);
