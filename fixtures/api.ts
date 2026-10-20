import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { PROCESS_REQUEST_PATH, type Envelope } from '../pages/process-request';
import { STORE } from './store-data';

export function processRequest(
  request: APIRequestContext,
  targetAction: string,
  param = '',
  token: string = STORE.token,
): Promise<APIResponse> {
  return request.post(PROCESS_REQUEST_PATH, { form: { targetAction, param, token } });
}

/** `detail` defaults to null, which is what every action except LoadBestSoldByItems returns. */
export async function expectSuccessEnvelope(response: APIResponse, detail: unknown = null): Promise<Envelope> {
  expect(response.status()).toBe(200);
  const envelope = (await response.json()) as Envelope;
  expect(envelope).toMatchObject({
    Result: 'SUCCESS',
    Detail: detail,
    VersionDate: expect.any(String),
    Version: expect.any(Number),
    ReturnCode: null,
    FailMessage: [],
  });
  expect(envelope.Data).toEqual(expect.arrayContaining([{ Key: 'RESULT', Value: expect.any(String) }]));
  return envelope;
}
