import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { ProgramsPage } from '../pages/ProgramsPage';
import { assertProgramsPageReady } from './helpers/createProgramViaUi';

test.describe('Programs accessibility', { tag: '@regression' }, () => {
  test('Programs list page has no axe violations', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsPageReady(programsPage);

    const results = await new AxeBuilder({ page }).analyze();

    await expect(results.violations).toEqual([]);
  });

  test('New Program modal has no axe violations when scoped to the dialog', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsPageReady(programsPage);
    await programsPage.openNewProgramForm();

    const modalInclude = await programsPage.newProgramModal.axeScanInclude();

    const results = await new AxeBuilder({ page })
      .include(modalInclude)
      .disableRules('color-contrast')
      .analyze();

    await expect(results.violations).toEqual([]);
  });
});
