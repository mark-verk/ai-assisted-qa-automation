import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { ProgramsPage } from '../pages/ProgramsPage';
import { assertNoAxeViolations, runA11yCheckOrWarnInCi } from './helpers/a11yCi';
import { assertProgramsPageReady } from './helpers/createProgramViaUi';

const axeTags = ['wcag2a', 'wcag2aa'] as const;

test.describe('Programs accessibility', { tag: '@regression' }, () => {
  test('Programs list page has no axe violations', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsPageReady(programsPage);

    const results = await new AxeBuilder({ page }).withTags([...axeTags]).analyze();

    await assertNoAxeViolations(results.violations, testInfo);
  });

  test('keyboard opens New Program dialog from primary control', async ({ page }, testInfo) => {
    await runA11yCheckOrWarnInCi(testInfo, 'Keyboard accessibility', async () => {
      const programsPage = new ProgramsPage(page);
      await programsPage.goto();
      await assertProgramsPageReady(programsPage);

      await programsPage.tabToNewProgramButton();
      await expect(programsPage.newProgramButton).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(programsPage.newProgramModal.dialog).toBeVisible();
    });
  });

  test('New Program modal has no axe violations when scoped to the dialog', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    await assertProgramsPageReady(programsPage);
    await programsPage.openNewProgramForm();

    const modalInclude = await programsPage.newProgramModal.axeScanInclude();

    const results = await new AxeBuilder({ page })
      .withTags([...axeTags])
      .include(modalInclude)
      .analyze();

    await assertNoAxeViolations(results.violations, testInfo);
  });
});
