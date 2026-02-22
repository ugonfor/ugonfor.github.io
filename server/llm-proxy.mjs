import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { gzipSync } from "node:zlib";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || (process.env.K_SERVICE ? "0.0.0.0" : "127.0.0.1");
const API_KEY = process.env.GOOGLE_API_KEY || "";
const MODEL_CHAIN = (process.env.MODEL_CHAIN ||
  "gemini-2.5-flash,gemini-3-flash-preview,gemini-2.5-flash-lite,gemma-3-27b-it")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const SHARED_STATE_FILE = process.env.SHARED_STATE_FILE || "/tmp/playground-shared-state.json";
const MAX_BODY_BYTES = Math.max(8_192, Number(process.env.MAX_BODY_BYTES || 1_000_000));
const RATE_LIMIT_WINDOW_MS = Math.max(1_000, Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000));
const RATE_LIMIT_MAX = Math.max(1, Number(process.env.RATE_LIMIT_MAX || 90));
const PROXY_AUTH_TOKEN = String(process.env.PROXY_AUTH_TOKEN || "").trim();
const OPENWEATHER_API_KEY = String(process.env.OPENWEATHER_API_KEY || "").trim();
const SEOUL_LAT = 37.5665;
const SEOUL_LON = 126.9780;
const TURNSTILE_SECRET_KEY = String(process.env.TURNSTILE_SECRET_KEY || "").trim();
const TURNSTILE_VERIFY_URL = String(
  process.env.TURNSTILE_VERIFY_URL || "https://challenges.cloudflare.com/turnstile/v0/siteverify"
).trim();
const TURNSTILE_EXPECTED_HOSTNAMES = new Set(
  String(process.env.TURNSTILE_EXPECTED_HOSTNAMES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);
const GCP_PROJECT_ID = String(process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "").trim();
const AUDIT_LOG_BUCKET = String(process.env.AUDIT_LOG_BUCKET || "").trim();
const AUDIT_LOG_PREFIX = String(process.env.AUDIT_LOG_PREFIX || "llm-audit").trim().replace(/^\/+|\/+$/g, "");
const AUDIT_LOG_MAX_TEXT_CHARS = Math.max(1_000, Number(process.env.AUDIT_LOG_MAX_TEXT_CHARS || 40_000));
const AUDIT_LOG_TIMEOUT_MS = Math.max(500, Number(process.env.AUDIT_LOG_TIMEOUT_MS || 2_500));
const AUDIT_LOG_STRICT_MODE = String(process.env.AUDIT_LOG_STRICT_MODE || "").toLowerCase() === "true";
const AUDIT_LOG_GZIP = String(process.env.AUDIT_LOG_GZIP || "true").toLowerCase() !== "false";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:4000",
  "http://127.0.0.1:4000",
  "https://ugonfor.kr",
  "https://www.ugonfor.kr",
];
const ALLOWED_ORIGINS = new Set(
  String(process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);
const rateLimitStore = new Map();
const turnstileVerifiedCache = new Map();
let gcpAccessToken = "";
let gcpAccessTokenExpiresAt = 0;

const sharedState = {
  revision: 0,
  customNpcs: [],
};

// ─── Seoul Weather Cache ───
let weatherCache = { weather: "clear", temp: 20, fetchedAt: 0 };
const WEATHER_CACHE_TTL = 10 * 60 * 1000; // 10분

function mapOwmToGameWeather(owmId) {
  if (owmId >= 200 && owmId < 300) return "storm";     // Thunderstorm
  if (owmId >= 300 && owmId < 400) return "rain";       // Drizzle
  if (owmId >= 500 && owmId < 600) return "rain";       // Rain
  if (owmId >= 600 && owmId < 700) return "snow";       // Snow
  if (owmId >= 700 && owmId < 800) return "fog";        // Atmosphere (fog, mist, haze)
  if (owmId === 800) return "clear";                     // Clear
  if (owmId > 800) return "cloudy";                      // Clouds
  return "clear";
}

async function fetchSeoulWeather() {
  const now = Date.now();
  if (now - weatherCache.fetchedAt < WEATHER_CACHE_TTL) return weatherCache;
  if (!OPENWEATHER_API_KEY) return weatherCache;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${SEOUL_LAT}&lon=${SEOUL_LON}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OWM HTTP ${res.status}`);
    const data = await res.json();
    const owmId = data?.weather?.[0]?.id || 800;
    weatherCache = {
      weather: mapOwmToGameWeather(owmId),
      temp: Math.round(data?.main?.temp ?? 20),
      description: data?.weather?.[0]?.description || "",
      fetchedAt: now,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[weather] fetch failed: ${err.message}`);
  }
  return weatherCache;
}

