---
layout: default
title: Playground
extra_head: |
  <script>document.documentElement.classList.add('playground-page');</script>
  <link rel="stylesheet" href="/assets/css/playground.css">
  <script defer src="/assets/js/playground-world.js"></script>
---

{% if site.playground_turnstile_site_key and site.playground_turnstile_site_key != "" %}
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
{% endif %}

{% if site.playground_firebase and site.playground_firebase.databaseURL != "" %}
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js"></script>
{% endif %}

<div class="pg-world-shell">
  <script>
    window.PG_LLM_API_URL = {{ site.playground_llm_api | jsonify }};
    window.PG_TURNSTILE_SITE_KEY = {{ site.playground_turnstile_site_key | jsonify }};
    {% if site.playground_firebase and site.playground_firebase.databaseURL != "" %}
    window.PG_FIREBASE_CONFIG = {
      apiKey: {{ site.playground_firebase.apiKey | jsonify }},
      authDomain: {{ site.playground_firebase.authDomain | jsonify }},
      databaseURL: {{ site.playground_firebase.databaseURL | jsonify }},
      projectId: {{ site.playground_firebase.projectId | jsonify }}
    };
    {% endif %}
  </script>
  <div class="pg-world-stage">
    <canvas id="pg-world-canvas" width="960" height="540" aria-label="Local open-world simulation"></canvas>
    <div id="pg-quest-banner" class="pg-quest-banner" hidden>
      <p id="pg-quest-banner-title" class="pg-quest-banner-title"></p>
      <p id="pg-quest-banner-objective" class="pg-quest-banner-objective"></p>
    </div>
    <div id="pg-toast-container" class="pg-toast-container"></div>
    <div class="pg-mobile-controls" aria-label="Mobile controls">
      <div class="pg-joystick-wrap">
        <div id="pg-joystick-base" class="pg-joystick-base">
          <div id="pg-joystick-knob" class="pg-joystick-knob"></div>
        </div>
      </div>
      <div class="pg-mobile-actions">
        <button id="pg-mobile-interact" type="button" data-i18n="dom_mobile_talk">Talk</button>
        <button id="pg-mobile-run" type="button" data-i18n="dom_mobile_run">Run</button>
        <button id="pg-mobile-pause" type="button" data-i18n="dom_mobile_pause">Pause</button>
        <button id="pg-mobile-reset" type="button" data-i18n="dom_mobile_reset">Reset View</button>
        <button id="pg-mobile-utility" type="button" aria-pressed="false" data-i18n="dom_mobile_utility">More</button>
      </div>
    </div>
    <div class="pg-mobile-sheet" aria-label="Mobile panels">
      <button id="pg-mobile-sheet-toggle" type="button" aria-expanded="false" data-i18n="dom_sheet_toggle_open">Open Panel</button>
      <div class="pg-mobile-sheet-tabs" role="tablist" aria-label="Mobile panel tabs">
        <button id="pg-mobile-tab-controls" type="button" class="pg-mobile-tab is-active" role="tab" aria-selected="true" data-i18n="dom_tab_controls">Controls</button>
        <button id="pg-mobile-tab-info" type="button" class="pg-mobile-tab" role="tab" aria-selected="false" data-i18n="dom_tab_info">Info</button>
        <button id="pg-mobile-tab-log" type="button" class="pg-mobile-tab" role="tab" aria-selected="false" data-i18n="dom_tab_log">Log</button>
        <button id="pg-mobile-tab-chat" type="button" class="pg-mobile-tab" role="tab" aria-selected="false" data-i18n="dom_tab_chat">Chat</button>
      </div>
    </div>
    <button id="pg-ui-toggle" class="pg-ui-toggle" type="button" aria-expanded="true" data-i18n="ui_hide">Hide UI</button>
    <button id="pg-audio-toggle" class="pg-audio-btn" type="button" aria-label="Toggle audio">&#x1F50A;</button>
    <button id="pg-settings-btn" class="pg-settings-btn" type="button" aria-label="Settings">&#x2699;&#xFE0F;</button>
    <div class="pg-panel-toggles" role="group" aria-label="Panel display settings">
      <button id="pg-toggle-left" type="button" class="pg-panel-toggle is-active" aria-pressed="true" data-i18n="dom_toggle_info">Info</button>
      <button id="pg-toggle-right" type="button" class="pg-panel-toggle is-active" aria-pressed="true" data-i18n="dom_toggle_log">Log</button>
      <button id="pg-toggle-chat" type="button" class="pg-panel-toggle is-active" aria-pressed="true" data-i18n="dom_toggle_chat">Chat</button>
    </div>
    <div class="pg-world-ui">
      <div class="pg-hud-left">
        <div id="pg-card-controls" class="pg-world-card">
          <h3 data-i18n="dom_card_controls_title">Controls</h3>
          <div class="pg-controls-help">
            <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> <span data-i18n="dom_ctrl_move">Move</span></p>
            <p><kbd>Shift</kbd> <span data-i18n="dom_ctrl_run">Run</span></p>
            <p><kbd>E</kbd> <span data-i18n="dom_ctrl_interact">Talk / Interact</span></p>
            <p><kbd>Space</kbd> <span data-i18n="dom_ctrl_view_reset">Reset View</span></p>
            <p><kbd>P</kbd> <span data-i18n="dom_ctrl_pause">Pause</span></p>
            <p data-i18n="dom_ctrl_drag">Drag mouse to move camera</p>
          </div>
          <div class="pg-actions">
            <button id="pg-save" type="button" data-i18n="dom_save">Save</button>
            <button id="pg-load" type="button" data-i18n="dom_load">Load</button>
            <button id="pg-rename" type="button" data-i18n="dom_rename">Rename</button>
          </div>
        </div>
        <div id="pg-card-info" class="pg-world-card">
          <h3 data-i18n="dom_card_char_title">Character Management</h3>
          <div class="pg-create-row">
            <input id="pg-create-name" type="text" maxlength="18" placeholder="Name" data-i18n-placeholder="dom_create_name_placeholder" />
            <button id="pg-create-btn" type="button" data-i18n="dom_create_btn">Create</button>
          </div>
          <div class="pg-create-row">
            <select id="pg-remove-select"><option value="" data-i18n="dom_remove_default_option">Select NPC</option></select>
            <button id="pg-remove-btn" type="button" data-i18n="dom_remove_btn">Remove</button>
          </div>
          <div class="pg-create-row pg-create-row-single">
            <input id="pg-create-personality" type="text" maxlength="60" placeholder="Personality (optional)" data-i18n-placeholder="dom_create_personality_placeholder" />
          </div>
          <p id="pg-create-status" data-i18n="dom_create_status">NPCs you create are shared with all visitors.</p>
        </div>
        <div id="pg-card-status" class="pg-world-card">
          <div class="pg-card-header">
            <h3 data-i18n="dom_card_status_title">World Status</h3>
            <button id="pg-status-toggle" type="button" aria-expanded="true" data-i18n="dom_status_toggle">Collapse</button>
          </div>
          <div id="pg-status-body">
            <p id="pg-time" data-i18n="dom_time">Time: --:--</p>
            <p id="pg-player" data-i18n="dom_player">Player: --</p>
            <p id="pg-online" hidden data-i18n="dom_online">Online: --</p>
            <p id="pg-nearby" data-i18n="dom_nearby">Nearby: --</p>
            <p id="pg-quest" data-i18n="dom_quest">Quest: --</p>
            <p id="pg-rel" data-i18n="dom_rel">Relationships: --</p>
            <canvas id="pg-minimap" width="240" height="190" aria-label="World minimap"></canvas>
          </div>
        </div>
      </div>
      <div class="pg-hud-right">
        <div id="pg-card-log" class="pg-world-card">
          <div class="pg-card-header">
            <h3 data-i18n="dom_card_log_title">Event Log</h3>
            <button id="pg-log-toggle" type="button" aria-expanded="true" data-i18n="dom_log_toggle">Collapse</button>
          </div>
          <div id="pg-log-body">
            <div id="pg-log" class="pg-log"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="pg-chat-dock">
      <div class="pg-chat-title-row">
        <h3 class="pg-chat-title" data-i18n="dom_chat_title">NPC Chat</h3>
        <button id="pg-chat-close" type="button" data-i18n="dom_chat_close">End Chat</button>
      </div>
      <p id="pg-chat-target" class="pg-chat-target-line" data-i18n="dom_chat_target">Target: None</p>
      <div class="pg-chat-meta">
        <p id="pg-chat-active-target" data-i18n="dom_chat_active_target">Target: None</p>
        <p id="pg-chat-active-state" data-i18n="dom_chat_active_state">Status: No chat</p>
        <p id="pg-chat-model" data-i18n="dom_chat_model">Model: Local response</p>
      </div>
      <div id="pg-chat-log" class="pg-chat-log pg-chat-log-dock"></div>
      <div id="pg-chat-suggestions" class="pg-chat-suggestions"></div>
      <div class="pg-chat-input-row">
        <input id="pg-chat-input" type="text" placeholder="Talk to an NPC..." data-i18n-placeholder="dom_chat_placeholder" />
        <button id="pg-chat-send" type="button" data-i18n="dom_chat_send">Send</button>
      </div>
    </div>
  </div>
  <div id="pg-name-modal" class="pg-name-modal" hidden>
    <div class="pg-name-modal-box">
      <h3>&#x1F3D8;&#xFE0F; Welcome to the Village</h3>
      <label for="pg-name-input">Your Name</label>
      <input id="pg-name-input" type="text" maxlength="18" placeholder="Enter your name" />
      <button id="pg-name-lang-ko" type="button" hidden></button>
      <button id="pg-name-lang-en" type="button" hidden></button>
      <button id="pg-name-confirm" type="button">Start</button>
    </div>
  </div>
</div>
