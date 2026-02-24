import { nowMs } from '../utils/helpers.js';
import { places, itemTypes, npcPersonas, favorLevelNames } from '../core/constants.js';
import { ensureMemoryFormat } from './npc-data.js';

/**
 * Quest system: templates, generation, progression, completion.
 * All functions receive a `ctx` object for shared state access.
 *
 * ctx = { quest, questHistory, questCount, npcs, inventory, relations,
 *         addChat, addLog, t, addNpcMemory, npcById, getNpcRelation,
 *         adjustNpcRelation, adjustRelation, llmReplyOrEmpty, player,
 *         LLM_API_URL, hourOfDay }
 */

export const questTemplates = [
  {
    type: "deliver",
    tier: 1,
    dialogueVariantKeys: [
      ["quest_deliver_d1a", "quest_deliver_d1b", "quest_deliver_d1c"],
      ["quest_deliver_d2a", "quest_deliver_d2b", "quest_deliver_d2c"],
      ["quest_deliver_d3a", "quest_deliver_d3b", "quest_deliver_d3c"],
      ["quest_deliver_d4a", "quest_deliver_d4b", "quest_deliver_d4c"],
    ],
    make(fromNpc, toNpc, _place, _label, _extraNpcs, _twoPlaces, ctx) {
      const t = ctx.t;
      const vk = this.dialogueVariantKeys[Math.floor(Math.random() * this.dialogueVariantKeys.length)];
      return {
        title: t("quest_deliver_title", { name: fromNpc.name }),
        stages: [
          { npcId: fromNpc.id, objective: t("quest_deliver_obj_receive", { name: fromNpc.name }), dialogue: t("quest_deliver_dialogue_start", { target: toNpc.name, line: t(vk[0]) }) },
          { npcId: toNpc.id, objective: t("quest_deliver_obj_deliver", { name: toNpc.name }), dialogue: t(vk[1]) },
          { npcId: fromNpc.id, objective: t("quest_deliver_obj_report", { name: fromNpc.name }), dialogue: t(vk[2]) },
        ],
      };
    },
  },
  {
    type: "explore",
    tier: 1,
    dialogueVariantKeys: [
      ["quest_explore_d1a", "quest_explore_d1b"],
      ["quest_explore_d2a", "quest_explore_d2b"],
      ["quest_explore_d3a", "quest_explore_d3b"],
    ],
    make(npc, _unused, place, placeLabel, _extraNpcs, _twoPlaces, ctx) {
      const t = ctx.t;
      const vk = this.dialogueVariantKeys[Math.floor(Math.random() * this.dialogueVariantKeys.length)];
      return {
        title: t("quest_explore_title", { place: placeLabel }),
        stages: [
          { npcId: npc.id, objective: t("quest_explore_obj_receive", { name: npc.name }), dialogue: t("quest_explore_dialogue_start", { place: placeLabel, line: t(vk[0]) }) },
          { visit: place, radius: 2.5, objective: t("quest_explore_obj_visit", { place: placeLabel }), autoText: t("quest_explore_auto", { place: placeLabel }) },
          { npcId: npc.id, objective: t("quest_explore_obj_report", { name: npc.name }), dialogue: t(vk[1]) },
        ],
      };
    },
  },
  {
    type: "social",
    tier: 1,
    dialogueVariantKeys: [
      ["quest_social_d1a", "quest_social_d1b", "quest_social_d1c"],
      ["quest_social_d2a", "quest_social_d2b", "quest_social_d2c"],
      ["quest_social_d3a", "quest_social_d3b", "quest_social_d3c"],
    ],
    make(npc, _unused, _place, _label, _extraNpcs, _twoPlaces, ctx) {
      const t = ctx.t;
      const vk = this.dialogueVariantKeys[Math.floor(Math.random() * this.dialogueVariantKeys.length)];
      return {
        title: t("quest_social_title", { name: npc.name }),
        stages: [
          { npcId: npc.id, objective: t("quest_social_obj_talk", { name: npc.name }), dialogue: t(vk[0]) },
          { npcId: npc.id, objective: t("quest_social_obj_talk_again", { name: npc.name }), dialogue: t(vk[1]) },
          { npcId: npc.id, objective: t("quest_social_obj_farewell", { name: npc.name }), dialogue: t(vk[2]) },
        ],
      };
    },
  },
  {
    type: "observe",
    tier: 1,
    dialogueVariantKeys: [
      ["quest_observe_d1a", "quest_observe_d1b"],
      ["quest_observe_d2a", "quest_observe_d2b"],
      ["quest_observe_d3a", "quest_observe_d3b"],
    ],
    make(npc, _unused, place, placeLabel, _extraNpcs, _twoPlaces, ctx) {
      const t = ctx.t;
      const vk = this.dialogueVariantKeys[Math.floor(Math.random() * this.dialogueVariantKeys.length)];
      const targetHour = 20 + Math.floor(Math.random() * 4);
      const displayHour = targetHour >= 24 ? targetHour - 24 : targetHour;
      return {
        title: t("quest_observe_title", { place: placeLabel }),
        stages: [
          { npcId: npc.id, objective: t("quest_observe_obj_receive", { name: npc.name }), dialogue: t("quest_observe_dialogue_start", { hour: displayHour, place: placeLabel, line: t(vk[0]) }) },
          { visit: place, radius: 2.5, afterHour: displayHour, objective: t("quest_observe_obj_visit", { hour: displayHour, place: placeLabel }), autoText: t("quest_observe_auto", { place: placeLabel }) },
          { npcId: npc.id, objective: t("quest_explore_obj_report", { name: npc.name }), dialogue: t(vk[1]) },
        ],
      };
    },
  },
  {
    type: "fetch",
    tier: 1,
    make(npc, _unused, _place, _label, _extraNpcs, _twoPlaces, ctx) {
      const t = ctx.t;
      const itemKeys = Object.keys(itemTypes);
      const itemKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
      const info = itemTypes[itemKey];
      const particle = itemKey === "gem" ? "a" : "";
      return {
        title: t("quest_fetch_title", { npc: npc.name, label: t(info.label) }),
        stages: [
          { npcId: npc.id, objective: t("quest_fetch_obj_ask", { npc: npc.name }), dialogue: t("quest_fetch_dialogue_ask", { label: t(info.label), particle }) },
          { requireItem: itemKey, npcId: npc.id, objective: t("quest_fetch_obj_bring", { label: t(info.label), particle, npc: npc.name }), dialogue: t("quest_fetch_dialogue_done", { emoji: info.emoji }) },
        ],
      };
    },
  },
  {
    type: "chain",
    tier: 2,
    make(fromNpc, _unused, _place, _label, extraNpcs, _twoPlaces, ctx) {
      const t = ctx.t;
      const chain = extraNpcs.slice(0, 3);
      if (chain.length < 3) return null;
      return {
        title: t("quest_chain_title", { names: chain.map(n => n.name).join(" → ") }),
        stages: [
          { npcId: fromNpc.id, objective: t("quest_chain_obj_receive", { name: fromNpc.name }), dialogue: t("quest_chain_dialogue_start", { n1: chain[0].name, n2: chain[1].name, n3: chain[2].name }) },
          { npcId: chain[0].id, objective: t("quest_chain_obj_relay", { name: chain[0].name }), dialogue: t("quest_chain_dialogue_1") },
          { npcId: chain[1].id, objective: t("quest_chain_obj_relay", { name: chain[1].name }), dialogue: t("quest_chain_dialogue_2") },
          { npcId: chain[2].id, objective: t("quest_chain_obj_relay", { name: chain[2].name }), dialogue: t("quest_chain_dialogue_3", { name: fromNpc.name }) },
          { npcId: fromNpc.id, objective: t("quest_explore_obj_report", { name: fromNpc.name }), dialogue: t("quest_chain_dialogue_done") },
        ],
      };
    },
  },
  {
    type: "investigate",
    tier: 2,
    make(fromNpc, targetNpc, _place, _label, _extraNpcs, _twoPlaces, ctx) {
      const t = ctx.t;
      const persona = npcPersonas[targetNpc.id] || {};
      const cluePlace = targetNpc.work || targetNpc.hobby || places.plaza;
      const clueLabel = Object.entries(places).find(([, v]) => v === cluePlace)?.[0] || "plaza";
      const cluePlaceName = t("place_" + clueLabel) || clueLabel;
      const personalityText = persona.personality ? t(persona.personality) || persona.personality : "";
      const trait = personalityText.split(/[,\s]/)[0] || "mysterious";
      return {
        title: t("quest_investigate_title"),
        stages: [
          { npcId: fromNpc.id, objective: t("quest_investigate_obj_receive", { name: fromNpc.name }), dialogue: t("quest_investigate_dialogue_start", { trait, place: cluePlaceName }) },
          { visit: cluePlace, radius: 3.0, objective: t("quest_investigate_obj_clue", { place: cluePlaceName }), autoText: t("quest_investigate_auto", { place: cluePlaceName }) },
          { npcId: targetNpc.id, objective: t("quest_investigate_obj_find"), dialogue: t("quest_investigate_dialogue_found", { place: cluePlaceName }) },
          { npcId: fromNpc.id, objective: t("quest_explore_obj_report", { name: fromNpc.name }), dialogue: t("quest_investigate_dialogue_done") },
        ],
      };
    },
  },
  {
    type: "gift_quest",
    tier: 2,
    make(fromNpc, toNpc, _place, _label, _extraNpcs, _twoPlaces, ctx) {
      const t = ctx.t;
      const itemKeys = Object.keys(itemTypes);
      const itemKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
      const info = itemTypes[itemKey];
      const particle = itemKey === "gem" ? "a" : "";
      return {
        title: t("quest_gift_title", { name: toNpc.name }),
        stages: [
          { npcId: fromNpc.id, objective: t("quest_gift_obj_receive", { name: fromNpc.name }), dialogue: t("quest_gift_dialogue_start", { target: toNpc.name, label: t(info.label), particle }) },
          { requireItem: itemKey, npcId: toNpc.id, objective: t("quest_gift_obj_deliver", { label: t(info.label), particle, target: toNpc.name }), dialogue: t("quest_gift_dialogue_deliver", { emoji: info.emoji }) },
          { npcId: fromNpc.id, objective: t("quest_explore_obj_report", { name: fromNpc.name }), dialogue: t("quest_gift_dialogue_done") },
        ],
      };
    },
  },
  {
    type: "nightwatch",
    tier: 3,
    make(npc, _unused, _place, _label, _extraNpcs, twoPlaces, ctx) {
      const t = ctx.t;
      if (!twoPlaces || twoPlaces.length < 2) return null;
      const [p1, p2] = twoPlaces;
      return {
        title: t("quest_nightwatch_title"),
        stages: [
          { npcId: npc.id, objective: t("quest_nightwatch_obj_receive", { name: npc.name }), dialogue: t("quest_nightwatch_dialogue_start", { p1: p1.label, p2: p2.label }) },
          { visit: p1.pos, radius: 2.5, afterHour: 20, objective: t("quest_nightwatch_obj_patrol", { place: p1.label }), autoText: t("quest_nightwatch_auto", { place: p1.label }) },
          { visit: p2.pos, radius: 2.5, afterHour: 20, objective: t("quest_nightwatch_obj_patrol", { place: p2.label }), autoText: t("quest_nightwatch_auto", { place: p2.label }) },
          { npcId: npc.id, objective: t("quest_explore_obj_report", { name: npc.name }), dialogue: t("quest_nightwatch_dialogue_done") },
        ],
      };
    },
  },
  {
    type: "urgent",
    tier: 3,
    make(fromNpc, toNpc, _place, _label, _extraNpcs, _twoPlaces, ctx) {
      const t = ctx.t;
      return {
        title: t("quest_urgent_title"),
        stages: [
          { npcId: fromNpc.id, objective: t("quest_urgent_obj_receive", { name: fromNpc.name }), dialogue: t("quest_urgent_dialogue_start", { target: toNpc.name }) },
          { npcId: toNpc.id, objective: t("quest_urgent_obj_deliver", { name: toNpc.name }), dialogue: t("quest_urgent_dialogue_deliver") },
          { npcId: fromNpc.id, objective: t("quest_explore_obj_report", { name: fromNpc.name }), dialogue: t("quest_urgent_dialogue_done") },
        ],
      };
    },
  },
  {
    type: "mediate",
    tier: 2,
    make(fromNpc, toNpc, _place, _label, _extraNpcs, _twoPlaces, ctx) {
      const t = ctx.t;
      const rel = ctx.getNpcRelation(fromNpc.id, toNpc.id);
      if (rel >= 60) return null;
      return {
        title: t("quest_mediate_title", { a: fromNpc.name, b: toNpc.name }),
        stages: [
          { npcId: fromNpc.id, objective: t("quest_mediate_obj_listen_a", { name: fromNpc.name }), dialogue: t("quest_mediate_dialogue_a", { target: toNpc.name }) },
          { npcId: toNpc.id, objective: t("quest_mediate_obj_listen_b", { name: toNpc.name }), dialogue: t("quest_mediate_dialogue_b", { target: fromNpc.name }) },
          { npcId: fromNpc.id, objective: t("quest_mediate_obj_relay", { name: fromNpc.name, target: toNpc.name }), dialogue: t("quest_mediate_dialogue_relay") },
          { npcId: toNpc.id, objective: t("quest_mediate_obj_reconcile", { name: toNpc.name }), dialogue: t("quest_mediate_dialogue_reconcile") },
        ],
        onComplete() {
          ctx.adjustNpcRelation(fromNpc.id, toNpc.id, 20);
        },
      };
    },
  },
];