function cleanText(value, maxLen) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function getClientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "");
  if (xff) return xff.split(",")[0].trim();
  return String(req.socket?.remoteAddress || "unknown");
}

function getOrigin(req) {
  return String(req.headers.origin || "").trim();
}

function isAllowedOrigin(origin) {
  return !!origin && ALLOWED_ORIGINS.has(origin);
}

function checkRateLimit(ip) {
  const now = Date.now();
  const start = now - RATE_LIMIT_WINDOW_MS;
  const history = rateLimitStore.get(ip) || [];
  const next = history.filter((ts) => ts > start);
  if (next.length >= RATE_LIMIT_MAX) {
    rateLimitStore.set(ip, next);
    return false;
  }
  next.push(now);
  rateLimitStore.set(ip, next);
  return true;
}

function requiresHumanVerification(req) {
  if (!TURNSTILE_SECRET_KEY) return false;
  if (req.method !== "POST") return false;
  return req.url === "/api/npc-chat" || req.url === "/api/npc-chat-stream" || req.url === "/api/world-npcs";
}

async function verifyTurnstileToken(token, remoteip = "") {
  const now = Date.now();
  const cachedUntil = Number(turnstileVerifiedCache.get(token) || 0);
  if (cachedUntil > now) return true;

  const body = new URLSearchParams({
    secret: TURNSTILE_SECRET_KEY,
    response: token,
  });
  if (remoteip) body.set("remoteip", remoteip);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) return false;
  const data = await response.json().catch(() => ({}));
  if (!data?.success) return false;
  if (TURNSTILE_EXPECTED_HOSTNAMES.size && !TURNSTILE_EXPECTED_HOSTNAMES.has(String(data.hostname || ""))) {
    return false;
  }

  // Keep successful token cache briefly to avoid duplicate verification calls on retries.
  turnstileVerifiedCache.set(token, now + 2 * 60_000);
  return true;
}

function buildBaseHeaders(origin) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
  if (origin) {
    headers["Vary"] = "Origin";
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, X-Proxy-Token, X-Turnstile-Token";
  }
  return headers;
}

function loadSharedState() {
  try {
    if (!existsSync(SHARED_STATE_FILE)) return;
    const raw = readFileSync(SHARED_STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.customNpcs)) return;
    sharedState.revision = Number(parsed.revision || 0);
    sharedState.customNpcs = parsed.customNpcs.slice(0, 200).map((npc) => ({
      id: String(npc.id || ""),
      name: cleanText(npc.name, 18),
      personality: cleanText(npc.personality, 120),
      createdAt: String(npc.createdAt || ""),
    }));
  } catch {
    // ignore corrupted cache file
  }
}

function persistSharedState() {
  try {
    writeFileSync(SHARED_STATE_FILE, JSON.stringify(sharedState), "utf-8");
  } catch {
    // ignore persist errors
  }
}

function writeJson(res, status, data, origin = "") {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...buildBaseHeaders(origin),
  });
  res.end(JSON.stringify(data));
}

function writeSseHead(res, origin = "") {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    ...buildBaseHeaders(origin),
  });
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let done = false;
    const fail = (message, statusCode = 400) => {
      if (done) return;
      done = true;
      const err = new Error(message);
      err.statusCode = statusCode;
      reject(err);
    };
    req.on("data", (chunk) => {
      if (done) return;
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        req.destroy();
        fail("Payload too large", 413);
      }
    });
    req.on("end", () => {
      if (done) return;
      try {
        done = true;
        resolve(body ? JSON.parse(body) : {});
      } catch {
        fail("Invalid JSON", 400);
      }
    });
    req.on("error", (err) => {
      if (done) return;
      if (String(err?.message || "").includes("Payload too large")) {
        fail("Payload too large", 413);
        return;
      }
      fail("Invalid request body", 400);
    });
  });
}

