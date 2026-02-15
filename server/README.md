# Playground LLM Proxy (Google AI)

This service proxies NPC chat requests to Google Gemini so your API key is not exposed in frontend code.

## 1) Deploy to Cloud Run

```bash
cd server
gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT/playground-llm-proxy
gcloud run deploy playground-llm-proxy \
  --image gcr.io/YOUR_GCP_PROJECT/playground-llm-proxy \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY,MODEL_CHAIN=gemini-2.0-flash,gemini-2.5-pro,gemma-3-27b-it,gemma-3-12b-it,ALLOWED_ORIGINS=https://ugonfor.kr,https://www.ugonfor.kr
```

Cloud Run URL will look like:

`https://playground-llm-proxy-xxxxx-uc.a.run.app`

## 2) Connect from this site

Set in `_config.yml`:

```yaml
playground_llm_api: "https://playground-llm-proxy-xxxxx-uc.a.run.app/api/npc-chat"
```

Then rebuild/push the site.

## 3) Health check

```bash
curl https://playground-llm-proxy-xxxxx-uc.a.run.app/healthz
```

## Model fallback behavior

The proxy tries models in `MODEL_CHAIN` order and falls back to the next model when quota/rate-limit-like failures happen (e.g. 429, RESOURCE_EXHAUSTED, quota/rate-limit text).

## Security env vars

- `ALLOWED_ORIGINS`: allowed browser origins for CORS/API access (comma-separated).
- `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`: simple per-IP rate limiting.
- `MAX_BODY_BYTES`: request JSON size limit.
- `PROXY_AUTH_TOKEN` (optional): if set, API requests must include `X-Proxy-Token`.
- `TURNSTILE_SECRET_KEY` (optional): if set, POST API requests must include a valid `X-Turnstile-Token`.
- `TURNSTILE_EXPECTED_HOSTNAMES` (optional): restrict accepted Turnstile tokens to hostnames.

For production, avoid broad public exposure. If possible, put this service behind Cloud Run IAM / API Gateway in addition to the app-level controls above.

## Optional: Turnstile integration

1) Set `TURNSTILE_SECRET_KEY` in Cloud Run env vars.
2) Set `playground_turnstile_site_key` in `_config.yml`.
3) Rebuild/deploy the site. The frontend will automatically attach `X-Turnstile-Token` on POST API calls.
