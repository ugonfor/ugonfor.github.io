import { readFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BUILD_FILE = resolve(ROOT, "dist/assets/js/playground-world.js");

let passed = 0;
let failed = 0;

function check(label, ok, detail) {
  if (ok) {
    passed++;
    console.log(`  ✅ PASS  ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  ❌ FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------------------
// A. File existence & basics
// ---------------------------------------------------------------------------
console.log("\n[A] File existence & basics");

let fileExists = false;
let fileSize = 0;
let content = "";

try {
  const stat = statSync(BUILD_FILE);
  fileExists = true;
  fileSize = stat.size;
  content = readFileSync(BUILD_FILE, "utf-8");
} catch {
  // file missing
}

check("File exists", fileExists, fileExists ? BUILD_FILE : "file not found");
check(
  "File not empty",
  fileSize > 0,
  `${(fileSize / 1024).toFixed(1)} KB`
);

// ---------------------------------------------------------------------------
// B. Syntax validation
// ---------------------------------------------------------------------------
console.log("\n[B] Syntax validation");

let syntaxOk = false;
if (fileExists) {
  try {
    execSync(`node --check "${BUILD_FILE}"`, { stdio: "pipe" });
    syntaxOk = true;
  } catch {
    // syntax error
  }
}
check("node --check (no syntax errors)", syntaxOk);

// ---------------------------------------------------------------------------
// C. IIFE structure
// ---------------------------------------------------------------------------
console.log("\n[C] IIFE structure");

const firstLine = content.split("\n")[0] ?? "";
check(
  "Starts with (function()",
  firstLine.startsWith("(function()"),
  `first line: ${firstLine.slice(0, 40)}…`
);

// ---------------------------------------------------------------------------
// D. DOM ID patterns (40+)
// ---------------------------------------------------------------------------
console.log("\n[D] DOM ID patterns");

const domIds = [
  "pg-world-canvas",
  "pg-time",
  "pg-player",
  "pg-nearby",
  "pg-quest",
  "pg-rel",
  "pg-log",
  "pg-minimap",
  "pg-chat-target",
  "pg-chat-log",
  "pg-chat-input",
  "pg-chat-send",
  "pg-chat-close",
  "pg-status-toggle",
  "pg-log-toggle",
  "pg-chat-active-target",
  "pg-chat-active-state",
  "pg-chat-model",
  "pg-create-name",
  "pg-create-personality",
  "pg-create-btn",
  "pg-create-status",
  "pg-remove-select",
  "pg-remove-btn",
  "pg-online",
  "pg-quest-banner",
  "pg-quest-banner-title",
  "pg-quest-banner-objective",
  "pg-save",
  "pg-load",
  "pg-rename",
  "pg-ui-toggle",
  "pg-toggle-left",
  "pg-toggle-right",
  "pg-toggle-chat",
  "pg-mobile-interact",
  "pg-mobile-run",
  "pg-mobile-pause",
  "pg-mobile-reset",
  "pg-mobile-utility",
  "pg-joystick-base",
  "pg-joystick-knob",
];

let domPass = 0;
let domFail = 0;
for (const id of domIds) {
  if (content.includes(id)) {
    domPass++;
  } else {
    domFail++;
    console.log(`    missing: ${id}`);
  }
}
check(
  `DOM IDs present (${domIds.length} checked)`,
  domFail === 0,
  `${domPass} found, ${domFail} missing`
);

// ---------------------------------------------------------------------------
// E. localStorage keys
// ---------------------------------------------------------------------------
console.log("\n[E] localStorage keys");

const lsKeys = [
  "playground_world_state_v2",
  "playground_ui_pref_v1",
  "playground_mobile_sheet_v1",
  "playground_player_name_v1",
  "playground_player_flag_v1",
  "playground_auto_walk_v1",
];

let lsPass = 0;
let lsFail = 0;
for (const key of lsKeys) {
  if (content.includes(key)) {
    lsPass++;
  } else {
    lsFail++;
    console.log(`    missing: ${key}`);
  }
}
check(
  `localStorage keys present (${lsKeys.length} checked)`,
  lsFail === 0,
  `${lsPass} found, ${lsFail} missing`
);

// ---------------------------------------------------------------------------
// F. Key functions / patterns
// ---------------------------------------------------------------------------
console.log("\n[F] Key functions & patterns");

const patterns = [
  "initPlayerName",
  "initMultiplayer",
  "requestAnimationFrame",
  "PG_LLM_API_URL",
  "PG_TURNSTILE_SITE_KEY",
  "PG_FIREBASE_CONFIG",
  "/api/npc-chat-stream",
  "/api/npc-chat",
  "/api/world-npcs",
];

let fnPass = 0;
let fnFail = 0;
for (const pat of patterns) {
  if (content.includes(pat)) {
    fnPass++;
  } else {
    fnFail++;
    console.log(`    missing: ${pat}`);
  }
}
check(
  `Key patterns present (${patterns.length} checked)`,
  fnFail === 0,
  `${fnPass} found, ${fnFail} missing`
);

// ---------------------------------------------------------------------------
// G. Summary
// ---------------------------------------------------------------------------
const total = passed + failed;
console.log("\n" + "=".repeat(50));
console.log(`  Total: ${passed}/${total} passed`);
if (failed > 0) {
  console.log(`  ⚠ ${failed} check(s) FAILED`);
  console.log("=".repeat(50) + "\n");
  process.exit(1);
} else {
  console.log("  All checks passed!");
  console.log("=".repeat(50) + "\n");
}
