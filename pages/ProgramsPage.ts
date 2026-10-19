import type { Locator, Page } from '@playwright/test';
import { EditProgramModal } from './EditProgramModal';
import { NewProgramModal } from './NewProgramModal';

const PROGRAMS_PATH = '/programs';

export class ProgramsPage {
  readonly heading: Locator;
  readonly newProgramButton: Locator;
  readonly table: Locator;
  readonly newProgramModal: NewProgramModal;
  readonly editProgramModal: EditProgramModal;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Programs', level: 2 });
    this.newProgramButton = page.getByRole('button', { name: '+ New Program' });
    this.table = page.getByRole('table');
    this.newProgramModal = new NewProgramModal(page);
    this.editProgramModal = new EditProgramModal(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(PROGRAMS_PATH, { waitUntil: 'domcontentloaded' });
  }

  async gotoAndWaitForTable(retries = 3): Promise<void> {
    for (let attempt = 0; attempt < retries; attempt += 1) {
      if (attempt > 0) {
        await this.page.reload();
      } else {
        await this.goto();
      }
      await this.heading.waitFor({ state: 'visible' });
      await this.newProgramButton.waitFor({ state: 'visible' });
      try {
        await this.table.waitFor({ state: 'visible', timeout: 25_000 });
        return;
      } catch (error) {
        if (attempt === retries - 1) {
          throw error;
        }
      }
    }
  }

  async openNewProgramForm(): Promise<void> {
    await this.newProgramButton.scrollIntoViewIfNeeded();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await this.newProgramButton.click();
      try {
        await this.newProgramModal.dialog.waitFor({ state: 'visible', timeout: 15_000 });
        break;
      } catch (error) {
        if (attempt === 2) {
          throw error;
        }
      }
    }

    await this.newProgramModal.programNameField.waitFor({ state: 'visible' });
  }

  async createProgram(options: { name: string; description?: string }): Promise<void> {
    await this.newProgramModal.fill(options);
    await this.newProgramModal.clickCreate();
  }

  async openEditProgramForm(programName: string): Promise<void> {
    const editButton = this.programEditButton(programName);
    await editButton.scrollIntoViewIfNeeded();
    await editButton.click();
    await this.editProgramModal.dialog.waitFor({ state: 'visible' });
  }

  async dismissEditModalIfOpen(): Promise<void> {
    if (!(await this.editProgramModal.dialog.isVisible())) {
      return;
    }
    try {
      await this.editProgramModal.pressEscape();
      await this.editProgramModal.dialog.waitFor({ state: 'hidden' });
    } catch {
      await this.editProgramModal.dialog.waitFor({ state: 'hidden' });
    }
  }

  programRow(name: string): Locator {
    return this.table.getByRole('row').filter({ hasText: name });
  }

  rowContaining(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }

  programEditButton(name: string): Locator {
    return this.page.getByRole('button', { name: `Edit ${name}`, exact: true });
  }

  programDeleteButton(name: string): Locator {
    return this.page.getByRole('button', { name: `Delete ${name}`, exact: true });
  }

  anyEditButton(): Locator {
    return this.page.getByRole('button', { name: /^Edit / });
  }

  descriptionCellForProgram(name: string): Locator {
    return this.programRow(name).getByRole('cell').nth(1);
  }

  tableRows(): Locator {
    return this.table.getByRole('row');
  }

  emptyStateText(): Locator {
    return this.page.getByText(
      /no programs yet|haven't created any programs|no programs have been created|no programs found/i,
    );
  }

  noProgramsYetText(): Locator {
    return this.page.getByText(/No programs yet/i);
  }

  paginationOrPageControls(): Locator {
    return this.page
      .getByRole('navigation')
      .or(this.page.getByRole('button', { name: /next|page/i }));
  }

  accessDeniedText(): Locator {
    return this.page.getByText(
      /access denied|forbidden|not authorized|unauthorized|permission/i,
    );
  }

  async programRowIndex(programName: string): Promise<number> {
    const rows = this.tableRows();
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      const editInRow = rows.nth(i).getByRole('button', { name: `Edit ${programName}`, exact: true });
      if ((await editInRow.count()) > 0) {
        return i;
      }
    }
    return -1;
  }
}