function relationKeyForNpc(npcId, relations) {
  return Object.keys(relations).find((k) => k.toLowerCase().includes(npcId.slice(0, 3))) || null;
}

export function advanceDynamicQuest(ctx) {
  const { quest } = ctx;
  quest.stage += 1;
  if (quest.stage >= quest.dynamicStages.length) {
    completeDynamicQuest(ctx);
  } else {
    quest.objective = quest.dynamicStages[quest.stage].objective;
  }
}

export function completeDynamicQuest(ctx) {
  const { quest, questHistory, inventory, relations, addChat, addNpcMemory, npcById, adjustRelation, t } = ctx;
  const title = quest.title;
  const questType = quest.questType || "deliver";
  const primaryNpcId = quest.primaryNpcId || null;
  const startedAt = quest.startedAt || 0;
  quest.objective = t("quest_complete");
  quest.done = true;
  quest.dynamic = false;
  quest.dynamicStages = null;

  const stageCount = quest._stageCount || 3;
  const relKey = primaryNpcId ? relationKeyForNpc(primaryNpcId, relations) : null;
  const favorBoost = 5 + Math.max(0, stageCount - 3) * 2;
  if (relKey) adjustRelation(relKey, favorBoost);

  const primaryNpc = npcById(primaryNpcId);
  if (primaryNpc) {
    const boosted = Math.round(15 * 1 * 1);
    primaryNpc.favorPoints += boosted;
    if (primaryNpc.favorPoints >= 100) {
      primaryNpc.favorLevel = Math.min(primaryNpc.favorLevel + 1, 4);
      primaryNpc.favorPoints = 0;
      addNpcMemory(primaryNpc, "favor", t("quest_memory_favor_up", { level: t(favorLevelNames[primaryNpc.favorLevel]) }));
    }
  }

  if (Math.random() < 0.5) {
    const itemKeys = Object.keys(itemTypes);
    const rewardItem = itemKeys[Math.floor(Math.random() * itemKeys.length)];
    inventory[rewardItem] = (inventory[rewardItem] || 0) + 1;
    const info = itemTypes[rewardItem];
    addChat("System", t("sys_quest_reward", { emoji: info.emoji, label: t(info.label) }));
  }

  if (questType === "urgent" && startedAt > 0) {
    const elapsed = (nowMs() - startedAt) / 1000;
    if (elapsed <= 60) {
      addChat("System", t("sys_urgent_bonus", { sec: Math.round(elapsed) }));
      if (relKey) adjustRelation(relKey, 5);
      if (primaryNpc) {
        primaryNpc.favorPoints += Math.round(10 * 1 * 1);
        if (primaryNpc.favorPoints >= 100) {
          primaryNpc.favorLevel = Math.min(primaryNpc.favorLevel + 1, 4);
          primaryNpc.favorPoints = 0;
          addNpcMemory(primaryNpc, "favor", t("quest_memory_favor_up", { level: t(favorLevelNames[primaryNpc.favorLevel]) }));
        }
      }
    }
  }

  questHistory.unshift({ type: questType, primaryNpcId, title, completedAt: nowMs() });
  if (questHistory.length > 50) questHistory.length = 50;
  ctx.questCount += 1;

  if (primaryNpc) {
    addNpcMemory(primaryNpc, "quest", t("quest_memory_completed", { title: quest.title }), { questType });
    ensureMemoryFormat(primaryNpc).questsShared += 1;
  }

  if (typeof quest._onComplete === "function") {
    try { quest._onComplete(); } catch {}
    quest._onComplete = null;
  }

  addChat("System", t("sys_quest_complete", { title }));
  generateDynamicQuest(ctx);
}

