import { test, expect } from '../../fixtures/test';
import { CATEGORIES, ITEM, SOLD_OUT_DEPT_IDS, STORE } from '../../fixtures/store-data';
import { resultOf, waitForAction, waitForActionResponse, type Envelope, type MenuDepartment } from '../../pages/process-request';

const SELECTED = /!bg-primary/;

// PB-02: the staging API stalls when several page loads for the same store start at once,
// so this file's tests run one after another in a single worker.
test.describe.configure({ mode: 'default' });

test.describe('WEB-V01 Order Type dialog', () => {
  test('opens on load with PICK UP, DELIVERY and OK', async ({ storeMenu }) => {
    const { orderType } = storeMenu;
    await expect(orderType.root).toBeVisible();
    await expect(orderType.heading).toBeVisible();
    await expect(orderType.pickUp).toBeVisible();
    await expect(orderType.delivery).toBeVisible();
    await expect(orderType.ok).toBeVisible();
  });

  test('PICK UP + OK loads store times and opens the pickup time dialog', async ({ page, storeMenu }) => {
    const { orderType, pickupTime } = storeMenu;
    await orderType.pickUp.click();
    await expect(orderType.pickUp).toHaveClass(SELECTED);
    await expect(orderType.delivery).not.toHaveClass(SELECTED);

    await Promise.all([waitForAction(page, 'LoadTimeStore'), orderType.ok.click()]);

    await expect(orderType.root).toBeHidden();
    await expect(pickupTime.root).toBeVisible();
    await expect(pickupTime.heading).toBeVisible();
  });

  test('DELIVERY + OK loads store times and opens the delivery address dialog', async ({ page, storeMenu }) => {
    const { orderType } = storeMenu;
    await orderType.delivery.click();
    await expect(orderType.delivery).toHaveClass(SELECTED);
    await expect(orderType.pickUp).not.toHaveClass(SELECTED);

    await Promise.all([waitForAction(page, 'LoadTimeStore'), orderType.ok.click()]);

    await expect(orderType.root).toBeHidden();
    await expect(orderType.deliveryAddress).toBeVisible();
    await expect(orderType.deliveryAddress.getByRole('button', { name: 'Next' })).toBeVisible();
  });
});

test.describe('WEB-V02 Pickup time dialog', () => {
  test.beforeEach(async ({ storeMenu }) => {
    await storeMenu.choosePickup();
    await expect(storeMenu.pickupTime.root).toBeVisible();
  });

  test('defaults the pickup date to today', async ({ page, storeMenu }) => {
    const today = await page.evaluate(() =>
      new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    );
    await expect(storeMenu.pickupTime.date).toHaveValue(today);
  });

  test('calendar opens on today and closes after picking a date', async ({ storeMenu }) => {
    const { pickupTime } = storeMenu;
    const before = await pickupTime.date.inputValue();

    await pickupTime.openCalendar.click();
    await expect(pickupTime.calendar).toBeVisible();
    await expect(pickupTime.calendarToday).toHaveAttribute('aria-pressed', 'true');

    await pickupTime.calendarToday.click();
    await expect(pickupTime.calendar).toBeHidden();
    await expect(pickupTime.date).toHaveValue(before);
    await expect(pickupTime.root).toBeVisible();
  });

  test('selected time slot is shown on the confirm button', async ({ storeMenu }) => {
    const { pickupTime } = storeMenu;
    await pickupTime.time.click();
    await expect(pickupTime.timeOptions.first()).toBeVisible();

    const option = pickupTime.timeOptions.last();
    const label = (await option.innerText()).trim(); // e.g. "11:55 PM"
    await option.click();

    await expect(pickupTime.timeOptions).toHaveCount(0);
    await expect(pickupTime.time).toHaveText(label);
    await expect(pickupTime.confirm).toContainText(label.replace(/^0/, ''));
  });

  test('confirm closes the dialog, shows a toast and selects Pickup mode', async ({ storeMenu }) => {
    await storeMenu.pickupTime.confirm.click();

    await expect(storeMenu.pickupTime.root).toBeHidden();
    await expect(storeMenu.pickupUpdatedToast).toBeVisible();
    await expect(storeMenu.pickupMode).toBeChecked();
    await expect(storeMenu.deliveryMode).not.toBeChecked();
  });
});

