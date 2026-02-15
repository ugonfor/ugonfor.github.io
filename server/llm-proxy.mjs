import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || (process.env.K_SERVICE ? "0.0.0.0" : "127.0.0.1");
const API_KEY = process.env.GOOGLE_API_KEY || "";
const MODEL_CHAIN = (process.env.MODEL_CHAIN ||
  "gemini-2.5-pro,gemini-2.0-flash,gemma-3-27b-it,gemma-3-12b-it")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function writeJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    "You are roleplaying as an NPC in an open-world simulation game.",
    `NPC name: ${npcName}`,
    `Profile: male in his ${persona.age || "20s"}, personality: ${persona.personality || "balanced"}.`,
    "Style rules:",
    "- Stay in character.",
    "- Keep responses concise (1-3 sentences).",
    "- Avoid mentioning being an AI model.",
    "- If user asks about goals, refer to world routines, relationships, and quest hints naturally.",
    "",
    "World context:",
    `- Time: ${worldContext.time || "unknown"}`,
    `- Current objective: ${worldContext.objective || "none"}`,
    `- Quest completed: ${worldContext.questDone ? "yes" : "no"}`,
    `- Nearby actor: ${worldContext.nearby || "none"}`,
    `- Relation summary: ${JSON.stringify(worldContext.relationSummary || {})}`,
    "",
    "Recent messages:",
    historyText || "(none)",
    "",
    `User message: ${payload.userMessage || ""}`,
    "NPC reply:",
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

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return writeJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && req.url === "/healthz") {
    return writeJson(res, 200, { ok: true, models: MODEL_CHAIN });
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

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`LLM proxy listening on ${HOST}:${PORT}`);
});