export async function enrichQuestDialogue(questType, primaryNpc, stages, ctx) {
  if (!ctx.LLM_API_URL || !primaryNpc) return;
  const persona = npcPersonas[primaryNpc.id] || {};
  const personality = persona.personality || "friendly";
  const stageDescs = stages.map((s, i) => `${i}: ${s.objective}`).join("; ");
  const prompt = ctx.t("quest_enrich_prompt", { type: questType, stageDescs, name: primaryNpc.name, personality });
  try {
    const reply = await ctx.llmReplyOrEmpty(primaryNpc, prompt);
    if (!reply) return;
    const cleaned = reply.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr) || arr.length < stages.length) return;
    for (let i = 0; i < stages.length; i++) {
      if (typeof arr[i] === "string" && arr[i].trim()) {
        stages[i].dialogue = arr[i].trim();
      }
    }
  } catch {
    // fallback: keep original dialogue
  }
}

export function generateDynamicQuest(ctx) {
  const { quest, questHistory, npcs, addChat, t } = ctx;
  const placeKeys = Object.keys(places);
  const placeNameFor = (k) => t("place_" + k) || k;

  const maxTier = ctx.questCount < 6 ? 1 : ctx.questCount < 16 ? 2 : 3;
  const recentTypes = questHistory.slice(0, 3).map(h => h.type);
  const recentNpcs = questHistory.slice(0, 2).map(h => h.primaryNpcId);

  const eligible = questTemplates.filter(tmpl => {
    if (tmpl.tier > maxTier) return false;
    if (recentTypes.filter(rt => rt === tmpl.type).length >= 1) return false;
    return true;
  });
  const pool = eligible.length > 0 ? eligible : questTemplates.filter(tmpl => tmpl.tier <= maxTier);
  if (!pool.length) return;
  const template = pool[Math.floor(Math.random() * pool.length)];

  const shuffled = npcs.slice().sort(() => Math.random() - 0.5);
  if (!shuffled.length) return;
  let fromNpc = shuffled[0];
  const nonRecent = shuffled.filter(n => !recentNpcs.includes(n.id));
  if (nonRecent.length > 0) fromNpc = nonRecent[0];
  const toNpc = shuffled.find(n => n.id !== fromNpc.id) || fromNpc;

  const placeKey = placeKeys[Math.floor(Math.random() * placeKeys.length)];
  const place = places[placeKey];
  const placeLabel = placeNameFor(placeKey);

  const extraNpcs = shuffled.filter(n => n.id !== fromNpc.id);
  const placeEntries = placeKeys.slice().sort(() => Math.random() - 0.5);
  const twoPlaces = placeEntries.slice(0, 2).map(k => ({ pos: places[k], label: placeNameFor(k) }));

  const q = template.make(fromNpc, toNpc, place, placeLabel, extraNpcs, twoPlaces, ctx);
  if (!q) {
    const fallback = questTemplates.find(tmpl => tmpl.type === "deliver");
    const fb = fallback.make(fromNpc, toNpc, place, placeLabel, extraNpcs, twoPlaces, ctx);
    applyQuest(fb, "deliver", fromNpc);
    return;
  }
  applyQuest(q, template.type, fromNpc);

  function applyQuest(q, type, primaryNpc) {
    quest.title = q.title;
    quest.stage = 0;
    quest.objective = q.stages[0].objective;
    quest.done = false;
    quest.dynamic = true;
    quest.dynamicStages = q.stages;
    quest.questType = type;
    quest.primaryNpcId = primaryNpc.id;
    quest.startedAt = nowMs();
    quest._stageCount = q.stages.length;
    quest._onComplete = q.onComplete || null;
    addChat("System", t("sys_new_quest", { title: q.title }));
    enrichQuestDialogue(type, primaryNpc, q.stages, ctx);
  }
}