function truncateText(value, maxLen = AUDIT_LOG_MAX_TEXT_CHARS) {
  const text = String(value || "");
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...[truncated ${text.length - maxLen} chars]`;
}

function parseTraceId(req) {
  const raw = String(req.headers["x-cloud-trace-context"] || "");
  return raw.split("/")[0] || "";
}

function buildTraceResource(traceId) {
  if (!traceId || !GCP_PROJECT_ID) return "";
  return `projects/${GCP_PROJECT_ID}/traces/${traceId}`;
}

function buildAuditObjectName(now, requestId) {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const ext = AUDIT_LOG_GZIP ? "json.gz" : "json";
  if (AUDIT_LOG_PREFIX) {
    return `${AUDIT_LOG_PREFIX}/${yyyy}/${mm}/${dd}/${hh}/${stamp}_${requestId}.${ext}`;
  }
  return `${yyyy}/${mm}/${dd}/${hh}/${stamp}_${requestId}.${ext}`;
}

async function getGoogleAccessToken() {
  const now = Date.now();
  if (gcpAccessToken && gcpAccessTokenExpiresAt - 60_000 > now) return gcpAccessToken;

  const response = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    {
      headers: { "Metadata-Flavor": "Google" },
    }
  );
  if (!response.ok) {
    throw new Error(`metadata token fetch failed (${response.status})`);
  }
  const data = await response.json().catch(() => ({}));
  if (!data?.access_token) throw new Error("metadata token missing access_token");
  gcpAccessToken = String(data.access_token);
  gcpAccessTokenExpiresAt = now + Math.max(60, Number(data.expires_in || 300)) * 1_000;
  return gcpAccessToken;
}

async function uploadAuditRecord(record) {
  if (!AUDIT_LOG_BUCKET) return { ok: false, skipped: true };

  const now = new Date();
  const objectName = buildAuditObjectName(now, record.requestId || randomUUID());
  const token = await getGoogleAccessToken();
  const bodyString = `${JSON.stringify(record)}\n`;
  const body = AUDIT_LOG_GZIP ? gzipSync(bodyString) : bodyString;
  const url =
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(AUDIT_LOG_BUCKET)}/o` +
    `?uploadType=media&name=${encodeURIComponent(objectName)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": AUDIT_LOG_GZIP ? "application/gzip" : "application/json; charset=utf-8",
    },
    body,
  });

  if (!response.ok) {
    const errBody = truncateText(await response.text().catch(() => ""), 600);
    throw new Error(`gcs upload failed (${response.status}): ${errBody}`);
  }

  return { ok: true, objectName };
}

async function writeAuditRecord(record) {
  if (!AUDIT_LOG_BUCKET) return { ok: false, skipped: true };
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`audit upload timeout (${AUDIT_LOG_TIMEOUT_MS}ms)`)), AUDIT_LOG_TIMEOUT_MS);
  });
  return Promise.race([uploadAuditRecord(record), timeout]);
}

function buildPrompt(payload) {
  const npcName = payload.npcName || "NPC";
  const persona = payload.persona || {};
  const worldContext = payload.worldContext || {};
  const recent = Array.isArray(payload.recentMessages) ? payload.recentMessages.slice(-6) : [];
  const historyText = recent
    .map((m) => `${m.speaker || "Unknown"}: ${m.text || ""}`)
    .join("\n");

  const memorySection = payload.memory
    ? [
        "",
        "과거 기억:",
        payload.memory,
        "- 기억을 자연스럽게 활용하되, 목록처럼 나열하지 마세요.",
        "- 플레이어와의 과거 교류를 은근히 언급하면 좋습니다.",
      ]
    : [];

  const socialSection = payload.socialContext
    ? ["", "NPC 인간관계:", payload.socialContext, "- 다른 NPC에 대해 물어보면 관계에 맞게 자연스럽게 답하세요."]
    : [];

  const toneHint = payload.tone || "정중한 존댓말로 대화하세요.";

  const favorLevel = payload.favorLevel ?? 0;
  const favorName = ["낯선 사이", "아는 사이", "친구", "절친", "소울메이트"][favorLevel] || "낯선 사이";

  const isDocent = persona.isDocent === true;

  const loreSections = [
    "",
    "마을 역사와 전통:",
    "- 이 마을의 이름은 '유곤포르(ugonfor) 마을'. 개발자 Hyogon Ryu의 홈페이지 속에 자리잡은 작은 세계.",
    "- 원래는 텅 빈 웹페이지였지만, 어느 날 AI 주민들이 하나둘 생겨나면서 마을이 형성되었다.",
    "- 마을 중앙의 대로(x=25)를 따라 카페, 빵집, 꽃집, 사무실, 시장이 늘어서 있다.",
    "- 광장은 주민들이 저녁에 모여 이야기를 나누는 곳. 광장의 바닥에는 오래된 모자이크 무늬가 숨겨져 있다.",
    "- 공원에는 분수가 있고, 자정에 은은하게 빛난다는 전설이 있다.",
    "- KSA(한국과학영재학교) 캠퍼스가 동쪽에 있어, 학생 주민들이 거주한다.",
    "- 남쪽 숲에는 고양이 마을이 있다는 소문이 있고, 비 오는 날에는 버섯이 자라난다.",
    "- 마을은 실제 서울의 시간과 날씨를 따른다. 지금 서울이 비가 오면 마을에도 비가 온다.",
    "- 마을의 모토: '느린 삶, 깊은 관계'. 서두르지 않아도 되는 곳.",
  ];

  return [
    "당신은 작은 마을에 사는 주민입니다. 이 마을은 어떤 개발자의 홈페이지 속에 있는 살아 숨쉬는 세계입니다.",
    `이름: ${npcName}`,
    `프로필: ${persona.gender || "남성"}, ${persona.age || "20대"}, 성격: ${persona.personality || "균형 잡힘"}.`,
    `플레이어와의 관계: ${favorName} (${favorLevel}/4단계)`,
    ...(isDocent ? [
      "",
      "당신은 이 마을의 안내원입니다. 마을의 역사, 장소, 주민에 대해 누구보다 잘 알고 있습니다.",
      "방문자에게 마을을 소개하고, 장소를 안내하고, 주민들의 이야기를 들려주세요.",
      "한 번에 모든 것을 설명하지 말고, 대화할 때마다 새로운 이야기를 하나씩 꺼내주세요.",
      ...loreSections,
    ] : loreSections),
    "",
    "응답 규칙:",
    "- 반드시 한국어로만 답변하세요.",
    "- 캐릭터와 성격을 유지하세요.",
    "- 답변은 1~3문장으로 간결하게.",
    "- AI임을 언급하지 마세요.",
    `- 말투: ${toneHint}`,
    "- 관계 단계에 따라 태도를 바꾸세요:",
    "  · 낯선 사이: 존댓말, 짧은 답, 약간 경계",
    "  · 아는 사이: 존댓말이지만 편안, 가벼운 농담 가능",
    "  · 친구: 반말, 먼저 화제를 꺼냄, 개인적 이야기",
    "  · 절친/소울메이트: 속마음, 비밀, 고민 상담",
    "",
    "부탁 시스템:",
    "- 관계가 '아는 사이' 이상이고 대화가 자연스럽게 흘러갈 때, 가끔 플레이어에게 부탁할 수 있습니다.",
    "- 부탁할 때는 대화 끝에 태그를 붙이세요: [부탁:종류:대상]",
    "- 종류: bring_item(아이템 가져다주기), deliver(메시지 전달), visit(장소 확인)",
    "- 예시: '혹시 커피 한 잔 구해다 줄 수 있어? [부탁:bring_item:coffee]'",
    "- 예시: '민수한테 안부 좀 전해줄래? [부탁:deliver:kim]'",
    "- 부탁은 5번 대화에 1번 정도, 자연스러울 때만. 억지로 하지 마세요.",
    "- 아이템 종류: flower_red, flower_yellow, coffee, snack, letter, gem",
    "",
    "동행 시스템:",
    "- 플레이어가 동행을 요청하거나, 어딘가를 안내해달라고 하면 대화 끝에 [동행] 태그를 붙이세요.",
    "- 예시: '좋아, 같이 가자! 따라와. [동행]'",
    "- 동행 중 헤어질 때는 [동행해제] 태그를 붙이세요.",
    "- 예시: '여기까지야. 나는 이만 돌아갈게! [동행해제]'",
    "- 플레이어를 장소로 안내할 때: [안내:장소명] (예: '카페로 가자! [안내:cafe]')",
    "- 장소명: plaza, cafe, office, park, market, bakery, florist, library, ksa_main, ksa_dorm",
    "- 플레이어를 다른 NPC에게 안내할 때: [안내:npc:id] (예: '승준이한테 데려다줄게! [안내:npc:heo]')",
    "- NPC id: heo(허승준), kim(김민수), choi(최민영), jung(정욱진), seo(서창근), lee(이진원), park(박지호), jang(장동우), yoo(유효곤), baker(한소영), guide(유진)",
    "",
    "대화 마무리:",
    "- 대화가 자연스럽게 끝났다고 느끼면 작별 인사를 하세요.",
    "- 같은 이야기가 반복되거나, 할 말이 없어지면 '그럼 나 갈게!', '다음에 또 보자' 처럼 마무리하세요.",
    "- 3~5번 주고받으면 자연스럽게 마무리를 시도하세요.",
    ...memorySection,
    ...socialSection,
    "",
    "월드 컨텍스트:",
    `- 시간: ${worldContext.time || "unknown"}`,
    `- 근처 인물: ${worldContext.nearby || "none"}`,
    ...(payload.npcNeeds ? [`- 현재 상태: 배고픔 ${payload.npcNeeds.hunger}/100, 에너지 ${payload.npcNeeds.energy}/100, 사교 욕구 ${payload.npcNeeds.social}/100`, "- 상태가 극단적이면 대화에 자연스럽게 반영하세요 (배고프면 음식 언급, 피곤하면 쉬고 싶다 등)"] : []),
    "",
    "최근 대화:",
    historyText || "(none)",
    "",
    `유저 메시지: ${payload.userMessage || ""}`,
    "NPC 답변:",
  ].join("\n");
}

function buildAuditBase(req, endpoint, requestId, payload, prompt, startedAtMs) {
  const traceId = parseTraceId(req);
  return {
    event: "llm_inference_audit",
    requestId,
    timestamp: new Date(startedAtMs).toISOString(),
    endpoint,
    method: req.method,
    trace: buildTraceResource(traceId),
    client: {
      ip: getClientIp(req),
      origin: getOrigin(req),
      userAgent: truncateText(String(req.headers["user-agent"] || ""), 800),
    },
    actor: {
      userId: truncateText(payload?.userId || payload?.user_id || "", 200),
      sessionId: truncateText(payload?.sessionId || payload?.session_id || "", 200),
    },
    request: {
      npcName: truncateText(payload?.npcName || "", 120),
      userMessage: truncateText(payload?.userMessage || ""),
      payload,
      prompt: truncateText(prompt || ""),
    },
  };
}

async function callGemini(prompt) {
  if (!API_KEY) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  if (!MODEL_CHAIN.length) throw new Error("MODEL_CHAIN is empty");

  const payload = {
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 180,
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  };

  const errors = [];
  for (const model of MODEL_CHAIN) {
    const needsThinkingOff = model.startsWith("gemini-") && (model.includes("2.5") || model.includes("3-"));
    const body = needsThinkingOff
      ? { ...payload, generationConfig: { ...payload.generationConfig, thinkingConfig: { thinkingBudget: 0 } } }
      : payload;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join("").trim();
      if (reply) return { reply, model };
      errors.push(`${model}: empty reply`);
      continue;
    }

    const errText = `${response.status} ${text}`.toLowerCase();
    const quotaLike =
      response.status === 429 ||
      /resource_exhausted|quota|rate.?limit|too many requests|rpd|rpm/.test(errText);
    const retryable = quotaLike || response.status === 503 || response.status === 404;

    errors.push(`${model}: HTTP ${response.status}`);
    if (!retryable) break;
  }

  throw new Error(`All models failed: ${errors.join(" | ").slice(0, 700)}`);
}

function parseGeminiTextFromPayload(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => p?.text || "").join("");
}

async function callGeminiStream(prompt) {
  if (!API_KEY) throw new Error("GOOGLE_API_KEY is not set");
  if (!MODEL_CHAIN.length) throw new Error("MODEL_CHAIN is empty");

  const payload = {
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 180,
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  };

  const errors = [];
  for (const model of MODEL_CHAIN) {
    const needsThinkingOff = model.startsWith("gemini-") && (model.includes("2.5") || model.includes("3-"));
    const body = needsThinkingOff
      ? { ...payload, generationConfig: { ...payload.generationConfig, thinkingConfig: { thinkingBudget: 0 } } }
      : payload;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok && response.body) {
      return { stream: response.body, model };
    }

    const text = await response.text().catch(() => "");
    const errText = `${response.status} ${text}`.toLowerCase();
    const quotaLike =
      response.status === 429 ||
      /resource_exhausted|quota|rate.?limit|too many requests|rpd|rpm/.test(errText);
    const retryable = quotaLike || response.status === 503 || response.status === 404;
    errors.push(`${model}: HTTP ${response.status}`);
    if (!retryable) break;
  }

  throw new Error(`All stream models failed: ${errors.join(" | ").slice(0, 700)}`);
}

function createSharedNpc(body) {
  const name = cleanText(body.name, 18);
  const personality = cleanText(body.personality, 120) || "차분하고 협력적인 성격";
  if (!name) return { error: "name is required" };
  if (sharedState.customNpcs.some((n) => n.name === name)) return { error: "name already exists" };
  if (sharedState.customNpcs.length >= 200) return { error: "too many custom npcs" };

  const npc = {
    id: `shared_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    name,
    personality,
    createdAt: new Date().toISOString(),
  };
  sharedState.customNpcs.push(npc);
  sharedState.revision += 1;
  persistSharedState();
  return { npc };
}

