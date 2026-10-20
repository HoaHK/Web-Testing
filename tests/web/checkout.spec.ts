import { test, expect, goToPlaceOrder } from '../../fixtures/test';
import { CARDS, CUSTOMER } from '../../fixtures/payment-data';
import { STORE } from '../../fixtures/store-data';
import { waitForAction } from '../../pages/process-request';

// PB-02: the staging API stalls under parallel page loads for the same store.
test.describe.configure({ mode: 'default' });

/** Card numbers are auto-formatted with spaces, so match the digits with optional separators. */
function digitsPattern(digits: string): RegExp {
  return new RegExp(`^${digits.split('').join('\\s?')}$`);
}

function contact() {
  return { name: CUSTOMER.name, phone: CUSTOMER.phone, email: CUSTOMER.email };
}

test.describe('WEB-V05..V08 Checkout flow', () => {
  test('cart Checkout loads prices and opens Your Order with pickup info and summary', async ({ page, checkout }) => {
    await expect(checkout.cart.lines).toHaveCount(1);
    await expect(checkout.cart.checkout).toHaveText(/^Checkout\s*\$15\.00$/);

    await Promise.all([waitForAction(page, 'LoadTimePriceDetails'), checkout.cart.checkout.click()]);

    await expect(page).toHaveURL(new RegExp(`${STORE.path}/check-out$`));
    await expect(checkout.yourOrder.heading).toBeVisible();
    await expect(checkout.yourOrder.pickupInformation).toBeVisible();
    await expect(checkout.yourOrder.orderSummary).toBeVisible();
    await expect(checkout.yourOrder.checkout).toBeEnabled();
  });

  test('Checkout opens the pickup confirmation with Pickup selected and Cancel closes it', async ({ page, checkout }) => {
    await checkout.cart.checkout.click();
    await expect(checkout.yourOrder.checkout).toBeEnabled();

    await checkout.yourOrder.checkout.click();
    await expect(checkout.confirmPickup.root).toBeVisible();
    await expect(checkout.confirmPickup.pickupMode).toBeChecked();

    await checkout.confirmPickup.cancel.click();
    await expect(checkout.confirmPickup.root).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${STORE.path}/check-out$`));
  });

  test('Place Order without Email shows the required-fields toast and no card dialog', async ({ page, checkout, mutationGuard }) => {
    await goToPlaceOrder(page, checkout);
    const { placeOrder, card } = checkout;
    await expect(placeOrder.heading).toBeVisible();

    await placeOrder.fillContact({ ...contact(), email: '' });
    await expect(placeOrder.phone).toHaveValue(CUSTOMER.phone);

    await placeOrder.placeOrder.click();

    await expect(placeOrder.requiredFieldsToast).toBeVisible();
    await expect(card.root).toBeHidden();
    expect(mutationGuard).toEqual([]);
  });

  test('Place Order with full contact info opens the card dialog at the same total', async ({ page, checkout, mutationGuard }) => {
    await goToPlaceOrder(page, checkout);
    const { placeOrder, card } = checkout;
    await placeOrder.fillContact(contact());

    // The price renders after LoadTimePriceDetails; wait for it before reading.
    await expect(placeOrder.placeOrder).toHaveText(/\$\d+\.\d{2}$/);
    const total = (await placeOrder.placeOrder.innerText()).match(/\$\d+\.\d{2}/)![0];
    await placeOrder.placeOrder.click();

    await expect(card.root).toBeVisible();
    await expect(card.pay).toHaveText(new RegExp(`^Pay\\s*\\${total}$`));
    expect(mutationGuard).toEqual([]);
  });
});

test.describe('WEB-V09 Card dialog (Pay is intercepted: no order is created)', () => {
  // Full checkout per test; PB-02 stalls have delayed UpdateCartData by ~17s after Pay.
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page, checkout }) => {
    await goToPlaceOrder(page, checkout);
    await checkout.placeOrder.fillContact(contact());
    await checkout.placeOrder.placeOrder.click();
    await expect(checkout.card.root).toBeVisible();
  });

  test('empty form shows 5 required errors and does not submit', async ({ checkout, mutationGuard }) => {
    await checkout.card.pay.click();

    await expect(checkout.card.errors).toHaveCount(5);
    await expect(checkout.card.errors).toHaveText(Array(5).fill('This field is required'));
    await expect(checkout.card.root).toBeVisible();
    expect(mutationGuard).toEqual([]);
  });

  for (const testCard of CARDS) {
    test(`${testCard.brand}: valid card + Pay checks the invoice, then sends UpdateCartData`, async ({ page, checkout, mutationGuard }) => {
      const { card } = checkout;
      await card.cardName.fill(CUSTOMER.name);
      await card.cardNumber.pressSequentially(testCard.number);
      await card.expiry.pressSequentially(testCard.expiry);
      await card.cvv.fill(testCard.cvv);
      await card.zip.fill(CUSTOMER.zip);

      await expect(card.cardNumber).toHaveValue(digitsPattern(testCard.number));
      await expect(card.expiry).toHaveValue(testCard.expiry);
      await expect(card.errors).toHaveCount(0);

      const [checkTicket, payment] = await Promise.all([
        waitForAction(page, 'CheckTicketByInvoiceNumber'),
        waitForAction(page, 'UpdateCartData'),
        card.pay.click(),
      ]);

      // Read-only pre-check: the client-generated invoice number has no ticket yet.
      const invoice = JSON.parse(new URLSearchParams(checkTicket.postData() ?? '').get('param') ?? '{}');
      expect(invoice.Params?.[0]?.InvoiceNo).toMatch(/^\d+$/);
      // The payment param is encrypted client-side, so only its presence can be checked.
      expect(new URLSearchParams(payment.postData() ?? '').get('param')).toBeTruthy();
      await expect.poll(() => mutationGuard).toEqual(['UpdateCartData']);
      // The aborted payment surfaces as a failure toast; the dialog stays open.
      await expect(page.getByRole('alert').filter({ hasText: 'Unable to process payment' })).toBeVisible();
      await expect(card.root).toBeVisible();
    });
  }
});