export function handleQuestNpcTalk(npc, ctx) {
  const { quest } = ctx;
  if (quest.done && quest.dynamic) return handleDynamicQuestProgress(npc, ctx);
  if (quest.done) return false;
  return false;
}

export function handleDynamicQuestProgress(npc, ctx) {
  const { quest, inventory, player, addChat, npcById, t, hourOfDay } = ctx;
  if (!quest.dynamic || !quest.dynamicStages) return false;
  const stage = quest.dynamicStages[quest.stage];
  if (!stage) return false;

  if (stage.npcId && !npcById(stage.npcId)) {
    addChat("System", t("sys_npc_left_skip"));
    advanceDynamicQuest(ctx);
    return true;
  }

  if (stage.requireItem) {
    if (!stage.npcId || stage.npcId !== npc.id) return false;
    const itemKey = stage.requireItem;
    if (!inventory[itemKey] || inventory[itemKey] <= 0) {
      const info = itemTypes[itemKey];
      addChat(npc.name, t("favor_still_need", { label: info ? t(info.label) : itemKey }));
      return true;
    }
    inventory[itemKey] -= 1;
    addChat(npc.name, stage.dialogue);
    advanceDynamicQuest(ctx);
    return true;
  }

  if (stage.visit) {
    const dx = player.x - stage.visit.x;
    const dy = player.y - stage.visit.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > (stage.radius || 2.5)) return false;
    if (stage.afterHour != null) {
      const h = hourOfDay();
      if (!(h >= stage.afterHour || h < 5)) return false;
    }
    addChat("System", stage.autoText || t("sys_arrived_default"));
    advanceDynamicQuest(ctx);
    return true;
  }

  if (stage.npcId && stage.npcId === npc.id) {
    addChat(npc.name, stage.dialogue);
    advanceDynamicQuest(ctx);
    return true;
  }

  return false;
}

