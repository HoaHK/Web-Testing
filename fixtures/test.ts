import { test as base, expect } from '@playwright/test';
import { StoreMenuPage } from '../pages/store-menu.page';

type PageFixtures = {
  /** Store page freshly loaded; the order type dialog is open. */
  storeMenu: StoreMenuPage;
  /** Store page with Pickup chosen and the default pickup time confirmed. */
  pickupMenu: StoreMenuPage;
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
});

export { expect };
