# Cost-Aware Inference Gateway

Cost-aware LLM routing for Hermes and other agents behind Algorand x402 v2 payments. The gateway charges a flat $0.02 USDC for routed chat requests, settles through GoPlausible's facilitator, and forwards paid requests to its private model provider.

## API

- `GET /` — service, model, and payment manifest
- `GET /health` — readiness and selected Algorand network
- `GET /v1/models` — logical routing options and the router price
- `POST /v1/chat/completions` — routes a chat request and returns a completion, **$0.02 USDC** per request
- `POST /v1/goal-based-task` — hire an AI agent to complete a difficult goal, **$3.00 USDC** per request
- `POST /v1/free-tier` — AI help for very basic tasks, **$0.10 USDC** per request

All three paid routes accept the same OpenAI-compatible chat body with `messages` and optional `stream`. The task routes choose their private upstream model regardless of a supplied `model` field. The legacy `/v1/free-tier` path still charges $0.10 USDC through x402. The router charges $0.02 USDC for every request, regardless of the logical routing option.

The paid routes use the official `@x402/core`, `@x402/avm`, `@x402/express`, and `@x402/extensions` packages. Their x402 v2 responses contain Bazaar input/output metadata and the `x402-global-challenge` attribution tag.

## Local development

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Required for real inference:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_GOAL_MODEL=<private model id>
OPENROUTER_BASIC_MODEL=<private model id>
X402_PAY_TO=<58-character Algorand address>
X402_NETWORK=testnet
X402_FACILITATOR_URL=https://facilitator.goplausible.xyz
```

For a deterministic paid TestNet settlement without spending OpenRouter credit, set `INFERENCE_TEST_MODE=true`. Startup rejects test mode on MainNet. Production also rejects a configured `X402_API_BYPASS_KEY`, ensuring the paid route fails closed.

The gateway derives the correct USDC asset automatically:

- TestNet: ASA `10458941`
- MainNet: ASA `31566704`

If `X402_ASSET_ID` is set, it is treated as a safety assertion and must match the selected network.

## Paid TestNet check

Use the shared client in `../proofX/scripts/live_x402_paid_check.py`. Keep the buyer mnemonic only in the local shell or ignored `proofX/.env`.

```powershell
cd ..\proofX
$env:ALGORAND_MNEMONIC="<disposable TestNet mnemonic>"
$env:AVM_ADDRESS="<derived TestNet address>"
.\.venv\Scripts\python.exe scripts/live_x402_paid_check.py `
  --service inference `
  --url http://127.0.0.1:4021/v1/chat/completions
```

## MainNet cutover

```env
NODE_ENV=production
INFERENCE_TEST_MODE=false
OPENROUTER_API_KEY=<production key>
OPENROUTER_MODEL_OVERRIDE=
OPENROUTER_GOAL_MODEL=<private goal task model id>
OPENROUTER_BASIC_MODEL=<private basic task model id>
X402_NETWORK=mainnet
X402_PAY_TO=<MainNet account opted into USDC ASA 31566704>
X402_FACILITATOR_URL=https://facilitator.goplausible.xyz
X402_ASSET_ID=31566704
X402_API_BYPASS_KEY=
X402_CHALLENGE_TAG=x402-global-challenge
```

Deploy behind public HTTPS, settle one real MainNet payment through GoPlausible, and verify Bazaar plus leaderboard visibility. If this gateway and PackageProof share one `payTo`, route both behind one root domain; do not reuse one merchant address across different domains.

## Global x402 Challenge listing

All three paid routes use one MainNet `X402_PAY_TO` address and one HTTPS domain. Each route declares Bazaar input/output metadata, has a specific description, and includes `extra.tag=x402-global-challenge` in its payment challenge. The domain root serves Open Graph metadata to browsers and a JSON service manifest to API clients.

Before public MainNet launch, confirm that the pay-to account is funded with ALGO and opted into MainNet USDC ASA `31566704`. Then make one real MainNet payment to **each route** to create all three Bazaar resource records. A 402 challenge alone does not publish a resource in the catalog.

Check the records and merchant attribution at:

- `https://facilitator.goplausible.xyz/discovery/resources`
- `https://facilitator.goplausible.xyz/discovery/merchants`
- `https://facilitator.goplausible.xyz/dashboard/leaderboards?cat=merchants&env=mainnet&src=x402-global-challenge`

Run `node scripts/check-mainnet-challenges.mjs <PAY_TO_ADDRESS>` after `npm run build` to verify the three MainNet payment amounts, USDC asset, challenge tag, Bazaar metadata, and HTTPS proxy handling without spending USDC. Pass the public base URL as a second argument to check the live deployment. Run `node scripts/check-model-routing.mjs` to check the fixed model routes without an upstream call.

## Verification

```powershell
npm run typecheck
npm run build
npm audit --omit=dev
```

For Railway, set the service root directory to `inference-gateway`; `railway.json`, the Dockerfile, and `/health` are already configured.