test.describe('WEB-V03 Menu page', () => {
  test('shows the store header, order mode, search and an empty cart', async ({ pickupMenu }) => {
    await expect(pickupMenu.login).toBeVisible();
    await expect(pickupMenu.banner).toBeVisible();
    await expect(pickupMenu.storeName).toHaveText(STORE.name);
    await expect(pickupMenu.moreInfo).toBeVisible();
    await expect(pickupMenu.changeLocation).toBeVisible();
    await expect(pickupMenu.pickupMode).toBeChecked();
    await expect(pickupMenu.search).toHaveAttribute('placeholder', 'Search Items');
    await expect(pickupMenu.emptyCart).toBeVisible();
  });

  test('lists every category as a tab and a section', async ({ pickupMenu }) => {
    for (const { deptId, name } of CATEGORIES) {
      await expect(pickupMenu.categoryTab(name)).toBeVisible();
      await expect(pickupMenu.panel(deptId)).toBeVisible();
      await expect(pickupMenu.categoryHeading(name)).toBeVisible();
    }
    await expect(pickupMenu.nextTabs).toBeVisible();
  });

  test('category tab scrolls its section into view', async ({ pickupMenu }) => {
    const last = CATEGORIES[CATEGORIES.length - 1];
    await expect(pickupMenu.categoryHeading(last.name)).not.toBeInViewport();

    await pickupMenu.categoryTab(last.name).click();

    await expect(pickupMenu.categoryHeading(last.name)).toBeInViewport();
  });

  test('sold out categories are covered by a Sold Out overlay', async ({ pickupMenu }) => {
    for (const deptId of SOLD_OUT_DEPT_IDS) {
      await expect(pickupMenu.soldOut(deptId)).toBeVisible();
    }
  });

  test('search filters the menu to matching items and clearing restores it', async ({ page, pickupMenu }) => {
    await expect(pickupMenu.itemCards.first()).toBeVisible();
    const total = await pickupMenu.itemCards.count();

    const [, menuResponse] = await Promise.all([
      waitForAction(page, 'LoadCategories', { app: 'pickup', searchKey: 'dumpling' }),
      waitForActionResponse(page, 'LoadMenuByDepartments', { app: 'pickup', searchKey: 'dumpling' }),
      pickupMenu.search.pressSequentially('dumpling'),
    ]);

    const menu = resultOf<MenuDepartment[]>((await menuResponse.json()) as Envelope);
    const expectedNames = menu.flatMap((dept) => dept.Items.map((item) => item.ItemName));
    expect(expectedNames.length).toBeGreaterThan(0);
    expect(expectedNames.length).toBeLessThan(total);
    await expect(pickupMenu.itemCardNames).toHaveText(expectedNames);
    for (const name of expectedNames) expect(name).toMatch(/dumpling/i);

    await Promise.all([
      waitForAction(page, 'LoadCategories', { app: 'pickup', searchKey: '' }),
      pickupMenu.search.clear(),
    ]);
    await expect(pickupMenu.itemCards).toHaveCount(total);
  });
});

test.describe('WEB-V04 Item detail dialog', () => {
  test('item card loads its details into the dialog', async ({ pickupMenu }) => {
    const item = await pickupMenu.openItem(ITEM.id, ITEM.name);

    await expect(item.root).toBeVisible();
    await expect(item.heading).toBeVisible();
    await expect(item.close).toBeVisible();
    await expect(item.addOns).toBeVisible();
    await expect(item.quantity).toHaveValue('1');
    await expect(item.addToCart).toHaveAttribute('aria-label', `Add to cart 1 ${ITEM.name} for $15.00`);
  });

  test('quantity +/- updates the add to cart total and never drops below 1', async ({ pickupMenu }) => {
    const item = await pickupMenu.openItem(ITEM.id, ITEM.name);

    await item.increase.click();
    await expect(item.quantity).toHaveValue('2');
    await expect(item.addToCart).toHaveAttribute('aria-label', `Add to cart 2 ${ITEM.name} for $30.00`);

    await item.decrease.click();
    await expect(item.quantity).toHaveValue('1');
    await item.decrease.click();
    await expect(item.quantity).toHaveValue('1');
    await expect(item.addToCart).toHaveAttribute('aria-label', `Add to cart 1 ${ITEM.name} for $15.00`);
  });

  test('Add-Ons opens the modifier list and Back returns to the item', async ({ pickupMenu }) => {
    const item = await pickupMenu.openItem(ITEM.id, ITEM.name);

    await item.addOns.click();
    await expect(item.back).toBeVisible();
    await expect(item.root.getByRole('button', { name: /^\d+ Allergy- NO NUTS for \$/ })).toBeVisible();
    await expect(item.addOns).toBeHidden();

    await item.back.click();
    await expect(item.addOns).toBeVisible();
    await expect(item.addToCart).toBeVisible();
  });

  test('close button closes the dialog', async ({ pickupMenu }) => {
    const item = await pickupMenu.openItem(ITEM.id, ITEM.name);

    await item.close.click();

    await expect(item.root).toBeHidden();
    await expect(pickupMenu.itemCard(ITEM.id)).toBeVisible();
  });
});
