import type { Locator, Page } from '@playwright/test';

export class EditProgramModal {
  readonly dialog: Locator;
  readonly programNameField: Locator;
  readonly descriptionField: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly alert: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Edit Program' });
    this.programNameField = this.dialog.getByLabel('Program Name');
    this.descriptionField = this.dialog.getByLabel('Description');
    this.saveButton = this.dialog.getByRole('button', { name: 'Save' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.alert = this.dialog.getByRole('alert');
  }

  async fillProgramName(name: string): Promise<void> {
    await this.programNameField.fill(name);
  }

  async fillDescription(description: string): Promise<void> {
    await this.descriptionField.fill(description);
  }

  async clickSave(): Promise<void> {
    await this.saveButton.click();
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
