# Web E2E Spec (`id` & `event_id`)
## Routes & Modals
|ViewID|Src|Type|Selector / Route|Trigger / Precondition|
|---|---|---|---|---|
|WEB-V01|Auto|Screen|`/checkout`|Auth user + non-empty cart|
|WEB-V02|Auto|Dialog|`#modal-order-confirm`|Click `#btn-submit-order` on `WEB-V01`|
## Elements (`id` & `event_id`)
|ViewID|Element|id|event_id|Payload / Transition|
|---|---|---|---|---|
|WEB-V01|Submit Order|`#btn-submit-order`|`EVT_WEB_CHECKOUT_SUBMIT`|Opens `WEB-V02`|
|WEB-V02|Confirm Order|`data-testid=modal-btn-confirm`|`EVT_WEB_ORDER_CONFIRMED`|Calls `API-02`|