export function showQuestBoardMenu(ctx) {
  const { addChat, t } = ctx;
  addChat("System", t("board_title"));
  addChat("System", t("board_prompt"));
  addChat("System", t("board_opt1"));
  addChat("System", t("board_opt2"));
}

export function handleQuestBoardChoice(choice, ctx) {
  const { quest, questHistory, addChat, t } = ctx;

  if (choice === "1") {
    addChat("System", t("board_current_title"));
    if (quest.done && !quest.dynamic) {
      addChat("System", t("board_no_quest"));
    } else {
      if (quest.dynamic && quest.dynamicStages) {
        addChat("System", t("sys_board_stage", { title: quest.title, stage: quest.stage + 1, total: quest.dynamicStages.length }));
      } else {
        addChat("System", t("sys_board_stage_simple", { title: quest.title, stage: quest.stage }));
      }
      addChat("System", t("sys_board_objective", { objective: quest.objective }));
      if (quest.dynamic && quest.dynamicStages) {
        const pct = Math.round((quest.stage / quest.dynamicStages.length) * 100);
        addChat("System", t("sys_board_progress", { bar: "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10)), pct }));
      }
    }
    return true;
  }
  if (choice === "2") {
    addChat("System", t("board_completed_title", { count: ctx.questCount }));
    if (questHistory.length === 0) {
      addChat("System", t("board_no_history"));
    } else {
      const questTypeIcons = { deliver: "📦", explore: "🗺️", social: "💬", observe: "🔭", fetch: "🎒", chain: "🔗", investigate: "🔍", gift_quest: "🎁", nightwatch: "🌙", urgent: "⚡", mediate: "🕊️" };
      const show = questHistory.slice(0, 10);
      for (const h of show) {
        const icon = questTypeIcons[h.type] || "📋";
        const title = h.title || h.type;
        addChat("System", `  ${icon} ${title}`);
      }
      if (questHistory.length > 10) {
        addChat("System", t("sys_board_more", { count: questHistory.length - 10 }));
      }
    }
    return true;
  }
  return false;
}
