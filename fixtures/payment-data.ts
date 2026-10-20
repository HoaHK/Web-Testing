// Sandbox payment test data comes from .env (gitignored; see .env.example), never from source.

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}: copy .env.example to .env and fill in the sandbox test data`);
  return value;
}

export type TestCard = { brand: string; number: string; expiry: string; cvv: string };

/** Contact info for WEB-V08 (all three required) and the card ZIP on WEB-V09 (not validated by the backend). */
export const CUSTOMER = {
  get name() { return env('TEST_CUSTOMER_NAME'); },
  get phone() { return env('TEST_CUSTOMER_PHONE'); },
  get email() { return env('TEST_CUSTOMER_EMAIL'); },
  get zip() { return env('TEST_CUSTOMER_ZIP'); },
};

function card(brand: string, prefix: string): TestCard {
  return {
    brand,
    get number() { return env(`${prefix}_NUMBER`); },
    get expiry() { return env(`${prefix}_EXP`); },
    get cvv() { return env(`${prefix}_CVV`); },
  };
}

export const CARDS: TestCard[] = [
  card('Visa', 'TEST_CARD_VISA'),
  card('MasterCard', 'TEST_CARD_MASTERCARD'),
  card('American Express', 'TEST_CARD_AMEX'),
  card('JCB', 'TEST_CARD_JCB'),
];
