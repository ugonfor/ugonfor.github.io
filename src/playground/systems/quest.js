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
    dialogueVariants: [
      ["전해줄래?", "고마워, 잘 받았어.", "잘 전해줬구나!"],
      ["부탁할게.", "감사해, 전달 받았어.", "수고했어!"],
      ["이 메시지 좀 전해줘.", "아, 그 이야기구나.", "역시 믿을 수 있어!"],
      ["급한 건데 전달 좀.", "오, 알려줘서 고마워.", "빨리 해줬네, 고마워!"],
    ],
    make(fromNpc, toNpc) {
      const v = this.dialogueVariants[Math.floor(Math.random() * this.dialogueVariants.length)];
      return {
        title: `${fromNpc.name}의 전달 임무`,
        stages: [
          { npcId: fromNpc.id, objective: `${fromNpc.name}에게 임무를 받으세요.`, dialogue: `${toNpc.name}에게 ${v[0]}` },
          { npcId: toNpc.id, objective: `${toNpc.name}에게 메시지를 전달하세요.`, dialogue: v[1] },
          { npcId: fromNpc.id, objective: `${fromNpc.name}에게 결과를 보고하세요.`, dialogue: v[2] },
        ],
      };
    },
  },
  {
    type: "explore",
    tier: 1,
    dialogueVariants: [
      ["한번 살펴봐줄래? 궁금한 게 있어.", "잘 다녀왔구나! 덕분에 도움이 됐어."],
      ["좀 둘러봐줘. 뭔가 달라진 것 같아.", "그래? 좋은 정보야, 고마워!"],
      ["요즘 분위기가 이상하대. 확인 좀.", "별일 없다니 다행이네."],
    ],
    make(npc, _unused, place, placeLabel) {
      const v = this.dialogueVariants[Math.floor(Math.random() * this.dialogueVariants.length)];
      return {
        title: `${placeLabel} 탐험`,
        stages: [
          { npcId: npc.id, objective: `${npc.name}에게 탐험 임무를 받으세요.`, dialogue: `${placeLabel} 근처를 ${v[0]}` },
          { visit: place, radius: 2.5, objective: `${placeLabel}을(를) 방문하세요.`, autoText: `${placeLabel}에 도착했습니다. 주변을 둘러봤습니다.` },
          { npcId: npc.id, objective: `${npc.name}에게 보고하세요.`, dialogue: v[1] },
        ],
      };
    },
  },
  {
    type: "social",
    tier: 1,
    dialogueVariants: [
      ["반가워, 같이 이야기 좀 하자.", "다시 왔구나! 우리 좀 더 가까워진 것 같아.", "정말 즐거웠어. 다음에 또 이야기하자!"],
      ["오, 잘 왔어! 할 얘기가 있었어.", "역시 통하는 게 있네.", "오늘 정말 좋았어!"],
      ["심심했는데 잘 왔다.", "이야기가 잘 통하네.", "덕분에 기분 좋아졌어!"],
    ],
    make(npc) {
      const v = this.dialogueVariants[Math.floor(Math.random() * this.dialogueVariants.length)];
      return {
        title: `${npc.name}과(와) 친해지기`,
        stages: [
          { npcId: npc.id, objective: `${npc.name}과(와) 대화하세요.`, dialogue: v[0] },
          { npcId: npc.id, objective: `${npc.name}과(와) 한 번 더 대화하세요.`, dialogue: v[1] },
          { npcId: npc.id, objective: `${npc.name}에게 마무리 인사를 하세요.`, dialogue: v[2] },
        ],
      };
    },
  },
  {
    type: "observe",
    tier: 1,
    dialogueVariants: [
      ["밤에 가보면 뭔가 있을 거야.", "역시 뭔가 있었구나! 좋은 발견이야."],
      ["어두울 때 분위기가 다르대.", "오, 대단한 걸 봤네!"],
      ["야간에만 보이는 게 있다더라.", "신기하다! 잘 관찰했어."],
    ],
    make(npc, _unused, place, placeLabel) {
      const v = this.dialogueVariants[Math.floor(Math.random() * this.dialogueVariants.length)];
      const targetHour = 20 + Math.floor(Math.random() * 4);
      const displayHour = targetHour >= 24 ? targetHour - 24 : targetHour;
      return {
        title: `${placeLabel} 야간 관찰`,
        stages: [
          { npcId: npc.id, objective: `${npc.name}에게 관찰 임무를 받으세요.`, dialogue: `${displayHour}시 이후에 ${placeLabel}에 ${v[0]}` },
          { visit: place, radius: 2.5, afterHour: displayHour, objective: `${displayHour}시 이후 ${placeLabel}을(를) 방문하세요.`, autoText: `밤의 ${placeLabel}에서 특별한 분위기를 느꼈습니다.` },
          { npcId: npc.id, objective: `${npc.name}에게 보고하세요.`, dialogue: v[1] },
        ],
      };
    },
  },
  {
    type: "fetch",
    tier: 1,
    make(npc) {
      const itemKeys = Object.keys(itemTypes);
      const itemKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
      const info = itemTypes[itemKey];
      return {
        title: `${npc.name}에게 ${info.label} 가져다주기`,
        stages: [
          { npcId: npc.id, objective: `${npc.name}에게 말을 걸어 무엇이 필요한지 알아보세요.`, dialogue: `${info.label}${itemKey === "gem" ? "이" : "을(를)"} 하나 구해다 줄 수 있어?` },
          { requireItem: itemKey, npcId: npc.id, objective: `${info.label}${itemKey === "gem" ? "을" : "을(를)"} 가지고 ${npc.name}에게 가세요.`, dialogue: `${info.emoji} 딱 이거야! 정말 고마워!` },
        ],
      };
    },
  },
  {
    type: "chain",
    tier: 2,
    make(fromNpc, _unused, _place, _label, extraNpcs) {
      const chain = extraNpcs.slice(0, 3);
      if (chain.length < 3) return null;
      return {
        title: `소식 전파: ${chain.map(n => n.name).join(" → ")}`,
        stages: [
          { npcId: fromNpc.id, objective: `${fromNpc.name}에게 소식을 받으세요.`, dialogue: `이 소식을 ${chain[0].name}, ${chain[1].name}, ${chain[2].name} 순서대로 전해줘.` },
          { npcId: chain[0].id, objective: `${chain[0].name}에게 소식을 전하세요.`, dialogue: `오, 그런 소식이? 다음 사람에게도 전해줘.` },
          { npcId: chain[1].id, objective: `${chain[1].name}에게 소식을 전하세요.`, dialogue: `알려줘서 고마워. 마지막으로 한 명 더!` },
          { npcId: chain[2].id, objective: `${chain[2].name}에게 소식을 전하세요.`, dialogue: `전부 알게 됐네! ${fromNpc.name}에게 완료했다고 알려줘.` },
          { npcId: fromNpc.id, objective: `${fromNpc.name}에게 보고하세요.`, dialogue: `모두에게 전달됐구나! 수고했어!` },
        ],
      };
    },
  },
  {
    type: "investigate",
    tier: 2,
    make(fromNpc, targetNpc) {
      const persona = npcPersonas[targetNpc.id] || {};
      const cluePlace = targetNpc.work || targetNpc.hobby || places.plaza;
      const placeNames = { plaza: "광장", cafe: "카페", office: "사무실", park: "공원", market: "시장", homeA: "주택가A", homeB: "주택가B", homeC: "주택가C", bakery: "빵집", florist: "꽃집", library: "도서관", ksa_main: "KSA 본관", ksa_dorm: "KSA 기숙사" };
      const clueLabel = Object.entries(places).find(([, v]) => v === cluePlace)?.[0] || "plaza";
      const cluePlaceName = placeNames[clueLabel] || clueLabel;
      const trait = persona.personality ? persona.personality.split("하")[0] : "독특";
      return {
        title: `미스터리 인물 찾기`,
        stages: [
          { npcId: fromNpc.id, objective: `${fromNpc.name}에게 의뢰를 받으세요.`, dialogue: `${trait}한 사람을 찾고 있어. 단서는 ${cluePlaceName} 근처야.` },
          { visit: cluePlace, radius: 3.0, objective: `${cluePlaceName} 근처에서 단서를 찾으세요.`, autoText: `${cluePlaceName}에서 단서를 발견했습니다. 이 근처에서 활동하는 사람이 있는 것 같습니다.` },
          { npcId: targetNpc.id, objective: `단서의 인물을 찾아 대화하세요.`, dialogue: `나를 찾고 있었어? 맞아, ${cluePlaceName} 근처에서 자주 있지.` },
          { npcId: fromNpc.id, objective: `${fromNpc.name}에게 보고하세요.`, dialogue: `찾았구나! 정말 대단해!` },
        ],
      };
    },
  },
  {
    type: "gift_quest",
    tier: 2,
    make(fromNpc, toNpc) {
      const itemKeys = Object.keys(itemTypes);
      const itemKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
      const info = itemTypes[itemKey];
      return {
        title: `${toNpc.name}에게 선물하기`,
        stages: [
          { npcId: fromNpc.id, objective: `${fromNpc.name}에게 부탁을 받으세요.`, dialogue: `${toNpc.name}에게 ${info.label}${itemKey === "gem" ? "을" : "을(를)"} 선물하고 싶은데, 구해다 줄 수 있어?` },
          { requireItem: itemKey, npcId: toNpc.id, objective: `${info.label}${itemKey === "gem" ? "을" : "을(를)"} 가지고 ${toNpc.name}에게 전달하세요.`, dialogue: `${info.emoji} 이걸 나한테? 정말 감동이야!` },
          { npcId: fromNpc.id, objective: `${fromNpc.name}에게 보고하세요.`, dialogue: `전해줬구나! 정말 고마워!` },
        ],
      };
    },
  },
  {
    type: "nightwatch",
    tier: 3,
    make(npc, _unused, _place, _label, _extraNpcs, twoPlaces) {
      if (!twoPlaces || twoPlaces.length < 2) return null;
      const [p1, p2] = twoPlaces;
      return {
        title: `야간 순찰`,
        stages: [
          { npcId: npc.id, objective: `${npc.name}에게 순찰 임무를 받으세요.`, dialogue: `밤에 ${p1.label}과(와) ${p2.label}을(를) 순찰해줘. 이상한 일이 있는지 확인해.` },
          { visit: p1.pos, radius: 2.5, afterHour: 20, objective: `20시 이후 ${p1.label}을(를) 순찰하세요.`, autoText: `${p1.label}을(를) 순찰했습니다. 이상 없음.` },
          { visit: p2.pos, radius: 2.5, afterHour: 20, objective: `20시 이후 ${p2.label}을(를) 순찰하세요.`, autoText: `${p2.label}을(를) 순찰했습니다. 이상 없음.` },
          { npcId: npc.id, objective: `${npc.name}에게 순찰 결과를 보고하세요.`, dialogue: `이상 없었구나. 수고했어! 든든하다.` },
        ],
      };
    },
  },
  {
    type: "urgent",
    tier: 3,
    make(fromNpc, toNpc) {
      return {
        title: `긴급 배달!`,
        stages: [
          { npcId: fromNpc.id, objective: `${fromNpc.name}에게 긴급 임무를 받으세요.`, dialogue: `큰일이야! 이걸 빨리 ${toNpc.name}에게 전해줘! 빠를수록 좋아!` },
          { npcId: toNpc.id, objective: `빨리 ${toNpc.name}에게 전달하세요! (빠를수록 보너스!)`, dialogue: `제때 와줬구나! 고마워!` },
          { npcId: fromNpc.id, objective: `${fromNpc.name}에게 보고하세요.`, dialogue: `무사히 전달됐구나! 정말 고마워!` },
        ],
      };
    },
  },
  {
    type: "mediate",
    tier: 2,
    make(fromNpc, toNpc, _place, _label, _extraNpcs, _twoPlaces, ctx) {
      const rel = ctx.getNpcRelation(fromNpc.id, toNpc.id);
      if (rel >= 60) return null;
      return {
        title: `${fromNpc.name}와(과) ${toNpc.name} 중재`,
        stages: [
          { npcId: fromNpc.id, objective: `${fromNpc.name}에게 사정을 들으세요.`, dialogue: `${toNpc.name}이랑 좀 서먹해졌어... 중간에서 좀 도와줄 수 있어?` },
          { npcId: toNpc.id, objective: `${toNpc.name}에게도 이야기를 들으세요.`, dialogue: `${fromNpc.name} 이야기야? 음... 나도 좀 미안하긴 해.` },
          { npcId: fromNpc.id, objective: `${fromNpc.name}에게 ${toNpc.name}의 마음을 전하세요.`, dialogue: `그랬구나... 내가 너무 성급했나봐.` },
          { npcId: toNpc.id, objective: `${toNpc.name}에게 화해 소식을 전하세요.`, dialogue: `고마워! 다시 잘 지낼 수 있을 것 같아.` },
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
      addNpcMemory(primaryNpc, "favor", `관계가 '${favorLevelNames[primaryNpc.favorLevel]}'(으)로 발전`);
    }
  }

  if (Math.random() < 0.5) {
    const itemKeys = Object.keys(itemTypes);
    const rewardItem = itemKeys[Math.floor(Math.random() * itemKeys.length)];
    inventory[rewardItem] = (inventory[rewardItem] || 0) + 1;
    const info = itemTypes[rewardItem];
    addChat("System", t("sys_quest_reward", { emoji: info.emoji, label: info.label }));
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
          addNpcMemory(primaryNpc, "favor", `관계가 '${favorLevelNames[primaryNpc.favorLevel]}'(으)로 발전`);
        }
      }
    }
  }

  questHistory.unshift({ type: questType, primaryNpcId, title, completedAt: nowMs() });
  if (questHistory.length > 50) questHistory.length = 50;
  ctx.questCount += 1;

  if (primaryNpc) {
    addNpcMemory(primaryNpc, "quest", `'${quest.title}' 퀘스트를 함께 완료`, { questType });
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
  const personality = persona.personality || "친절한 성격";
  const stageDescs = stages.map((s, i) => `${i}: ${s.objective}`).join("; ");
  const prompt = `퀘스트(${questType}): ${stageDescs}. ${primaryNpc.name}(${personality})의 성격에 맞게 각 스테이지 대사를 한국어 1문장씩 생성해줘. JSON 배열로 대사만 반환. 예: ["대사1","대사2","대사3"]. 20자 내외.`;
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
  const placeNames = { plaza: "광장", cafe: "카페", office: "사무실", park: "공원", market: "시장", homeA: "주택가A", homeB: "주택가B", homeC: "주택가C", bakery: "빵집", florist: "꽃집", library: "도서관", ksa_main: "KSA 본관", ksa_dorm: "KSA 기숙사" };
  const placeKeys = Object.keys(places);

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
  const placeLabel = placeNames[placeKey] || placeKey;

  const extraNpcs = shuffled.filter(n => n.id !== fromNpc.id);
  const placeEntries = Object.entries(placeNames).sort(() => Math.random() - 0.5);
  const twoPlaces = placeEntries.slice(0, 2).map(([k, label]) => ({ pos: places[k], label }));

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
      addChat(npc.name, t("favor_still_need", { label: info ? info.label : itemKey }));
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
