import Stripe from 'stripe';

// Phase K (overlay 045 / TRPC bizrethink.instanceStripe.test):
// Verify Stripe credentials without persisting anything.
//
// Pattern matches test-org-smtp.ts + test-instance-storage.ts: take
// plaintext credentials, build a transient client, call the cheapest
// possible authenticated endpoint, return a discriminated result.
//
// We use stripe.balance.retrieve() because it:
//   - Requires authentication (verifies the key works)
//   - Returns the account ID (handy for the admin "Connected to acct_..."
//     status badge)
//   - Costs nothing (no chargeable Stripe API call)
//   - Doesn't mutate any account state
//
// Timeouts: Stripe's SDK has a default 80-second timeout. We tighten to
// 10s so a misconfigured key doesn't make the admin UI's "Test" button
// hang. Connection refused errors surface within ~1s anyway.

export type TestStripeResult =
  | { ok: true; accountId: string; livemode: boolean }
  | { ok: false; error: string };

/**
 * Test a Stripe API key by calling `stripe.balance.retrieve()`.
 *
 * Returns `{ ok: true, accountId, livemode }` on success — `livemode`
 * is true for sk_live_ keys, false for sk_test_. UI uses this to
 * cross-check the user pasted the right key into the right tab
 * (sandbox tab + sk_live_ → warn the user).
 *
 * Returns `{ ok: false, error }` on auth failure / network error / etc.
 * The error message is the Stripe error's `.message` field which is
 * already user-readable ("Invalid API Key provided: sk_test_***").
 */
export async function testStripeConnection(apiKey: string): Promise<TestStripeResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { ok: false, error: 'API key is empty' };
  }

  const client = new Stripe(apiKey, {
    apiVersion: '2022-11-15',
    typescript: true,
    timeout: 10_000, // 10s — fail fast on bad creds
    maxNetworkRetries: 0, // don't retry on auth failures
  });

  try {
    // balance.retrieve is the cheapest authenticated endpoint that returns
    // account-identifying info. Most Stripe accounts hit this within ~300ms.
    const balance = await client.balance.retrieve();

    return {
      ok: true,
      // livemode is on the response itself — true for prod, false for test.
      livemode: balance.livemode,
      // The account ID isn't returned by balance.retrieve() directly, but
      // we can derive it from a follow-up Account.retrieve() if needed.
      // For now, fall back to extracting from the key prefix (sk_test_X / sk_live_X)
      // — this is sufficient to confirm "we authenticated as some account."
      // If we need the actual acct_ ID, swap to stripe.accounts.retrieve().
      accountId: extractAccountIdFromKey(apiKey),
    };
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      return { ok: false, error: err.message };
    }

    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }

    return { ok: false, error: 'Unknown error testing Stripe connection' };
  }
}

/**
 * Best-effort account identifier from the API key. Stripe keys have the
 * shape `sk_(test|live)_<random>` and don't include the acct_ ID. We
 * return the key's prefix + last 4 chars as a recognizable handle for
 * the UI ("Connected: sk_test_***last4").
 *
 * If we need the actual acct_ ID, follow up with stripe.accounts.retrieve()
 * in the caller — but for the admin "Connected" indicator, this is
 * sufficient and avoids a second API call.
 */
function extractAccountIdFromKey(apiKey: string): string {
  const last4 = apiKey.slice(-4);
  if (apiKey.startsWith('sk_test_')) return `sk_test_***${last4}`;
  if (apiKey.startsWith('sk_live_')) return `sk_live_***${last4}`;
  return `***${last4}`;
}
