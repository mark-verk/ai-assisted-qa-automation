import type { Locator, Page } from '@playwright/test';

export class NewSemesterModal {
  readonly dialog: Locator;
  readonly semesterNameField: Locator;
  readonly startDateField: Locator;
  readonly endDateField: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'New Semester' });
    this.semesterNameField = this.dialog.getByLabel('Semester Name');
    this.startDateField = this.dialog.getByLabel('Start Date');
    this.endDateField = this.dialog.getByLabel('End Date');
    this.createButton = this.dialog.getByRole('button', { name: 'Create Semester' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
  }

  async fill(options: {
    name: string;
    startDate: string;
    endDate: string;
  }): Promise<void> {
    await this.semesterNameField.fill(options.name);
    await this.startDateField.fill(options.startDate);
    await this.endDateField.fill(options.endDate);
  }

  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /** Resolves a DOM selector for axe `.include()` while interactions stay role/label-based. */
  async axeScanInclude(): Promise<string> {
    await this.dialog.waitFor({ state: 'visible' });
    const id = await this.dialog.getAttribute('id');
    if (id) {
      return `#${CSS.escape(id)}`;
    }
    return '[role="dialog"]';
  }
}
