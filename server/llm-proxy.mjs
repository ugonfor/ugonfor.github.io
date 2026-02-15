import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || (process.env.K_SERVICE ? "0.0.0.0" : "127.0.0.1");
const API_KEY = process.env.GOOGLE_API_KEY || "";
const MODEL_CHAIN = (process.env.MODEL_CHAIN ||
  "gemini-2.0-flash,gemini-2.5-pro,gemma-3-27b-it,gemma-3-12b-it")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const SHARED_STATE_FILE = process.env.SHARED_STATE_FILE || "/tmp/playground-shared-state.json";
const MAX_BODY_BYTES = Math.max(8_192, Number(process.env.MAX_BODY_BYTES || 1_000_000));
const RATE_LIMIT_WINDOW_MS = Math.max(1_000, Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000));
const RATE_LIMIT_MAX = Math.max(1, Number(process.env.RATE_LIMIT_MAX || 90));
const PROXY_AUTH_TOKEN = String(process.env.PROXY_AUTH_TOKEN || "").trim();
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

const sharedState = {
  revision: 0,
  customNpcs: [],
};

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

function buildPrompt(payload) {
  const npcName = payload.npcName || "NPC";
  const persona = payload.persona || {};
  const worldContext = payload.worldContext || {};
  const recent = Array.isArray(payload.recentMessages) ? payload.recentMessages.slice(-6) : [];
  const historyText = recent
    .map((m) => `${m.speaker || "Unknown"}: ${m.text || ""}`)
    .join("\n");

  return [
    "당신은 오픈월드 시뮬레이션 게임의 NPC입니다.",
    `NPC 이름: ${npcName}`,
    `프로필: ${persona.gender || "남성"}, ${persona.age || "20대"}, 성격: ${persona.personality || "균형 잡힘"}.`,
    "응답 규칙:",
    "- 반드시 한국어로만 답변하세요.",
    "- 캐릭터를 유지하세요.",
    "- 답변은 1~3문장으로 간결하게.",
    "- AI 모델임을 언급하지 마세요.",
    "- 목표를 물어보면 월드 루틴/관계/퀘스트 힌트를 자연스럽게 설명하세요.",
    "",
    "월드 컨텍스트:",
    `- 시간: ${worldContext.time || "unknown"}`,
    `- 현재 목표: ${worldContext.objective || "none"}`,
    `- 퀘스트 완료 여부: ${worldContext.questDone ? "완료" : "진행중"}`,
    `- 근처 인물: ${worldContext.nearby || "none"}`,
    `- 관계 요약: ${JSON.stringify(worldContext.relationSummary || {})}`,
    "",
    "최근 대화:",
    historyText || "(none)",
    "",
    `유저 메시지: ${payload.userMessage || ""}`,
    "NPC 답변:",
  ].join("\n");
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    try {
      const payload = await parseJsonBody(req);
      if (!payload.userMessage || !payload.npcName) {
        return writeJson(res, 400, { error: "userMessage and npcName are required" }, origin);
      }
      const prompt = buildPrompt(payload);
      const { stream, model } = await callGeminiStream(prompt);

      writeSseHead(res, origin);
      sendSse(res, "model", { model });

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
          sendSse(res, "model", { model: fallback.model, fallback: true });
          sendSse(res, "chunk", { text: fallback.reply });
          sentAny = true;
        } catch (fallbackErr) {
          sendSse(res, "error", { message: fallbackErr.message || "empty stream reply" });
        }
      }
      sendSse(res, "done", { ok: sentAny });
      res.end();
      return;
    } catch (err) {
      try {
        writeSseHead(res, origin);
        const status = Number(err?.statusCode || 500);
        const message = status >= 500 ? "stream error" : (err?.message || "invalid request");
        sendSse(res, "error", { message });
        sendSse(res, "done", { ok: false });
        res.end();
      } catch {
        // ignore write errors
      }
      return;
    }
  }

  if (req.method !== "POST" || req.url !== "/api/npc-chat") {
    return writeJson(res, 404, { error: "Not found" }, origin);
  }

  try {
    const payload = await parseJsonBody(req);
    if (!payload.userMessage || !payload.npcName) {
      return writeJson(res, 400, { error: "userMessage and npcName are required" }, origin);
    }
    const prompt = buildPrompt(payload);
    const { reply, model } = await callGemini(prompt);
    return writeJson(res, 200, { reply, model }, origin);
  } catch (err) {
    const status = Number(err?.statusCode || 500);
    const message = status >= 500 ? "LLM proxy error" : (err?.message || "invalid request");
    return writeJson(res, status, { error: message }, origin);
  }
});

loadSharedState();

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`LLM proxy listening on ${HOST}:${PORT}`);
});
