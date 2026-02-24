export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function shade(hex, delta) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = clamp(parseInt(m[1], 16) + delta, 0, 255);
  const g = clamp(parseInt(m[2], 16) + delta, 0, 255);
  const b = clamp(parseInt(m[3], 16) + delta, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export function randomPastelColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h} 62% 68%)`;
}

export function normalizePlayerName(value) {
  const cleaned = String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
  return cleaned || "Player";
}

export function bubbleText(text) {
  return String(text || "").trim();
}

export function inferPersonalityFromName(name, t) {
  const keys = ["personality_0", "personality_1", "personality_2", "personality_3", "personality_4"];
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return t ? t(keys[sum % keys.length]) : keys[sum % keys.length];
}

export function nowMs() {
  return performance.now();
}

export function socialKey(a, b) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export function npcRelationLabel(value, t) {
  if (t) {
    if (value >= 80) return t("relation_best_friend");
    if (value >= 65) return t("relation_friend");
    if (value >= 45) return t("relation_normal");
    if (value >= 25) return t("relation_awkward");
    return t("relation_hostile");
  }
  // fallback without t (developer context)
  if (value >= 80) return "best_friend";
  if (value >= 65) return "friend";
  if (value >= 45) return "normal";
  if (value >= 25) return "awkward";
  return "hostile";
}
