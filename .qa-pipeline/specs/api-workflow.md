# API Workflow Spec
> Base: `http://192.168.1.194:6969` (LAN only). `ProcessRequest` = `POST /transfer/ProcessRequest`, form body `targetAction=<A>&param=<urlencoded>&token=20201085`.
> Envelope (all ProcessRequest): `{ Result: string, Detail, VersionDate: string, Version: number, ReturnCode, Data: [{ Key, Value }], FailMessage: [] }`.
|StepID|Src|Method & Endpoint|Input Dependency -> Output Var|Status & Schema Check|
|---|---|---|---|---|
|API-01|Guided|`GET /transfer/get-store/20201`|Store id -> `token`|`200` array of `{ token, name, phone, street, city, state, zipCode }`|
|API-02|Guided|`ProcessRequest LoadStoreConfigForWeb`|`token` -> store config|`200` envelope, `FailMessage` empty|
|API-03|Guided|`ProcessRequest LoadTimeStore`|`token` -> pickup slots|`200` envelope|
|API-04|Guided|`ProcessRequest GetAllMixMatchOffers`|`token` -> offers|`200` envelope|
|API-05|Guided|`ProcessRequest ListPublicCoupons`|`token` -> coupons|`200` envelope|
|API-06|Guided|`ProcessRequest LoadTimePriceDetails`|`token` -> time pricing|`200` envelope|
|API-07|Guided|`ProcessRequest LoadDealsNotes`|`token` -> deals notes|`200` envelope|
|API-08|Guided|`ProcessRequest LoadItemBasicInMenu` `app=pickup`|`token` -> menu items|`200` envelope|
|API-09|Guided|`ProcessRequest LoadBestSoldByItems` `param=67`|`token` -> best sellers|`200` envelope (`Detail` is string)|
|API-10|Guided|`ProcessRequest LoadCategories` `app=pickup&searchKey=`|`token` -> `deptIds` (65,68,70,47,74,73,90,118)|`200` envelope|
|API-11|Guided|`ProcessRequest LoadMenuByDepartments` `ids=<deptIds>&app=pickup&searchKey=`|`deptIds` -> `itemUuid`|`200` envelope|
|API-12|Guided|`ProcessRequest LoadItemsDetail` `ids=<itemUuid>&app=pickup`|`itemUuid` -> item detail|`200` envelope|
