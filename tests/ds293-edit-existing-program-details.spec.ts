import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import { assertNoAxeViolations, runA11yCheckOrWarnInCi } from './helpers/a11yCi';
import { createProgramViaUi } from './helpers/createProgramViaUi';
import {
  collectPageErrors,
  fulfillJsonStatus,
  routeProgramUpdate,
  routeProgramsListGet,
} from './helpers/programsApiRoute.helpers';

const axeTags = ['wcag2a', 'wcag2aa'] as const;

function uniqueSuffix(): string {
  return String(Date.now());
}

function uniqueProgramName(base: string): string {
  return `${base} ${uniqueSuffix()}`;
}

async function assertEditSaveApiErrorOutcome(
  programsPage: ProgramsPage,
  pageErrors: string[],
  statusCode: number,
): Promise<void> {
  const modal = programsPage.editProgramModal;
  await expect(modal.dialog).toBeVisible();
  await expect(modal.alert).toHaveCount(0);
  await expect
    .poll(() => pageErrors.some((message) => message.includes(`Request failed with status code ${statusCode}`)))
    .toBe(true);
}

test.describe('DS-293 — Edit existing program details', () => {
  test.describe('Happy path', () => {
    test(
      'Open program for editing shows pre-populated Edit Program dialog',
      { tag: '@smoke' },
      async ({ page, trackProgram }) => {
        const programName = uniqueProgramName('Web Development 2026');
        const description = `Full-stack web development program ${uniqueSuffix()}`;
        const programsPage = await createProgramViaUi(
          page,
          { name: programName, description },
          trackProgram,
        );

        await programsPage.openEditProgramForm(programName);
        const modal = programsPage.editProgramModal;

        await expect(modal.programNameField).toHaveValue(programName);
        await expect(modal.descriptionField).toHaveValue(description);
        await expect(modal.saveButton).toBeVisible();
        await expect(modal.cancelButton).toBeVisible();
      },
    );

    test(
      'Successfully edit program name and list reflects update immediately',
      { tag: '@smoke' },
      async ({ page, trackProgram }) => {
        const programName = uniqueProgramName('Web Development 2026');
        const updatedName = uniqueProgramName('Web Development 2026 - Updated');
        const description = `Original description ${uniqueSuffix()}`;
        const programsPage = await createProgramViaUi(
          page,
          { name: programName, description },
          trackProgram,
        );

        await programsPage.openEditProgramForm(programName);
        await programsPage.editProgramModal.fillProgramName(updatedName);
        await programsPage.editProgramModal.clickSave();

        await expect(programsPage.editProgramModal.dialog).toBeHidden();
        await expect(programsPage.programEditButton(updatedName)).toBeVisible();
        await expect(programsPage.programEditButton(programName)).toHaveCount(0);
        await expect(programsPage.programRow(updatedName)).toContainText(description);
      },
    );

    test(
      'Editing only Description preserves Program Name and updates description in list',
      { tag: '@smoke' },
      async ({ page, trackProgram }) => {
        const programName = uniqueProgramName('Web Development 2026');
        const originalDescription = `Full-stack web development program ${uniqueSuffix()}`;
        const updatedDescription =
          'Updated full-stack curriculum with React and Node.js modules';
        const programsPage = await createProgramViaUi(
          page,
          { name: programName, description: originalDescription },
          trackProgram,
        );

        await programsPage.openEditProgramForm(programName);
        await programsPage.editProgramModal.fillDescription(updatedDescription);
        await programsPage.editProgramModal.clickSave();

        await expect(programsPage.editProgramModal.dialog).toBeHidden();
        await expect(programsPage.programEditButton(programName)).toBeVisible();
        await expect(programsPage.programRow(programName)).toContainText(updatedDescription);
      },
    );
  });

  test.describe('Negative', () => {
    test(
      'Cannot save edit with empty program name',
      { tag: '@smoke' },
      async ({ page, trackProgram }) => {
        const programName = uniqueProgramName('Web Development 2026');
        const description = `Description ${uniqueSuffix()}`;
        const programsPage = await createProgramViaUi(
          page,
          { name: programName, description },
          trackProgram,
        );

        await programsPage.openEditProgramForm(programName);
        await programsPage.editProgramModal.fillProgramName('');

        const modal = programsPage.editProgramModal;
        await expect(modal.saveButton).toBeDisabled();
        await expect(modal.dialog).toBeVisible();
        await programsPage.dismissEditModalIfOpen();
        await expect(programsPage.programEditButton(programName)).toBeVisible();
      },
    );

    test(
      'Cancel edit discards changes and preserves original program data',
      { tag: '@smoke' },
      async ({ page, trackProgram }) => {
        const programName = uniqueProgramName('Web Development 2026');
        const description = 'Full-stack web development program';
        const programsPage = await createProgramViaUi(
          page,
          { name: programName, description },
          trackProgram,
        );

        await programsPage.openEditProgramForm(programName);
        await programsPage.editProgramModal.fillProgramName(
          uniqueProgramName('Web Development 2026 - Draft Change'),
        );
        await programsPage.editProgramModal.fillDescription('Unsaved draft description');
        await programsPage.editProgramModal.clickCancel();

        await expect(programsPage.editProgramModal.dialog).toBeHidden();
        await expect(programsPage.programEditButton(programName)).toBeVisible();
        await expect(programsPage.programRow(programName)).toContainText(description);
      },
    );
  });

  test.describe('Edge cases — edit save API', () => {
    const editSaveErrorStatuses = [400, 401, 403, 404, 422, 500, 501, 502] as const;

    for (const status of editSaveErrorStatuses) {
      test(
        `Edit save returns ${status} — dialog stays open with no in-dialog error copy`,
        { tag: '@edge' },
        async ({ page, trackProgram }) => {
          const programName = uniqueProgramName('Web Development 2026');
          const programsPage = await createProgramViaUi(
            page,
            { name: programName, description: `Description ${uniqueSuffix()}` },
            trackProgram,
          );

          await programsPage.openEditProgramForm(programName);

          const { messages, dispose } = collectPageErrors(page);
          try {
            await routeProgramUpdate(page, async (route) => {
              await fulfillJsonStatus(route, status, { message: `Error ${status}` });
            });

            await programsPage.editProgramModal.fillProgramName(
              uniqueProgramName('Web Development 2026 - Updated'),
            );
            await programsPage.editProgramModal.clickSave();

            await assertEditSaveApiErrorOutcome(programsPage, messages, status);
          } finally {
            dispose();
          }
        },
      );
    }

    test(
      'Edit save returns 503 — dialog stays open with no in-dialog error copy',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const programName = uniqueProgramName('Web Development 2026');
        const programsPage = await createProgramViaUi(
          page,
          { name: programName, description: `Description ${uniqueSuffix()}` },
          trackProgram,
        );

        await programsPage.openEditProgramForm(programName);

        const { messages, dispose } = collectPageErrors(page);
        try {
          await routeProgramUpdate(page, async (route) => {
            await fulfillJsonStatus(route, 503, { message: 'Service unavailable' });
          });

          await programsPage.editProgramModal.fillProgramName(
            uniqueProgramName('Web Development 2026 - Updated'),
          );
          await programsPage.editProgramModal.clickSave();

          await assertEditSaveApiErrorOutcome(programsPage, messages, 503);
        } finally {
          dispose();
        }
      },
    );

    test(
      'Edit save returns 200 with empty body — page shell remains usable (observed UI)',
      { tag: '@edge' },
      async ({ page, trackProgram }) => {
        const programName = uniqueProgramName('Web Development 2026');
        const programsPage = await createProgramViaUi(
          page,
          { name: programName, description: `Description ${uniqueSuffix()}` },
          trackProgram,
        );

        await programsPage.openEditProgramForm(programName);

        const { messages, dispose } = collectPageErrors(page);
        try {
          await routeProgramUpdate(page, async (route) => {
            await fulfillJsonStatus(route, 200, {});
          });

          await programsPage.editProgramModal.fillProgramName(
            uniqueProgramName('Web Development 2026 - Updated'),
          );
          await programsPage.editProgramModal.clickSave();

          await expect(programsPage.heading).toBeVisible();
          expect(
            messages.filter((message) => message.includes('Cannot read properties of')),
          ).toEqual([]);
        } finally {
          dispose();
        }
      },
    );
  });

  test.describe('Edge cases — programs list GET', () => {
    test(
      'Programs list GET 200 with empty data array shows empty-state copy',
      { tag: '@edge' },
      async ({ page }) => {
        await routeProgramsListGet(page, async (route) => {
          await fulfillJsonStatus(route, 200, { data: [] });
        });

        const programsPage = new ProgramsPage(page);
        await programsPage.goto();

        await expect(programsPage.heading).toBeVisible();
        await expect(programsPage.programsEmptyStateExact()).toBeVisible();
      },
    );

    test(
      'Programs list GET 200 with data null crashes list UI (observed)',
      { tag: '@edge' },
      async ({ page }) => {
        const { messages, dispose } = collectPageErrors(page);
        try {
          await routeProgramsListGet(page, async (route) => {
            await fulfillJsonStatus(route, 200, { data: null });
          });

          const programsPage = new ProgramsPage(page);
          await programsPage.goto();

          await expect
            .poll(() =>
              messages.some((message) =>
                message.includes("Cannot read properties of null (reading 'length')"),
              ),
            )
            .toBe(true);
          await expect(programsPage.heading).toBeHidden();
          await expect(programsPage.newProgramButton).toBeHidden();
        } finally {
          dispose();
        }
      },
    );

    const listErrorWithEmptyState = [404, 401, 403, 500] as const;

    for (const status of listErrorWithEmptyState) {
      test(
        `Programs list GET ${status} shows empty-state fallthrough and pageerror`,
        { tag: '@edge' },
        async ({ page }) => {
          const { messages, dispose } = collectPageErrors(page);
          try {
            await routeProgramsListGet(page, async (route) => {
              await fulfillJsonStatus(route, status, { message: `Error ${status}` });
            });

            const programsPage = new ProgramsPage(page);
            await programsPage.goto();

            await expect(programsPage.heading).toBeVisible();
            await expect(programsPage.programsEmptyStateExact()).toBeVisible();
            await expect
              .poll(() =>
                messages.some((message) =>
                  message.includes(`Request failed with status code ${status}`),
                ),
              )
              .toBe(true);

            if (status === 401) {
              await expect(page).not.toHaveURL(/\/login/);
            }
          } finally {
            dispose();
          }
        },
      );
    }

    const listErrorHeadingOnly = [400, 422, 409, 501, 502, 503] as const;

    for (const status of listErrorHeadingOnly) {
      test(
        `Programs list GET ${status} keeps Programs heading visible and records pageerror`,
        { tag: '@edge' },
        async ({ page }) => {
          const { messages, dispose } = collectPageErrors(page);
          try {
            await routeProgramsListGet(page, async (route) => {
              await fulfillJsonStatus(route, status, { message: `Error ${status}` });
            });

            const programsPage = new ProgramsPage(page);
            await programsPage.goto();

            await expect(programsPage.heading).toBeVisible();
            await expect
              .poll(() =>
                messages.some((message) =>
                  message.includes(`Request failed with status code ${status}`),
                ),
              )
              .toBe(true);
          } finally {
            dispose();
          }
        },
      );
    }

    test(
      'Programs list GET 204 crashes list UI (observed)',
      { tag: '@edge' },
      async ({ page }) => {
        const { messages, dispose } = collectPageErrors(page);
        try {
          await routeProgramsListGet(page, async (route) => {
            await route.fulfill({ status: 204, body: '' });
          });

          const programsPage = new ProgramsPage(page);
          await programsPage.goto();

          await expect
            .poll(() =>
              messages.some((message) =>
                message.includes("Cannot read properties of undefined (reading 'length')"),
              ),
            )
            .toBe(true);
          await expect(programsPage.heading).toBeHidden();
        } finally {
          dispose();
        }
      },
    );

    test(
      'Programs list GET 300 keeps a recoverable Programs shell (observed)',
      { tag: '@edge' },
      async ({ page }) => {
        await routeProgramsListGet(page, async (route) => {
          await route.fulfill({
            status: 300,
            contentType: 'application/json',
            body: JSON.stringify({ data: [] }),
          });
        });

        const programsPage = new ProgramsPage(page);
        await programsPage.goto();

        await expect(programsPage.heading).toBeVisible();
        await expect(programsPage.newProgramButton).toBeVisible();
      },
    );

    test(
      'Programs list GET 200 text/html crashes list UI (observed)',
      { tag: '@edge' },
      async ({ page }) => {
        const { messages, dispose } = collectPageErrors(page);
        try {
          await routeProgramsListGet(page, async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'text/html',
              body: '<html>ok</html>',
            });
          });

          const programsPage = new ProgramsPage(page);
          await programsPage.goto();

          await expect
            .poll(() =>
              messages.some((message) =>
                message.includes("Cannot read properties of undefined (reading 'length')"),
              ),
            )
            .toBe(true);
          await expect(programsPage.heading).toBeHidden();
        } finally {
          dispose();
        }
      },
    );
  });

  test.describe('Accessibility', () => {
    // If axe reports real violations here, fix the product — do not disable rules to go green.

    test(
      'Edit Program dialog has no wcag2a/wcag2aa axe violations when scoped to the dialog',
      { tag: '@a11y' },
      async ({ page, trackProgram }, testInfo) => {
        test.setTimeout(120_000);
        const programName = uniqueProgramName('Web Development 2026');
        const programsPage = await createProgramViaUi(
          page,
          { name: programName, description: `A11y edit modal ${uniqueSuffix()}` },
          trackProgram,
        );

        await programsPage.openEditProgramForm(programName);

        const modalInclude = await programsPage.editProgramModal.axeScanInclude();
        const results = await new AxeBuilder({ page })
          .withTags([...axeTags])
          .include(modalInclude)
          .analyze();

        await assertNoAxeViolations(results.violations, testInfo);
      },
    );

    test(
      'Keyboard opens Edit Program dialog from row edit control',
      { tag: '@a11y' },
      async ({ page, trackProgram }, testInfo) => {
        await runA11yCheckOrWarnInCi(testInfo, 'Keyboard accessibility', async () => {
          const programName = uniqueProgramName('Web Development 2026');
          const programsPage = await createProgramViaUi(
            page,
            { name: programName, description: `Keyboard edit ${uniqueSuffix()}` },
            trackProgram,
          );

          await programsPage.tabToEditProgramButton(programName);
          await expect(programsPage.programEditButton(programName)).toBeFocused();
          await page.keyboard.press('Enter');
          await expect(programsPage.editProgramModal.dialog).toBeVisible();
        });
      },
    );
  });
});
