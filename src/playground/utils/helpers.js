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
  return cleaned || "플레이어";
}

export function bubbleText(text) {
  return String(text || "").trim();
}

export function inferPersonalityFromName(name) {
  const tones = [
    "침착하고 배려심이 많은 성격",
    "유쾌하고 추진력 있는 성격",
    "논리적이고 집중력이 높은 성격",
    "친화적이고 대화가 부드러운 성격",
    "도전적이고 호기심이 많은 성격",
  ];
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return tones[sum % tones.length];
}

export function nowMs() {
  return performance.now();
}

export function socialKey(a, b) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export function npcRelationLabel(value) {
  if (value >= 80) return "절친";
  if (value >= 65) return "친구";
  if (value >= 45) return "보통";
  if (value >= 25) return "서먹";
  return "불화";
}
