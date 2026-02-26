/**
 * Scene manager: handles building enter/exit transitions with fade effect.
 *
 * ctx expects: { sceneState, player, cameraPan, buildings, interiorDefs, addLog, t }
 */
export function createSceneManager(ctx) {
  const sceneFade = {
    active: false,
    alpha: 0,
    direction: "in", // "in" = fade to black, "out" = fade from black
    callback: null,
  };

  function enter(buildingId) {
    const interior = ctx.interiorDefs && ctx.interiorDefs[buildingId];
    if (!interior) return;
    ctx.sceneState.savedOutdoorPos = { x: ctx.player.x, y: ctx.player.y };
    ctx.sceneState.savedCameraPan = { x: ctx.cameraPan.x, y: ctx.cameraPan.y };
    ctx.sceneState.current = buildingId;
    ctx.player.x = interior.spawnPoint.x;
    ctx.player.y = interior.spawnPoint.y;
    ctx.cameraPan.x = 0;
    ctx.cameraPan.y = 0;
    const bld = ctx.buildings.find(b => b.id === buildingId);
    ctx.addLog(ctx.t("log_entered_building", { label: ctx.t(bld?.label || buildingId) }));
  }

  function exit() {
    if (ctx.sceneState.current === "outdoor") return;
    ctx.sceneState.current = "outdoor";
    if (ctx.sceneState.savedOutdoorPos) {
      ctx.player.x = ctx.sceneState.savedOutdoorPos.x;
      ctx.player.y = ctx.sceneState.savedOutdoorPos.y;
    }
    if (ctx.sceneState.savedCameraPan) {
      ctx.cameraPan.x = ctx.sceneState.savedCameraPan.x;
      ctx.cameraPan.y = ctx.sceneState.savedCameraPan.y;
    }
    ctx.addLog(ctx.t("log_exited_building"));
  }

  function startFade(callback) {
    sceneFade.active = true;
    sceneFade.alpha = 0;
    sceneFade.direction = "in";
    sceneFade.callback = callback;
  }

  function updateFade(dt) {
    if (!sceneFade.active) return;
    const speed = 4.0; // alpha per second
    if (sceneFade.direction === "in") {
      sceneFade.alpha = Math.min(1, sceneFade.alpha + speed * dt);
      if (sceneFade.alpha >= 1) {
        if (sceneFade.callback) sceneFade.callback();
        sceneFade.callback = null;
        sceneFade.direction = "out";
      }
    } else {
      sceneFade.alpha = Math.max(0, sceneFade.alpha - speed * dt);
      if (sceneFade.alpha <= 0) {
        sceneFade.active = false;
      }
    }
  }

  return {
    enter,
    exit,
    startFade,
    updateFade,
    get fadeActive() { return sceneFade.active; },
    get fadeAlpha() { return sceneFade.alpha; },
  };
}
