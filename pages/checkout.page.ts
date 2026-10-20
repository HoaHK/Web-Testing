import type { Locator, Page } from '@playwright/test';

/** WEB-V05. Scoped to the sidebar so quantity controls do not collide with the item dialog's. */
export class CartPanel {
  readonly root: Locator;
  readonly lines: Locator;
  readonly checkout: Locator;

  constructor(page: Page) {
    this.root = page.locator('bls-cart-sidebar');
    this.lines = this.root.getByRole('button', { name: /^\d+ x / });
    this.checkout = this.root.getByRole('button', { name: /^Checkout \$/ });
  }
}

/** WEB-V06 `/check-out` ("Your Order"). */
export class YourOrderPage {
  readonly heading: Locator;
  readonly backToMenu: Locator;
  readonly pickupInformation: Locator;
  readonly orderSummary: Locator;
  readonly checkout: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Your Order', level: 1 });
    this.backToMenu = page.getByRole('button', { name: 'Back to Menu' });
    this.pickupInformation = page.getByText('PICKUP INFORMATION');
    this.orderSummary = page.getByText('ORDER SUMMARY');
    this.checkout = page.getByRole('button', { name: 'Checkout', exact: true });
  }
}

/** WEB-V07. The container has no role="dialog", so it is matched by its text. */
export class ConfirmPickupDialog {
  readonly root: Locator;
  readonly pickupMode: Locator;
  readonly cancel: Locator;
  readonly continue: Locator;

  constructor(page: Page) {
    this.root = page.locator('mat-dialog-container').filter({ hasText: 'Please Confirm Your Pickup Order Details' });
    this.pickupMode = this.root.locator('label', { hasText: /^Pickup$/ }).locator('input[type="radio"]');
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.continue = this.root.getByRole('button', { name: 'Continue' });
  }
}

/** WEB-V08 `/place-order` ("Check Out"). */
export class PlaceOrderPage {
  readonly heading: Locator;
  readonly name: Locator;
  readonly phone: Locator;
  readonly email: Locator;
  readonly placeOrder: Locator;
  readonly requiredFieldsToast: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Check Out', level: 1 });
    this.name = page.locator('[formcontrolname="contractName"]');
    this.phone = page.locator('[formcontrolname="contractPhoneNumber"]');
    this.email = page.locator('[formcontrolname="contractEmail"]');
    this.placeOrder = page.getByRole('button', { name: /^Place Order/ });
    this.requiredFieldsToast = page.getByRole('alert').filter({ hasText: 'Please complete all required fields.' });
  }

  async fillContact(contact: { name: string; phone: string; email: string }): Promise<void> {
    await this.name.fill(contact.name);
    // The phone input is masked XXX-XXX-XXXX, so type digits only.
    await this.phone.pressSequentially(contact.phone.replace(/\D/g, ''));
    await this.email.fill(contact.email);
  }
}

/** WEB-V09. Pay is MUTATING: only click it behind the mutation guard (fixtures/test.ts). */
export class CardDialog {
  readonly root: Locator;
  readonly close: Locator;
  readonly cardName: Locator;
  readonly cardNumber: Locator;
  readonly expiry: Locator;
  readonly cvv: Locator;
  readonly zip: Locator;
  readonly errors: Locator;
  readonly pay: Locator;

  constructor(page: Page) {
    this.root = page.locator('mat-dialog-container').filter({ hasText: 'Enter Credit Card Information' });
    this.close = this.root.getByRole('button', { name: 'Close dialog' });
    this.cardName = this.root.locator('[formcontrolname="cardName"]');
    this.cardNumber = this.root.locator('[formcontrolname="cardNumber"]');
    this.expiry = this.root.locator('[formcontrolname="cardExpiry"]');
    this.cvv = this.root.locator('[formcontrolname="cardCvv"]');
    this.zip = this.root.locator('[formcontrolname="cardZipCode"]');
    this.errors = this.root.locator('mat-error');
    this.pay = this.root.getByRole('button', { name: /^Pay \$/ });
  }
}
