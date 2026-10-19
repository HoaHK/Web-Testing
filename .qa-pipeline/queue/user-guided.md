# User-Guided Exploration Queue (Step 1B Input for `agy`)
|GuideID|Platform|TargetView|Preconditions & Navigation Steps|Status|
|---|---|---|---|---|
|USR-01|Web|Risk OTP Modal|1. Open `/checkout` 2. Mock `POST /api/v1/orders` -> HTTP 403 `{"error":"RISK_OTP"}` 3. Click `#btn-submit-order` & confirm modal|PENDING_CAPTURE|
