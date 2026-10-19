import { test, expect } from '@playwright/test';
import { expectSuccessEnvelope, processRequest } from '../../fixtures/api';
import { CATEGORIES, ITEM, STORE } from '../../fixtures/store-data';
import { resultOf, type MenuDepartment } from '../../pages/process-request';

type Category = { DepartmentID: number; DepartmentName: string; ItemCount: number };

test('API-01 get-store lists the QA store', async ({ request }) => {
  const response = await request.get(`/transfer/get-store/${STORE.id}`);
  expect(response.status()).toBe(200);

  const stores = (await response.json()) as Record<string, unknown>[];
  expect(stores.length).toBeGreaterThan(0);
  for (const store of stores) {
    expect(store).toMatchObject({
      token: expect.any(String),
      name: expect.any(String),
      phone: expect.any(String),
      street: expect.any(String),
      city: expect.any(String),
      state: expect.any(String),
      zipCode: expect.any(String),
    });
  }
  expect(stores).toContainEqual(expect.objectContaining({ token: STORE.token, name: STORE.name }));
});

const STORE_LOAD_ACTIONS = [
  { step: 'API-02', action: 'LoadStoreConfigForWeb', param: '' },
  { step: 'API-04', action: 'GetAllMixMatchOffers', param: '' },
  { step: 'API-05', action: 'ListPublicCoupons', param: '' },
  { step: 'API-06', action: 'LoadTimePriceDetails', param: '' },
  { step: 'API-07', action: 'LoadDealsNotes', param: '' },
  { step: 'API-08', action: 'LoadItemBasicInMenu', param: 'app=pickup' },
  { step: 'API-09', action: 'LoadBestSoldByItems', param: '67' },
];

for (const { step, action, param } of STORE_LOAD_ACTIONS) {
  test(`${step} ${action} returns a SUCCESS envelope`, async ({ request }) => {
    await expectSuccessEnvelope(await processRequest(request, action, param));
  });
}

test('API-03 LoadTimeStore returns the store opening times', async ({ request }) => {
  const envelope = await expectSuccessEnvelope(await processRequest(request, 'LoadTimeStore'));
  const result = resultOf<{ configOpenTimes: { DateTypeID: number; IsClose: boolean; OperationTimes: unknown[] }[] }>(envelope);

  expect(result.configOpenTimes.length).toBeGreaterThan(0);
  for (const day of result.configOpenTimes) {
    expect(day).toMatchObject({ DateTypeID: expect.any(Number), IsClose: expect.any(Boolean) });
    expect(Array.isArray(day.OperationTimes)).toBe(true);
  }
});

test('API-10 -> API-11 -> API-12 categories -> menu -> item detail', async ({ request }) => {
  const categories = resultOf<Category[]>(
    await expectSuccessEnvelope(await processRequest(request, 'LoadCategories', 'app=pickup&searchKey=')),
  );
  const deptIds = categories.filter((c) => c.DepartmentID > 0).map((c) => c.DepartmentID);
  expect(deptIds).toEqual(CATEGORIES.map((c) => c.deptId));

  const menu = resultOf<MenuDepartment[]>(
    await expectSuccessEnvelope(
      await processRequest(request, 'LoadMenuByDepartments', `ids=${deptIds.join(',')}&app=pickup&searchKey=`),
    ),
  );
  expect(menu.map((d) => d.DepartmentID)).toEqual(deptIds);
  const menuItem = menu.flatMap((d) => d.Items).find((i) => i.ItemID === ITEM.id);
  expect(menuItem).toMatchObject({ ItemName: ITEM.name, RegularPrice: ITEM.price });

  const detail = resultOf<MenuDepartment[]>(
    await expectSuccessEnvelope(await processRequest(request, 'LoadItemsDetail', `ids=${ITEM.id}&app=pickup`)),
  );
  expect(detail.flatMap((d) => d.Items)).toEqual([
    expect.objectContaining({ ItemID: ITEM.id, ItemName: ITEM.name, RegularPrice: ITEM.price }),
  ]);
});

test('API-10 LoadCategories with searchKey returns only matching departments', async ({ request }) => {
  const categories = resultOf<Category[]>(
    await expectSuccessEnvelope(await processRequest(request, 'LoadCategories', 'app=pickup&searchKey=dumpling')),
  );
  expect(categories.map((c) => c.DepartmentID)).toEqual([65, 47]);
});

test('unknown targetAction returns FAILED / NOT_FOUND', async ({ request }) => {
  const response = await processRequest(request, 'NoSuchAction');
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ Result: 'FAILED', Detail: 'NOT_FOUND', Data: null });
});

test('unknown token returns 204 No Content', async ({ request }) => {
  const response = await processRequest(request, 'LoadTimeStore', '', '00000000');
  expect(response.status()).toBe(204);
});
