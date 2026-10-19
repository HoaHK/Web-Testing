# Android E2E Spec (`locator` & `key`)
## Views & Dialogs
|ViewID|Src|Type|Name|Trigger / Precondition|
|---|---|---|---|---|
|AND-V01|Auto|Screen|CheckoutActivity|Cart -> Tap `btn_checkout`|
|AND-V02|Auto|Dialog|ConfirmPaySheet|On `AND-V01` -> Tap `btn_pay_now`|
## Elements (`locator` & `key`)
|ViewID|Element|locator|key|ExpectedOutcome|
|---|---|---|---|---|
|AND-V01|Pay Now CTA|`id=com.app:id/btn_pay_now`|`key_checkout_pay_now`|Opens `AND-V02`|
|AND-V02|Confirm CTA|`id=com.app:id/btn_dialog_confirm`|`key_dialog_pay_confirm`|Calls Order API|
