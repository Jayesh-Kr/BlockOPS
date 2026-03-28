# Lit Protocol Setup for Private Key Storage

This project stores user private keys as Lit-encrypted ciphertext, not plaintext.

## What we implemented

- Private keys are encrypted via Lit Actions before saving to the `users.private_key` field.
- Decryption happens on demand right before a signing flow needs the key.
- The browser never receives your Lit API key.

## Required environment variables

Add these to your frontend server environment (for example `.env.local`):

```bash
LIT_API_BASE_URL=https://api.dev.litprotocol.com/core/v1
LIT_USAGE_API_KEY=your_lit_usage_api_key
LIT_PKP_ID=your_pkp_wallet_address_or_id
```
aXWEG1aZYUNokCZVpFJRJs18VdQ+FKG0BIigAQLkUzY=
Notes:
- `LIT_USAGE_API_KEY` should have execute permissions for the group/action scope you configured.
- `LIT_PKP_ID` should be a PKP dedicated to this data boundary.

## Dashboard flow (based on Lit docs)

1. Create or log into an account in the Lit Dashboard.
2. Create a usage API key.
3. Create a PKP wallet.
4. Ensure the usage key can execute Lit Actions in the target group.
5. Use the usage key and PKP in env vars above.

Docs:
- https://developer.litprotocol.com/management/dashboard
- https://developer.litprotocol.com/management/api_direct
- https://developer.litprotocol.com/lit-actions/examples
- https://developer.litprotocol.com/lit-actions/patterns

## Storage format in `users.private_key`

The value is stored as:

- Prefix: `lit:v1:`
- Payload JSON: provider, version, pkpId, ciphertext, createdAt

Example shape:

```json
lit:v1:{"version":1,"provider":"lit-chipotle","pkpId":"0x...","ciphertext":"...","createdAt":"..."}
```

## Security recommendation

For stronger isolation, use one PKP per user (or per logical vault boundary) as described in Lit patterns.
