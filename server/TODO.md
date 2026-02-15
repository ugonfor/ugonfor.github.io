# LLM Audit Logging TODO

## Deploy Preparation

- [ ] Confirm Cloud Run region for `playground-llm-proxy`
- [ ] Pick unique GCS bucket name for audit logs
- [ ] Create GCS bucket in same region as Cloud Run
- [ ] Grant `roles/storage.objectCreator` to Cloud Run service account on the bucket

## Cloud Run Rollout

- [ ] Build and push latest image from `server/`
- [ ] Deploy Cloud Run with audit env vars:
  - `AUDIT_LOG_BUCKET`
  - `AUDIT_LOG_PREFIX` (optional, default `llm-audit`)
  - `AUDIT_LOG_GZIP` (recommended `true`)
  - `AUDIT_LOG_STRICT_MODE` (recommended `false` initially)
- [ ] Keep existing env vars (`GOOGLE_API_KEY`, `MODEL_CHAIN`, `ALLOWED_ORIGINS`, ...)

## Post-Deploy Verification

- [ ] Call `/api/npc-chat` and verify `requestId` exists in response
- [ ] Call `/api/npc-chat-stream` and verify SSE includes `requestId`
- [ ] Check new objects in `gs://<bucket>/<prefix>/YYYY/MM/DD/HH/`
- [ ] Confirm record contains request/response pair and model/latency/status fields

## Cost and Retention

- [ ] Apply bucket lifecycle policy (for example, auto-delete after 30 days)
- [ ] Restrict read access to audit bucket (least privilege)
- [ ] Review truncation limit (`AUDIT_LOG_MAX_TEXT_CHARS`) for storage cost control
