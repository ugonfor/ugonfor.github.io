/**
 * GameState container — groups related game state into a single object.
 * No logic, just a convenient bag for passing state between subsystems.
 */
export function createGameState({
  world, player, npcs, relations, npcSocialGraph,
  quest, inventory, sceneState, weather,
  convoMgr, chatMgr,
  t, currentLang, debugMode,
  npcPersonas, places, buildings,
}) {
  return {
    world, player, npcs, relations, npcSocialGraph,
    quest, inventory, sceneState, weather,
    convoMgr, chatMgr,
    t, currentLang, debugMode,
    npcPersonas, places, buildings,

    npcById(id) { return npcs.find(n => n.id === id) || null; },
  };
}
