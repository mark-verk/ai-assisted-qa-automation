import type { Locator, Page } from '@playwright/test';

export class NewProgramModal {
  readonly dialog: Locator;
  readonly programNameField: Locator;
  readonly descriptionField: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  readonly headerCloseButton: Locator;
  readonly totalProgramHoursLabel: Locator;
  readonly aiGenerationConfigToggle: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'New Program' });
    this.programNameField = this.dialog.getByLabel('Program Name');
    this.descriptionField = this.dialog.getByLabel('Description');
    this.createButton = this.dialog.getByRole('button', { name: 'Create' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.headerCloseButton = this.dialog.getByRole('banner').getByRole('button');
    this.totalProgramHoursLabel = this.dialog.getByText('Total Program Hours');
    this.aiGenerationConfigToggle = this.dialog.getByRole('button', {
      name: /Show AI Generation Config|Hide AI Generation Config/i,
    });
  }

  async fill(options: { name: string; description?: string }): Promise<void> {
    await this.programNameField.fill(options.name);
    if (options.description !== undefined) {
      await this.descriptionField.fill(options.description);
    }
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
