# Web E2E Spec (`id` & `event_id`)
> Base: `https://boreas.zenkiet.dev/online-ordering/staging` · Store `20201` · Token `20201085`
> Precondition: browser context needs `permissions: ['local-network-access']` (HTTPS app calls API at `http://192.168.1.194:6969`; blocked otherwise -> "No internet connection" + redirect to `/`).
> No `event_id` / `data-testid` / tracking attributes exist in the DOM; `event_id` column = `-`. Payload column lists the API `targetAction` triggered.
## Routes & Modals
|ViewID|Src|Type|Selector / Route|Trigger / Precondition|
|---|---|---|---|---|
|WEB-V01|Guided|Dialog|`mat-dialog-container` hasText "Choose Order Type" (no role=dialog)|Open `/store/20201/detail/20201085`; auto-opens on load|
|WEB-V02|Guided|Dialog|`getByRole('dialog')` hasText "Choose a pickup time"|Click PICK UP -> OK on `WEB-V01`|
|WEB-V03|Guided|Screen|`/store/20201/detail/20201085`|Confirm pickup time on `WEB-V02`|
|WEB-V04|Guided|Dialog|`getByRole('dialog')` has button /^Add to cart/|Click item card `#food_<uuid>` on `WEB-V03`|
## Elements (`id` & `event_id`)
|ViewID|Element|id|event_id|Payload / Transition|
|---|---|---|---|---|
|WEB-V01|PICK UP|`getByRole('button', { name: 'PICK UP' })`|-|Selects pickup|
|WEB-V01|DELIVERY|`getByRole('button', { name: 'DELIVERY' })`|-|Selects delivery|
|WEB-V01|OK|`getByRole('button', { name: 'OK' })`|-|`LoadTimeStore`; opens `WEB-V02`|
|WEB-V02|Pickup Date|`getByLabel('Select a Pickup Date')` / `[formcontrolname=date]`|-|Default = today|
|WEB-V02|Open calendar|`getByRole('button', { name: 'Open calendar' })`|-|Opens datepicker|
|WEB-V02|Pickup Time|`getByRole('combobox')` / `mat-select[formcontrolname=time]`|-|88 options, 5-min steps; `getByRole('option', { name: '04:40 PM' })`|
|WEB-V02|Confirm Pickup|`getByRole('button', { name: /^Pickup .* at / })`|-|No API; closes dialog; toast `WEB-V03` alert|
|WEB-V03|Toast|`getByRole('alert')` hasText "Updated pickup time successfully!"|-|After `WEB-V02` confirm|
|WEB-V03|Log in|`getByRole('button', { name: 'Log in' })`|-|-|
|WEB-V03|Store banner|`#banner-store-anchor` (name in `h2`)|-|"BLOGIC_QA-TEAM-THAO"|
|WEB-V03|More Info|`getByRole('button', { name: 'More Info' })`|-|-|
|WEB-V03|Change Location|`getByText('Change Location')`|-|Not a link/button|
|WEB-V03|Pickup/Delivery toggle|`locator('label', { hasText: 'Pickup' })` / `hasText: 'Delivery'`|-|Radios have no name|
|WEB-V03|Search|`#search_1` / `getByPlaceholder('Search Items')`|-|`LoadCategories` `searchKey=`|
|WEB-V03|Category tab|`getByRole('button', { name: 'Choose <Category> tab' })`|-|8 tabs; next arrow `getByRole('button', { name: 'Next' })`|
|WEB-V03|Category section|`#panel_<deptId>` (65,68,70,47,74,73,90,118)|-|`LoadMenuByDepartments`|
|WEB-V03|Item card|`#food_<uuid>` e.g. `#food_ae42e5c0-fc26-489e-b19b-976f6c881e23`|-|`LoadItemsDetail ids=<uuid>&app=pickup`; opens `WEB-V04`|
|WEB-V03|Sold Out overlay|`#panel_68` / `#panel_47` `getByRole('button', { name: 'Sold Out' })`|-|Item unavailable|
|WEB-V03|Empty cart|`getByRole('heading', { name: 'Your cart is empty' })`|-|Initial state|
|WEB-V04|Close (X)|`button.mat-mdc-icon-button` (first in dialog)|-|No aria-label|
|WEB-V04|Add-Ons|`getByRole('button', { name: 'Add-Ons' })`|-|-|
|WEB-V04|Quantity|`#quantity` / `getByRole('textbox', { name: 'quantity' })`|-|Default 1|
|WEB-V04|Qty -/+|`getByRole('button', { name: 'decrease quantity' })` / `'increase quantity'`|-|-|
|WEB-V04|Add to cart|`getByRole('button', { name: /^Add to cart/ })`|-|aria-label "Add to cart 1 <item> for $15.00"|
