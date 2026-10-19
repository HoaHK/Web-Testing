import type { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly learnMoreLink: Locator;

  constructor(private readonly page: Page) {
    this.learnMoreLink = page.getByRole('link', { name: 'Learn more' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }
}
