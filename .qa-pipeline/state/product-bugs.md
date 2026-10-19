# Escalated Product Bugs
|BugID|Area|Observed|Impact on tests|
|---|---|---|---|
|PB-01|Web/API|Staging HTTPS app calls API on private LAN `http://192.168.1.194:6969`; Chrome blocks it (Local Network Access) -> "No internet connection" + redirect to `/`|Web project must grant `local-network-access`; app unusable outside the LAN|
|PB-02|API|`POST /transfer/ProcessRequest` intermittently never responds (>30s). Runs on 2026-10-19: 28/29, 56/58, 48/48, 48/48, 21/29, 17/29 passed; failures are all hangs, incl. plain API calls (`LoadStoreConfigForWeb`, `ListPublicCoupons`). Manual curl between runs answered in <0.1s|Intermittent 30s timeouts in fixture setup, WEB-V01 and API tests|
|PB-03|Web|Every page load throws `TypeError: Cannot set properties of undefined (setting 'display')` (reported to Sentry)|None directly|
|PB-04|Web a11y|Order type dialog has no `role="dialog"`; item dialog close (X) has no accessible name; Pickup/Delivery radios unnamed; "Change Location" is not a link/button|Locators fall back to text/CSS class|
|PB-05|Web|No `event_id` / `data-testid` attributes anywhere; Angular ids (`mat-mdc-dialog-N`, `mat-option-N`) are auto-generated|`event_id` cannot be asserted; spec column is `-`|
