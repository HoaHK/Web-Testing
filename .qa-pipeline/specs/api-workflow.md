# API Workflow Spec
|StepID|Src|Method & Endpoint|Input Dependency -> Output Var|Status & Schema Check|
|---|---|---|---|---|
|API-01|Auto|`POST /api/v1/auth/login`|Credentials -> `accessToken`|`200` (`accessToken` string)|
|API-02|Auto|`POST /api/v1/orders`|`accessToken` -> `orderId`|`201` (`status=="CREATED"`)|
