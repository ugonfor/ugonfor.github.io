---
layout: default
title: Playground
extra_head: |
  <script>document.documentElement.classList.add('playground-page');</script>
  <script>window.PG_LLM_API_URL = "{{ site.playground_llm_api }}";</script>
  <link rel="stylesheet" href="/assets/css/playground.css?v={{ site.time | date: '%s' }}">
  <script defer src="/assets/js/playground-world.js?v={{ site.time | date: '%s' }}"></script>
---

<div class="pg-world-shell">
  <div class="pg-world-stage">
    <div class="pg-orientation-hint" role="status" aria-live="polite">
      Better in landscape: rotate your phone for a wider world view.
    </div>
    <canvas id="pg-world-canvas" width="960" height="540" aria-label="Local open-world simulation"></canvas>
    <div class="pg-mobile-controls" aria-label="Mobile controls">
      <div class="pg-joystick-wrap">
        <div id="pg-joystick-base" class="pg-joystick-base">
          <div id="pg-joystick-knob" class="pg-joystick-knob"></div>
        </div>
      </div>
      <div class="pg-mobile-actions">
        <button id="pg-mobile-interact" type="button">E</button>
        <button id="pg-mobile-run" type="button">Run</button>
        <button id="pg-mobile-reset" type="button">Reset</button>
        <button id="pg-mobile-zoom-in" type="button">+</button>
        <button id="pg-mobile-zoom-out" type="button">-</button>
      </div>
    </div>
    <button id="pg-ui-toggle" class="pg-ui-toggle" type="button" aria-expanded="true">Hide UI</button>
    <div class="pg-world-ui">
      <div class="pg-hud-left">
        <div class="pg-world-card">
          <h3>Controls</h3>
          <p><strong>Move</strong>: WASD / Arrow Keys</p>
          <p><strong>Run</strong>: Hold Shift</p>
          <p><strong>Mouse</strong>: Left Drag to pan camera</p>
          <p><strong>Scroll</strong>: Mouse Wheel to zoom</p>
          <p><strong>Mobile</strong>: Joystick + Drag/Pinch + Action Buttons</p>
          <p><strong>Reset View</strong>: Space</p>
          <p><strong>Interact</strong>: E (near NPC)</p>
          <p><strong>Exit</strong>: Go to far-left marker and press E</p>
          <p><strong>Pause</strong>: P</p>
          <div class="pg-actions">
            <button id="pg-save" type="button">Save</button>
            <button id="pg-load" type="button">Load</button>
          </div>
        </div>
        <div class="pg-world-card">
          <h3>World State</h3>
          <p id="pg-time">Time: --:--</p>
          <p id="pg-player">Player: --</p>
          <p id="pg-nearby">Nearby: --</p>
          <p id="pg-quest">Quest: --</p>
          <p id="pg-rel">Relation: --</p>
          <canvas id="pg-minimap" width="240" height="190" aria-label="World minimap"></canvas>
        </div>
      </div>
      <div class="pg-hud-right">
        <div class="pg-world-card">
          <h3>Event Log</h3>
          <div id="pg-log" class="pg-log"></div>
        </div>
      </div>
      <div class="pg-hud-bottom">
        <div class="pg-world-card pg-chat-card">
          <h3>NPC Chat</h3>
          <p id="pg-chat-target">Target: none</p>
          <div id="pg-chat-log" class="pg-chat-log"></div>
          <div class="pg-chat-row">
            <input id="pg-chat-input" type="text" placeholder="Say something to nearby NPC..." />
            <button id="pg-chat-send" type="button">Send</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
