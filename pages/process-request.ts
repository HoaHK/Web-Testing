import type { Page, Request, Response } from '@playwright/test';

export const PROCESS_REQUEST_PATH = '/transfer/ProcessRequest';

export type Envelope = {
  Result: string;
  Detail: unknown;
  VersionDate: string;
  Version: number;
  ReturnCode: unknown;
  Data: { Key: string; Value: string }[] | null;
  FailMessage: unknown[];
};

export type MenuDepartment = {
  DepartmentID: number;
  DepartmentName: string;
  Items: { ItemID: string; ItemName: string; RegularPrice: number }[];
};

function matchesAction(req: Request, action: string, params?: Record<string, string>): boolean {
  if (req.method() !== 'POST' || !req.url().endsWith(PROCESS_REQUEST_PATH)) return false;
  const body = new URLSearchParams(req.postData() ?? '');
  if (body.get('targetAction') !== action) return false;
  if (!params) return true;
  const param = new URLSearchParams(body.get('param') ?? '');
  return Object.entries(params).every(([key, value]) => param.get(key) === value);
}

/** Start waiting BEFORE the trigger: Promise.all([waitForAction(...), button.click()]). */
export function waitForAction(page: Page, action: string, params?: Record<string, string>): Promise<Request> {
  return page.waitForRequest((req) => matchesAction(req, action, params));
}

export function waitForActionResponse(page: Page, action: string, params?: Record<string, string>): Promise<Response> {
  return page.waitForResponse((res) => matchesAction(res.request(), action, params));
}

/** ProcessRequest payloads are a JSON string stored under Data[Key=RESULT]. */
export function resultOf<T>(envelope: Envelope): T {
  const entry = envelope.Data?.find((d) => d.Key === 'RESULT');
  if (!entry) throw new Error(`No RESULT entry in envelope: ${JSON.stringify(envelope).slice(0, 200)}`);
  return JSON.parse(entry.Value) as T;
}
