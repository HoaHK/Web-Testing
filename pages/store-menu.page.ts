import type { Locator, Page } from '@playwright/test';
import { STORE } from '../fixtures/store-data';
import { ItemDetailDialog } from './item-detail.dialog';
import { OrderTypeDialog } from './order-type.dialog';
import { PickupTimeDialog } from './pickup-time.dialog';
import { waitForAction } from './process-request';

/** WEB-V03, plus the dialogs it opens on load. */
export class StoreMenuPage {
  readonly orderType: OrderTypeDialog;
  readonly pickupTime: PickupTimeDialog;
  readonly login: Locator;
  readonly banner: Locator;
  readonly storeName: Locator;
  readonly moreInfo: Locator;
  readonly changeLocation: Locator;
  readonly pickupMode: Locator;
  readonly deliveryMode: Locator;
  readonly search: Locator;
  readonly nextTabs: Locator;
  readonly itemCards: Locator;
  readonly itemCardNames: Locator;
  readonly emptyCart: Locator;
  readonly pickupUpdatedToast: Locator;

  constructor(private readonly page: Page) {
    this.orderType = new OrderTypeDialog(page);
    this.pickupTime = new PickupTimeDialog(page);
    this.login = page.getByRole('button', { name: 'Log in' });
    this.banner = page.locator('#banner-store-anchor');
    this.storeName = this.banner.getByRole('heading');
    this.moreInfo = page.getByRole('button', { name: 'More Info' });
    this.changeLocation = page.getByText('Change Location');
    // The mode radios have no accessible name; the wrapping label carries the text.
    this.pickupMode = page.locator('label', { hasText: /^Pickup$/ }).locator('input[type="radio"]');
    this.deliveryMode = page.locator('label', { hasText: /^Delivery$/ }).locator('input[type="radio"]');
    this.search = page.locator('#search_1');
    this.nextTabs = page.getByRole('button', { name: 'Next', exact: true });
    this.itemCards = page.locator('[id^="food_"]');
    this.itemCardNames = this.itemCards.locator('p.font-semibold');
    this.emptyCart = page.getByRole('heading', { name: 'Your cart is empty' });
    this.pickupUpdatedToast = page.getByRole('alert').filter({ hasText: 'Updated pickup time successfully!' });
  }

  async goto(): Promise<void> {
    await this.page.goto(STORE.path);
  }

  categoryTab(name: string): Locator {
    return this.page.getByRole('button', { name: `Choose ${name} tab`, exact: true });
  }

  categoryHeading(name: string): Locator {
    return this.page.getByRole('heading', { name: `${name} tab`, exact: true });
  }

  panel(deptId: number): Locator {
    return this.page.locator(`#panel_${deptId}`);
  }

  soldOut(deptId: number): Locator {
    return this.panel(deptId).getByRole('button', { name: 'Sold Out' });
  }

  itemCard(itemId: string): Locator {
    return this.page.locator(`[id="food_${itemId}"]`);
  }

  async choosePickup(): Promise<void> {
    await this.orderType.pickUp.click();
    await Promise.all([waitForAction(this.page, 'LoadTimeStore'), this.orderType.ok.click()]);
    await this.pickupTime.root.waitFor();
  }

  async confirmPickupTime(): Promise<void> {
    await this.pickupTime.confirm.click();
    await this.pickupTime.root.waitFor({ state: 'hidden' });
  }

  async openItem(itemId: string, itemName: string): Promise<ItemDetailDialog> {
    await Promise.all([
      waitForAction(this.page, 'LoadItemsDetail', { ids: itemId, app: 'pickup' }),
      this.itemCard(itemId).click(),
    ]);
    const dialog = new ItemDetailDialog(this.page, itemName);
    await dialog.root.waitFor();
    return dialog;
  }
}
