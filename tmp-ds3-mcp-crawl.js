async (page) => {
  const fs = require('fs');
  const path = require('path');
  const authPath = path.join(process.cwd(), 'playwright', '.auth', 'user.json');
  const state = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  const context = page.context();
  if (state.cookies?.length) {
    await context.addCookies(state.cookies);
  }
  await page.goto('https://test.didaxis.studio/programs');
  if (state.origins?.length) {
    for (const origin of state.origins) {
      if (!origin.localStorage?.length) continue;
      await page.evaluate((items) => {
        for (const { name, value } of items) localStorage.setItem(name, value);
      }, origin.localStorage);
    }
    await page.goto('https://test.didaxis.studio/programs');
  }

  await page.getByRole('heading', { name: 'Programs', level: 2 }).waitFor({ timeout: 30000 });
  const out = { url: page.url(), steps: [] };
  out.steps.push({
    label: 'programs-list',
    aria: await page.locator('body').ariaSnapshot({ timeout: 5000 }).catch(async () => {
      return (await page.accessibility.snapshot()) ? 'a11y-snapshot-ok' : 'none';
    }),
  });

  await page.getByRole('button', { name: '+ New Program' }).click();
  const dialog = page.getByRole('dialog', { name: 'New Program' });
  await dialog.waitFor({ state: 'visible', timeout: 15000 });

  const name = dialog.getByLabel('Program Name');
  const create = dialog.getByRole('button', { name: 'Create' });
  const desc = dialog.getByLabel('Description');

  out.steps.push({
    label: 'new-program-modal',
    fields: {
      programName: await name.getAttribute('aria-label') || 'Program Name',
      description: await desc.getAttribute('aria-label') || 'Description',
      createDisabled: await create.isDisabled(),
      createEnabled: await create.isEnabled(),
      cancelVisible: await dialog.getByRole('button', { name: 'Cancel' }).isVisible(),
    },
    dialogText: (await dialog.innerText()).slice(0, 3000),
  });

  await name.fill('   ');
  out.steps.push({
    label: 'whitespace-only',
    nameValue: await name.inputValue(),
    createDisabled: await create.isDisabled(),
    alertCount: await dialog.getByRole('alert').count(),
  });

  const firstEdit = page.getByRole('button', { name: /^Edit / }).first();
  let existingName = null;
  if (await firstEdit.count()) {
    const aria = await firstEdit.getAttribute('aria-label');
    existingName = aria ? aria.replace(/^Edit\s+/, '') : null;
  }

  if (existingName) {
    await name.fill(existingName);
    await desc.fill('Duplicate coverage crawl');
    const [resp] = await Promise.all([
      page
        .waitForResponse(
          (r) => r.url().includes('/api/programs') && r.request().method() === 'POST',
          { timeout: 20000 },
        )
        .catch(() => null),
      create.click(),
    ]);
    await page.waitForTimeout(1200);
    out.steps.push({
      label: 'duplicate-attempt',
      existingName,
      status: resp ? resp.status() : null,
      body: resp ? (await resp.text()).slice(0, 800) : null,
      alertTexts: await dialog.getByRole('alert').allInnerTexts(),
      dialogStillOpen: await dialog.isVisible(),
      dialogText: (await dialog.innerText()).slice(0, 2500),
      duplicateHintCount: await dialog
        .getByText(
          /already exists|name already|duplicate|program with this name|must be unique|already been taken/i,
        )
        .count(),
    });
  }

  // Observe 503 UI copy via route mock (read-only observation; do not leave route on)
  if (await dialog.isVisible()) {
    await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {});
  }

  await page.route('**/api/programs', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Service unavailable' }),
    });
  });

  await page.getByRole('button', { name: '+ New Program' }).click().catch(async () => {
    /* modal may already be open */
  });
  if (!(await dialog.isVisible())) {
    await page.getByRole('button', { name: '+ New Program' }).click();
    await dialog.waitFor({ state: 'visible' });
  }
  await name.fill(`DS3 Crawl 503 ${Date.now()}`);
  await desc.fill('503 observation');
  await create.click();
  await page.waitForTimeout(1200);
  out.steps.push({
    label: 'save-503-observation',
    dialogStillOpen: await dialog.isVisible(),
    alertTexts: await dialog.getByRole('alert').allInnerTexts(),
    dialogText: (await dialog.innerText()).slice(0, 2500),
    bodyTextSample: (await page.locator('body').innerText()).slice(0, 1500),
  });
  await page.unroute('**/api/programs');

  fs.writeFileSync(path.join(process.cwd(), 'tmp-ds3-crawl.json'), JSON.stringify(out, null, 2));
  return { wrote: 'tmp-ds3-crawl.json', url: page.url(), stepCount: out.steps.length };
}
