import type { Locator, Page } from '@playwright/test';

/** WEB-V01. The container has no role="dialog", so it is matched by its heading text. */
export class OrderTypeDialog {
  readonly root: Locator;
  readonly heading: Locator;
  readonly pickUp: Locator;
  readonly delivery: Locator;
  readonly ok: Locator;
  readonly deliveryAddress: Locator;

  constructor(page: Page) {
    this.root = page.locator('mat-dialog-container').filter({ hasText: 'Choose Order Type' });
    this.heading = this.root.getByRole('heading', { name: 'Choose Order Type' });
    this.pickUp = this.root.getByRole('button', { name: 'PICK UP' });
    this.delivery = this.root.getByRole('button', { name: 'DELIVERY' });
    this.ok = this.root.getByRole('button', { name: 'OK' });
    // Opened by DELIVERY -> OK.
    this.deliveryAddress = page.locator('mat-dialog-container').filter({ hasText: 'Enter Your Delivery Address' });
  }
}
