import { SAVE_KEY, PLAYER_NAME_KEY, ZOOM_MIN, ZOOM_MAX, DEFAULT_ZOOM } from '../core/constants.js';
import { clamp, normalizePlayerName } from '../utils/helpers.js';
import { ensureMemoryFormat } from './npc-data.js';

/**
 * Save/Load system — serializes and deserializes game state to/from localStorage.
 *
 * ctx must provide:
 *   world, player, npcs, relations, npcSocialGraph, quest, inventory,
 *   sceneState, discoveries, removedNpcIds (Set), questHistory (Array),
 *   getQuestCount, setQuestCount, npcPersonas, places, cameraPan,
 *   canStand, canStandInScene, refreshRemoveSelect, addLog, t
 */
export function createSaveLoadSystem(ctx) {
  return {
    save() {
      const {
        world, player, npcs, relations, npcSocialGraph, quest, inventory,
        sceneState, discoveries, removedNpcIds, questHistory,
        getQuestCount, cameraPan, addLog, t,
      } = ctx;

      const state = {
        world: {
          totalMinutes: world.totalMinutes,
          paused: world.paused,
          zoom: world.zoom,
          cameraPan,
        },
        player: {
          name: player.name,
          x: player.x,
          y: player.y,
        },
        sceneState: {
          current: sceneState.current,
          savedOutdoorPos: sceneState.savedOutdoorPos,
          savedCameraPan: sceneState.savedCameraPan,
        },
        relations,
        quest,
        npcs: npcs
          .filter((n) => !n.id.startsWith("shared_") && !n.id.startsWith("custom_"))
          .map((n) => ({
            id: n.id, x: n.x, y: n.y, talkCooldown: n.talkCooldown,
            favorLevel: n.favorLevel, favorPoints: n.favorPoints,
            memory: n.memory,
            currentScene: n.currentScene || "outdoor",
          })),
        inventory: { ...inventory },
        removedNpcIds: [...removedNpcIds],
        discoveredIds: discoveries.filter(d => d.found).map(d => d.id),
        questHistory: questHistory.slice(),
        questCount: getQuestCount(),
        npcSocialGraph: { ...npcSocialGraph },
      };

      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      addLog(t("sys_save_ok"));
    },

    load() {
      const {
        world, player, npcs, relations, npcSocialGraph, quest, inventory,
        sceneState, discoveries, removedNpcIds, questHistory, npcPersonas,
        getQuestCount, setQuestCount, cameraPan, places,
        canStand, canStandInScene, refreshRemoveSelect, addLog, t,
      } = ctx;

      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        addLog(t("sys_no_save"));
        return;
      }

      try {
        const state = JSON.parse(raw);
        if (state.world) {
          world.totalMinutes = state.world.totalMinutes ?? world.totalMinutes;
          world.paused = !!state.world.paused;
          world.zoom = clamp(Math.max(state.world.zoom ?? DEFAULT_ZOOM, 2.0), ZOOM_MIN, ZOOM_MAX);
          cameraPan.x = clamp((state.world.cameraPan && state.world.cameraPan.x) || 0, -320, 320);
          cameraPan.y = clamp((state.world.cameraPan && state.world.cameraPan.y) || 0, -220, 220);
        }
        if (state.player) {
          player.name = normalizePlayerName(state.player.name ?? player.name);
          try {
            localStorage.setItem(PLAYER_NAME_KEY, player.name);
          } catch {
            // ignore localStorage errors
          }
          player.x = clamp(state.player.x ?? player.x, 1, world.width - 1);
          player.y = clamp(state.player.y ?? player.y, 1, world.height - 1);
          if (!canStand(player.x, player.y)) {
            player.x = places.plaza.x;
            player.y = places.plaza.y;
          }
        }
        if (state.sceneState) {
          sceneState.current = state.sceneState.current || "outdoor";
          sceneState.savedOutdoorPos = state.sceneState.savedOutdoorPos || null;
          sceneState.savedCameraPan = state.sceneState.savedCameraPan || null;
        }
        if (state.relations) {
          Object.assign(relations, state.relations);
        }
        if (state.quest) {
          quest.stage = state.quest.stage ?? quest.stage;
          quest.objective = state.quest.objective || quest.objective;
          quest.title = state.quest.title || quest.title;
          quest.done = !!state.quest.done;
          quest.dynamic = !!state.quest.dynamic;
          quest.dynamicStages = state.quest.dynamicStages || null;
          quest.questType = state.quest.questType || null;
          quest.primaryNpcId = state.quest.primaryNpcId || null;
          quest.startedAt = state.quest.startedAt || 0;
          quest._stageCount = state.quest._stageCount || (quest.dynamicStages ? quest.dynamicStages.length : 3);
        }
        if (Array.isArray(state.questHistory)) {
          questHistory.length = 0;
          for (const h of state.questHistory) questHistory.push(h);
        }
        if (state.questCount != null) setQuestCount(state.questCount);
        if (Array.isArray(state.npcs)) {
          for (const savedNpc of state.npcs) {
            const npc = npcs.find((n) => n.id === savedNpc.id);
            if (!npc) continue;
            if (savedNpc.currentScene) npc.currentScene = savedNpc.currentScene;
            const npcLoadScene = npc.currentScene || "outdoor";
            if (npcLoadScene === "outdoor") {
              npc.x = clamp(savedNpc.x ?? npc.x, 1, world.width - 1);
              npc.y = clamp(savedNpc.y ?? npc.y, 1, world.height - 1);
              if (!canStandInScene(npc.x, npc.y, "outdoor")) {
                npc.x = npc.home.x;
                npc.y = npc.home.y;
              }
            } else {
              npc.x = savedNpc.x ?? npc.x;
              npc.y = savedNpc.y ?? npc.y;
            }
            npc.talkCooldown = Math.max(0, savedNpc.talkCooldown || 0);
            if (savedNpc.favorLevel != null) npc.favorLevel = savedNpc.favorLevel;
            if (savedNpc.favorPoints != null) npc.favorPoints = savedNpc.favorPoints;
            if (savedNpc.memory) {
              npc.memory = savedNpc.memory;
              ensureMemoryFormat(npc);
            }
          }
        }
        if (state.inventory) {
          for (const [k, v] of Object.entries(state.inventory)) {
            if (k in inventory) inventory[k] = Math.max(0, v || 0);
          }
        }
        if (Array.isArray(state.removedNpcIds)) {
          for (const id of state.removedNpcIds) {
            if (!removedNpcIds.has(id)) {
              const idx = npcs.findIndex((n) => n.id === id);
              if (idx !== -1) {
                npcs.splice(idx, 1);
                delete npcPersonas[id];
              }
              removedNpcIds.add(id);
            }
          }
        }
        if (Array.isArray(state.discoveredIds)) {
          for (const id of state.discoveredIds) {
            const d = discoveries.find(dd => dd.id === id);
            if (d) d.found = true;
          }
        }
        if (state.npcSocialGraph) {
          for (const [k, v] of Object.entries(state.npcSocialGraph)) {
            npcSocialGraph[k] = clamp(v, 0, 100);
          }
        }
        refreshRemoveSelect();
        addLog(t("sys_load_ok"));
      } catch (err) {
        addLog(t("log_load_fail"));
      }
    },
  };
}
