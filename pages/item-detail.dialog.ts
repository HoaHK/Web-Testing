import type { Locator, Page } from '@playwright/test';

/** WEB-V04 */
export class ItemDetailDialog {
  readonly root: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  readonly back: Locator;
  readonly addOns: Locator;
  readonly quantity: Locator;
  readonly decrease: Locator;
  readonly increase: Locator;
  readonly addToCart: Locator;

  constructor(page: Page, itemName: string) {
    this.root = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: itemName, exact: true }) });
    this.heading = this.root.getByRole('heading', { name: itemName, exact: true });
    // Close (top-right) has no accessible name; only its position class identifies it.
    this.close = this.root.locator('button.mat-mdc-icon-button[class*="!right-3"]');
    this.back = this.root.getByRole('button', { name: 'Back', exact: true });
    this.addOns = this.root.getByRole('button', { name: 'Add-Ons' });
    this.quantity = this.root.getByRole('textbox', { name: 'quantity' });
    this.decrease = this.root.getByRole('button', { name: 'decrease quantity' });
    this.increase = this.root.getByRole('button', { name: 'increase quantity' });
    this.addToCart = this.root.getByRole('button', { name: /^Add to cart/ });
  }
}
