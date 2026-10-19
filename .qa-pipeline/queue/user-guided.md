# User-Guided Exploration Queue (Step 1B Input for `agy`)
|GuideID|Platform|TargetView|Preconditions & Navigation Steps|Status|
|---|---|---|---|---|
|USR-01|Web|Risk OTP Modal|1. Open `/checkout` 2. Mock `POST /api/v1/orders` -> HTTP 403 `{"error":"RISK_OTP"}` 3. Click `#btn-submit-order` & confirm modal|PENDING_CAPTURE|
|USR-02|Web|Pickup Order Flow|1. Open `/store/20201/detail/20201085` (grant `local-network-access`) 2. Click PICK UP -> OK 3. Confirm "Pickup Today at ..." 4. Click item `#food_ae42e5c0-fc26-489e-b19b-976f6c881e23`|CAPTURED:WEB-V01,WEB-V02,WEB-V03,WEB-V04|
