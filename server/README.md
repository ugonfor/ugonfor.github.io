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
  --set-env-vars GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY,MODEL_CHAIN=gemini-2.5-pro,gemini-2.0-flash,gemma-3-27b-it,gemma-3-12b-it
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
