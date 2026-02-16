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
  --set-env-vars GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY,MODEL_CHAIN=gemini-2.0-flash,gemini-2.5-pro,gemma-3-27b-it,gemma-3-12b-it,ALLOWED_ORIGINS=https://ugonfor.kr,https://www.ugonfor.kr,AUDIT_LOG_BUCKET=YOUR_AUDIT_BUCKET
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
- `AUDIT_LOG_BUCKET` (optional): if set, writes full LLM request/response audit records to GCS.
- `AUDIT_LOG_PREFIX` (optional): GCS object prefix (default: `llm-audit`).
- `AUDIT_LOG_GZIP` (optional): gzip audit JSON before upload (default: `true`).
- `AUDIT_LOG_TIMEOUT_MS` (optional): upload timeout in ms (default: `2500`).
- `AUDIT_LOG_MAX_TEXT_CHARS` (optional): truncation limit for long text fields (default: `40000`).
- `AUDIT_LOG_STRICT_MODE` (optional): when `true`, `/api/npc-chat` returns `503` if audit upload fails.

## Full request/response audit logging (Cloud Run + GCS)

`/api/npc-chat` and `/api/npc-chat-stream` now emit one audit JSON per inference request into:

`gs://<AUDIT_LOG_BUCKET>/<AUDIT_LOG_PREFIX>/YYYY/MM/DD/HH/...json.gz`

Each record includes:
- `requestId`, request timestamp, Cloud Trace id (if available), client IP/origin/user-agent
- incoming payload + built prompt + user message
- final response text, model, endpoint, status, latency, and error message (if failed)

### Minimal setup

1) Create bucket (example region: us-central1):

```bash
gcloud storage buckets create gs://YOUR_AUDIT_BUCKET --location=us-central1
```

2) Grant object write to the Cloud Run runtime service account:

```bash
gcloud storage buckets add-iam-policy-binding gs://YOUR_AUDIT_BUCKET \
  --member=serviceAccount:YOUR_CLOUD_RUN_SA@YOUR_GCP_PROJECT.iam.gserviceaccount.com \
  --role=roles/storage.objectCreator
```

3) Redeploy with audit env vars:

```bash
gcloud run deploy playground-llm-proxy \
  --image gcr.io/YOUR_GCP_PROJECT/playground-llm-proxy \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY,AUDIT_LOG_BUCKET=YOUR_AUDIT_BUCKET,AUDIT_LOG_PREFIX=llm-audit
```

4) Optional retention cost control:

```bash
gcloud storage buckets update gs://YOUR_AUDIT_BUCKET --lifecycle-file=<(cat <<'JSON'
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "age": 30 }
    }
  ]
}
JSON
)
```

For production, avoid broad public exposure. If possible, put this service behind Cloud Run IAM / API Gateway in addition to the app-level controls above.

## Optional: Firebase Realtime DB (multiplayer)

실시간 멀티플레이어를 활성화하려면:

1) Firebase 콘솔(https://console.firebase.google.com)에서 프로젝트 생성
2) Realtime Database 활성화 (asia-southeast1 등 가까운 리전 선택)
3) 보안 규칙에 `server/firebase-rules.json` 내용 적용
4) 프로젝트 설정 > 웹 앱 추가 > Firebase config 값 복사
5) `_config.yml`에 설정:

```yaml
playground_firebase:
  apiKey: "AIza..."
  authDomain: "your-project.firebaseapp.com"
  databaseURL: "https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app"
  projectId: "your-project"
```

6) 사이트 재빌드/배포. Firebase config가 비어있으면 싱글플레이어 모드로 동작.

## Optional: Turnstile integration

1) Set `TURNSTILE_SECRET_KEY` in Cloud Run env vars.
2) Set `playground_turnstile_site_key` in `_config.yml`.
3) Rebuild/deploy the site. The frontend will automatically attach `X-Turnstile-Token` on POST API calls.
