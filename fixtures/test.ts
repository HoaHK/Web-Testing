import { test as base, expect, type Page } from '@playwright/test';
import { STORE, ITEM } from './store-data';
import { StoreMenuPage } from '../pages/store-menu.page';
import { CardDialog, CartPanel, ConfirmPickupDialog, PlaceOrderPage, YourOrderPage } from '../pages/checkout.page';
import { PROCESS_REQUEST_PATH, waitForAction } from '../pages/process-request';

/** AGENTS.md section 2 rule 4: actions that create an order or move money. */
export function isMutatingAction(action: string): boolean {
  return action.startsWith('SubmitTicket') || ['UpdateCartData', 'ProcessMobilePay', 'CheckSaleReceiptAccepted'].includes(action);
}

export type CheckoutFlow = {
  cart: CartPanel;
  yourOrder: YourOrderPage;
  confirmPickup: ConfirmPickupDialog;
  placeOrder: PlaceOrderPage;
  card: CardDialog;
};

type PageFixtures = {
  /** Store page freshly loaded; the order type dialog is open. */
  storeMenu: StoreMenuPage;
  /** Store page with Pickup chosen and the default pickup time confirmed. */
  pickupMenu: StoreMenuPage;
  /** Aborts every mutating request and payment-gateway POST; holds the targetActions it blocked. */
  mutationGuard: string[];
  /** Pickup menu with ITEM in the cart, behind the mutation guard. */
  checkout: CheckoutFlow;
};

export const test = base.extend<PageFixtures>({
  storeMenu: async ({ page }, use) => {
    const storeMenu = new StoreMenuPage(page);
    await storeMenu.goto();
    await use(storeMenu);
  },
  pickupMenu: async ({ storeMenu }, use) => {
    await storeMenu.choosePickup();
    await storeMenu.confirmPickupTime();
    await use(storeMenu);
  },
  mutationGuard: async ({ page }, use) => {
    const blocked: string[] = [];
    await page.route(`**${PROCESS_REQUEST_PATH}`, async (route) => {
      const action = new URLSearchParams(route.request().postData() ?? '').get('targetAction') ?? '';
      // Fail closed: a body whose targetAction cannot be read is treated as mutating.
      if (!action || isMutatingAction(action)) {
        blocked.push(action || `unreadable ${route.request().method()}`);
        await route.abort();
      } else {
        await route.fallback();
      }
    });
    await page.route(/authorize\.net/, async (route) => {
      if (route.request().method() === 'GET') return route.fallback();
      blocked.push(`gateway ${route.request().method()} ${route.request().url()}`);
      await route.abort();
    });
    await use(blocked);
  },
  checkout: async ({ page, mutationGuard: _guard, pickupMenu }, use) => {
    const item = await pickupMenu.openItem(ITEM.id, ITEM.name);
    await item.addToCart.click();
    await item.root.waitFor({ state: 'hidden' });
    await use({
      cart: new CartPanel(page),
      yourOrder: new YourOrderPage(page),
      confirmPickup: new ConfirmPickupDialog(page),
      placeOrder: new PlaceOrderPage(page),
      card: new CardDialog(page),
    });
  },
});

/** WEB-V05 -> V06 -> V07 -> V08: cart Checkout through Continue, ending on the place-order page. */
export async function goToPlaceOrder(page: Page, flow: CheckoutFlow): Promise<void> {
  await flow.cart.checkout.click();
  await expect(page).toHaveURL(new RegExp(`${STORE.path}/check-out$`));
  await expect(flow.yourOrder.checkout).toBeEnabled();
  await flow.yourOrder.checkout.click();
  await expect(flow.confirmPickup.root).toBeVisible();
  await Promise.all([waitForAction(page, 'LoadTimePriceDetails'), flow.confirmPickup.continue.click()]);
  await expect(page).toHaveURL(new RegExp(`${STORE.path}/place-order$`));
}

export { expect };