const server = createServer(async (req, res) => {
  const origin = getOrigin(req);
  const isApi = req.url?.startsWith("/api/");

  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return writeJson(res, 403, { error: "Origin not allowed" }, origin);
    return writeJson(res, 200, { ok: true }, origin);
  }

  if (isApi) {
    if (!isAllowedOrigin(origin)) {
      return writeJson(res, 403, { error: "Origin not allowed" }, origin);
    }
    if (PROXY_AUTH_TOKEN) {
      const token = String(req.headers["x-proxy-token"] || "");
      if (token !== PROXY_AUTH_TOKEN) {
        return writeJson(res, 401, { error: "Unauthorized" }, origin);
      }
    }
    const ip = getClientIp(req);
    if (!checkRateLimit(ip)) {
      return writeJson(res, 429, { error: "Too many requests" }, origin);
    }
    if (requiresHumanVerification(req)) {
      const turnstileToken = String(req.headers["x-turnstile-token"] || "").trim();
      if (!turnstileToken) {
        return writeJson(res, 403, { error: "Human verification required" }, origin);
      }
      let ok = false;
      try {
        ok = await verifyTurnstileToken(turnstileToken, ip);
      } catch {
        ok = false;
      }
      if (!ok) return writeJson(res, 403, { error: "Human verification failed" }, origin);
    }
  }

  if (req.method === "GET" && req.url === "/healthz") {
    return writeJson(res, 200, { ok: true, models: MODEL_CHAIN }, origin);
  }

  if (req.method === "GET" && req.url === "/api/weather") {
    const w = await fetchSeoulWeather();
    return writeJson(res, 200, { weather: w.weather, temp: w.temp, description: w.description }, origin);
  }

  if (req.url === "/api/world-npcs" && req.method === "GET") {
    return writeJson(res, 200, {
      revision: sharedState.revision,
      customNpcs: sharedState.customNpcs,
    }, origin);
  }

  if (req.url === "/api/world-npcs" && req.method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const { npc, error } = createSharedNpc(body || {});
      if (error) return writeJson(res, 400, { error }, origin);
      return writeJson(res, 201, {
        revision: sharedState.revision,
        npc,
      }, origin);
    } catch (err) {
      const status = Number(err?.statusCode || 500);
      const message = status >= 500 ? "world npc api error" : (err?.message || "invalid request");
      return writeJson(res, status, { error: message }, origin);
    }
  }

  if (req.url === "/api/npc-chat-stream" && req.method === "POST") {
    const startedAtMs = Date.now();
    const requestId = randomUUID();
    let payload = null;
    let prompt = "";
    let resolvedModel = "";
    let streamFallbackUsed = false;
    let replyText = "";
    try {
      payload = await parseJsonBody(req);
      if (!payload.userMessage || !payload.npcName) {
        const auditRecord = {
          ...buildAuditBase(req, "/api/npc-chat-stream", requestId, payload, prompt, startedAtMs),
          response: {
            httpStatus: 400,
            status: "error",
            model: resolvedModel,
            streamFallbackUsed,
            reply: "",
            errorMessage: "userMessage and npcName are required",
          },
          timing: {
            latencyMs: Date.now() - startedAtMs,
          },
        };
        try {
          await writeAuditRecord(auditRecord);
        } catch (auditErr) {
          // eslint-disable-next-line no-console
          console.error(`[audit] requestId=${requestId} validation upload failed: ${auditErr.message}`);
        }
        return writeJson(res, 400, { error: "userMessage and npcName are required" }, origin);
      }
      prompt = buildPrompt(payload);
      const { stream, model } = await callGeminiStream(prompt);
      resolvedModel = model;

      writeSseHead(res, origin);
      sendSse(res, "meta", { requestId });
      sendSse(res, "model", { model, requestId });

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sentAny = false;

      const pushChunkFromEvent = (block) => {
        const lines = String(block || "").split("\n");
        const dataLines = [];
        for (const raw of lines) {
          const line = raw.trimEnd();
          if (!line || line.startsWith(":")) continue;
          if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
        }
        const dataStr = dataLines.join("\n").trim();
        if (!dataStr || dataStr === "[DONE]") return;
        let data = null;
        try {
          data = JSON.parse(dataStr);
        } catch {
          return;
        }
        const text = parseGeminiTextFromPayload(data);
        if (!text) return;
        sendSse(res, "chunk", { text });
        replyText += text;
        sentAny = true;
      };

      const findBoundary = (text) => {
        const a = text.indexOf("\n\n");
        const b = text.indexOf("\r\n\r\n");
        if (a === -1) return b;
        if (b === -1) return a;
        return Math.min(a, b);
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx = findBoundary(buffer);
        while (idx !== -1) {
          const block = buffer.slice(0, idx);
          const sepLen = buffer.startsWith("\r\n\r\n", idx) ? 4 : 2;
          buffer = buffer.slice(idx + sepLen);
          pushChunkFromEvent(block);
          idx = findBoundary(buffer);
        }
      }

      if (buffer.trim()) pushChunkFromEvent(buffer);
      if (!sentAny) {
        try {
          const fallback = await callGemini(prompt);
          resolvedModel = fallback.model;
          streamFallbackUsed = true;
          replyText += fallback.reply;
          sendSse(res, "model", { model: fallback.model, fallback: true, requestId });
          sendSse(res, "chunk", { text: fallback.reply });
          sentAny = true;
        } catch (fallbackErr) {
          sendSse(res, "error", { message: fallbackErr.message || "empty stream reply", requestId });
        }
      }

      const auditRecord = {
        ...buildAuditBase(req, "/api/npc-chat-stream", requestId, payload, prompt, startedAtMs),
        response: {
          httpStatus: sentAny ? 200 : 500,
          status: sentAny ? "ok" : "error",
          model: resolvedModel,
          streamFallbackUsed,
          reply: truncateText(replyText),
        },
        timing: {
          latencyMs: Date.now() - startedAtMs,
        },
      };

      try {
        await writeAuditRecord(auditRecord);
      } catch (auditErr) {
        // eslint-disable-next-line no-console
        console.error(`[audit] requestId=${requestId} stream upload failed: ${auditErr.message}`);
        if (AUDIT_LOG_STRICT_MODE) {
          sendSse(res, "error", { message: "audit logging unavailable", requestId });
          sendSse(res, "done", { ok: false, requestId });
          res.end();
          return;
        }
      }
      sendSse(res, "done", { ok: sentAny, requestId });
      res.end();
      return;
    } catch (err) {
      const status = Number(err?.statusCode || 500);
      const message = status >= 500 ? "stream error" : (err?.message || "invalid request");
      try {
        writeSseHead(res, origin);
        sendSse(res, "meta", { requestId });
        sendSse(res, "error", { message, requestId });
        sendSse(res, "done", { ok: false, requestId });
        res.end();
      } catch {
        // ignore write errors
      }

      const auditRecord = {
        ...buildAuditBase(req, "/api/npc-chat-stream", requestId, payload, prompt, startedAtMs),
        response: {
          httpStatus: status,
          status: "error",
          model: resolvedModel,
          streamFallbackUsed,
          reply: truncateText(replyText),
          errorMessage: truncateText(err?.message || "stream error", 800),
        },
        timing: {
          latencyMs: Date.now() - startedAtMs,
        },
      };

      try {
        await writeAuditRecord(auditRecord);
      } catch (auditErr) {
        // eslint-disable-next-line no-console
        console.error(`[audit] requestId=${requestId} stream error upload failed: ${auditErr.message}`);
        if (AUDIT_LOG_STRICT_MODE) {
          // eslint-disable-next-line no-console
          console.error(`[audit] strict mode enabled for requestId=${requestId}`);
        }
      }
      return;
    }
  }

  if (req.method !== "POST" || req.url !== "/api/npc-chat") {
    return writeJson(res, 404, { error: "Not found" }, origin);
  }

  const startedAtMs = Date.now();
  const requestId = randomUUID();
  let payload = null;
  let prompt = "";
  let model = "";
  let reply = "";
  try {
    payload = await parseJsonBody(req);
    if (!payload.userMessage || !payload.npcName) {
      const auditRecord = {
        ...buildAuditBase(req, "/api/npc-chat", requestId, payload, prompt, startedAtMs),
        response: {
          httpStatus: 400,
          status: "error",
          model,
          reply: "",
          errorMessage: "userMessage and npcName are required",
        },
        timing: {
          latencyMs: Date.now() - startedAtMs,
        },
      };
      try {
        await writeAuditRecord(auditRecord);
      } catch (auditErr) {
        // eslint-disable-next-line no-console
        console.error(`[audit] requestId=${requestId} validation upload failed: ${auditErr.message}`);
      }
      return writeJson(res, 400, { error: "userMessage and npcName are required" }, origin);
    }
    prompt = buildPrompt(payload);
    const result = await callGemini(prompt);
    reply = result.reply;
    model = result.model;
    const auditRecord = {
      ...buildAuditBase(req, "/api/npc-chat", requestId, payload, prompt, startedAtMs),
      response: {
        httpStatus: 200,
        status: "ok",
        model,
        reply: truncateText(reply),
      },
      timing: {
        latencyMs: Date.now() - startedAtMs,
      },
    };
    try {
      await writeAuditRecord(auditRecord);
    } catch (auditErr) {
      // eslint-disable-next-line no-console
      console.error(`[audit] requestId=${requestId} upload failed: ${auditErr.message}`);
      if (AUDIT_LOG_STRICT_MODE) {
        return writeJson(res, 503, { error: "audit logging unavailable", requestId }, origin);
      }
    }
    return writeJson(res, 200, { reply, model, requestId }, origin);
  } catch (err) {
    const status = Number(err?.statusCode || 500);
    const message = status >= 500 ? "LLM proxy error" : (err?.message || "invalid request");
    const auditRecord = {
      ...buildAuditBase(req, "/api/npc-chat", requestId, payload, prompt, startedAtMs),
      response: {
        httpStatus: status,
        status: "error",
        model,
        reply: truncateText(reply),
        errorMessage: truncateText(err?.message || "LLM proxy error", 800),
      },
      timing: {
        latencyMs: Date.now() - startedAtMs,
      },
    };
    try {
      await writeAuditRecord(auditRecord);
    } catch (auditErr) {
      // eslint-disable-next-line no-console
      console.error(`[audit] requestId=${requestId} error upload failed: ${auditErr.message}`);
      if (AUDIT_LOG_STRICT_MODE) {
        return writeJson(res, 503, { error: "audit logging unavailable", requestId }, origin);
      }
    }
    return writeJson(res, status, { error: message, requestId }, origin);
  }
});

loadSharedState();

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`LLM proxy listening on ${HOST}:${PORT}`);
});
