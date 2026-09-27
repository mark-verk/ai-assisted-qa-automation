import { test, expect, type Page } from '@playwright/test';

const TODO_MVC_URL = 'https://demo.playwright.dev/todomvc/';

async function openFreshTodoApp(page: Page) {
  await page.goto(TODO_MVC_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible();
}

async function addTodo(page: Page, title: string) {
  const newTodo = page.getByPlaceholder('What needs to be done?');
  await newTodo.fill(title);
  await newTodo.press('Enter');
}

function todoItem(page: Page, title: string, index = 0) {
  return page
    .locator('.todo-list li')
    .filter({ has: page.locator('label', { hasText: title }) })
    .nth(index);
}

function todoLabels(page: Page) {
  return page.locator('.todo-list li label');
}

async function deleteTodo(page: Page, title: string, index = 0) {
  const item = todoItem(page, title, index);
  await item.locator('.destroy').click({ force: true });
}

test.describe('TodoMVC — Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    await openFreshTodoApp(page);
  });

  test('TC-001: New todo appears in the list after submitting valid text', async ({ page }) => {
    await addTodo(page, 'Buy groceries');

    await expect(page.locator('.todo-list li')).toHaveCount(1);
    await expect(todoLabels(page)).toHaveText(['Buy groceries']);
    await expect(page.getByPlaceholder('What needs to be done?')).toHaveValue('');
    await expect(page.locator('.todo-count')).toContainText('1 item left');
  });

  test('TC-002: Todo is marked completed when Toggle Todo is checked', async ({ page }) => {
    await addTodo(page, 'Walk the dog');

    const item = todoItem(page, 'Walk the dog');
    await item.getByRole('checkbox', { name: 'Toggle Todo' }).check();

    await expect(item).toHaveClass(/completed/);
    await expect(page.locator('.todo-count')).toContainText('0 items left');
    await expect(page.locator('.todo-list li')).toHaveCount(1);
  });

  test('TC-003: Todo is removed from the list after delete', async ({ page }) => {
    await addTodo(page, 'Pay electricity bill');

    await deleteTodo(page, 'Pay electricity bill');

    await expect(page.locator('.todo-list li')).toHaveCount(0);
  });

  test('TC-004: Multiple todos are all visible with correct count', async ({ page }) => {
    await addTodo(page, 'Buy groceries');
    await addTodo(page, 'Walk the dog');
    await addTodo(page, 'Pay electricity bill');

    await expect(page.locator('.todo-list li')).toHaveCount(3);
    await expect(page.locator('.todo-count')).toContainText('3 items left');
  });
});

test.describe('TodoMVC — Negative flows', () => {
  test.beforeEach(async ({ page }) => {
    await openFreshTodoApp(page);
  });

  test('TC-005: Empty input does not create a todo', async ({ page }) => {
    await page.getByPlaceholder('What needs to be done?').press('Enter');

    await expect(page.locator('.todo-list li')).toHaveCount(0);
  });

  test('TC-006: Whitespace-only input does not add a todo', async ({ page }) => {
    await addTodo(page, '     ');

    await expect(page.locator('.todo-list li')).toHaveCount(0);
  });

  test('TC-007: Completing a todo does not remove it from the All list', async ({ page }) => {
    await addTodo(page, 'Read Playwright docs');

    const item = todoItem(page, 'Read Playwright docs');
    await item.getByRole('checkbox', { name: 'Toggle Todo' }).check();

    await page.getByRole('link', { name: 'All' }).click();
    await expect(page.locator('.todo-list li')).toHaveCount(1);
    await expect(item).toHaveClass(/completed/);
  });

  test('TC-008: Deleting one todo leaves other todos unchanged', async ({ page }) => {
    await addTodo(page, 'Buy groceries');
    await addTodo(page, 'Walk the dog');

    await deleteTodo(page, 'Buy groceries');

    await expect(page.locator('.todo-list li')).toHaveCount(1);
    await expect(todoLabels(page)).toHaveText(['Walk the dog']);
    await expect(page.locator('.todo-count')).toContainText('1 item left');
  });
});

test.describe('TodoMVC — Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await openFreshTodoApp(page);
  });

  test('TC-009: Special characters in todo text display correctly', async ({ page }) => {
    const title = 'Buy milk & eggs — 50% off (today only)!';
    await addTodo(page, title);

    await expect(todoLabels(page)).toHaveText([title]);
  });

  test('TC-010: Duplicate titles create separate list items', async ({ page }) => {
    await addTodo(page, 'Buy groceries');
    await addTodo(page, 'Buy groceries');

    await expect(page.locator('.todo-list li')).toHaveCount(2);
    await expect(page.locator('.todo-count')).toContainText('2 items left');
  });

  test('TC-011: Very long todo text is added without breaking the list', async ({ page }) => {
    const longTitle = 'Plan quarterly release checklist '.repeat(6).trim();
    await addTodo(page, longTitle);

    const item = page.locator('.todo-list li').first();
    await expect(item).toBeVisible();
    await expect(item).toContainText('Plan quarterly release checklist');
  });

  test('TC-012: Complete then delete the only todo clears the list', async ({ page }) => {
    await addTodo(page, 'Temporary task');

    const item = todoItem(page, 'Temporary task');
    await item.getByRole('checkbox', { name: 'Toggle Todo' }).check();
    await deleteTodo(page, 'Temporary task');

    await expect(page.locator('.todo-list li')).toHaveCount(0);
  });

  test('TC-013: New todo can be added immediately after deleting another', async ({ page }) => {
    await addTodo(page, 'Old task');
    await deleteTodo(page, 'Old task');
    await addTodo(page, 'New task');

    await expect(page.locator('.todo-list li')).toHaveCount(1);
    await expect(todoLabels(page)).toHaveText(['New task']);
    await expect(page.locator('.todo-count')).toContainText('1 item left');
  });
});
