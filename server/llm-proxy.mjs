import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || (process.env.K_SERVICE ? "0.0.0.0" : "127.0.0.1");
const API_KEY = process.env.GOOGLE_API_KEY || "";
const MODEL_CHAIN = (process.env.MODEL_CHAIN ||
  "gemini-2.5-pro,gemini-2.0-flash,gemma-3-27b-it,gemma-3-12b-it")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const SHARED_STATE_FILE = process.env.SHARED_STATE_FILE || "/tmp/playground-shared-state.json";

const sharedState = {
  revision: 0,
  customNpcs: [],
};

function loadSharedState() {
  try {
    if (!existsSync(SHARED_STATE_FILE)) return;
    const raw = readFileSync(SHARED_STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.customNpcs)) return;
    sharedState.revision = Number(parsed.revision || 0);
    sharedState.customNpcs = parsed.customNpcs.slice(0, 200).map((npc) => ({
      id: String(npc.id || ""),
      name: String(npc.name || "").slice(0, 18),
      personality: String(npc.personality || "").slice(0, 120),
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

function writeJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
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

function cleanText(value, maxLen) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLen);
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
  if (req.method === "OPTIONS") {
    return writeJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && req.url === "/healthz") {
    return writeJson(res, 200, { ok: true, models: MODEL_CHAIN });
  }

  if (req.url === "/api/world-npcs" && req.method === "GET") {
    return writeJson(res, 200, {
      revision: sharedState.revision,
      customNpcs: sharedState.customNpcs,
    });
  }

  if (req.url === "/api/world-npcs" && req.method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const { npc, error } = createSharedNpc(body || {});
      if (error) return writeJson(res, 400, { error });
      return writeJson(res, 201, {
        revision: sharedState.revision,
        npc,
      });
    } catch (err) {
      return writeJson(res, 500, { error: err.message || "world npc api error" });
    }
  }

  if (req.method !== "POST" || req.url !== "/api/npc-chat") {
    return writeJson(res, 404, { error: "Not found" });
  }

  try {
    const payload = await parseJsonBody(req);
    if (!payload.userMessage || !payload.npcName) {
      return writeJson(res, 400, { error: "userMessage and npcName are required" });
    }
    const prompt = buildPrompt(payload);
    const { reply, model } = await callGemini(prompt);
    return writeJson(res, 200, { reply, model });
  } catch (err) {
    return writeJson(res, 500, { error: err.message || "LLM proxy error" });
  }
});

loadSharedState();

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`LLM proxy listening on ${HOST}:${PORT}`);
});
