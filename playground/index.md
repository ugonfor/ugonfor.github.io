---
layout: default
title: Playground
extra_head: |
  <script>document.documentElement.classList.add('playground-page');</script>
  {% if site.playground_turnstile_site_key and site.playground_turnstile_site_key != "" %}
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
  {% endif %}
  <link rel="stylesheet" href="/assets/css/playground.css">
  <script defer src="/assets/js/playground-world.js"></script>
---

<div class="pg-world-shell">
  <script>
    window.PG_LLM_API_URL = {{ site.playground_llm_api | jsonify }};
    window.PG_TURNSTILE_SITE_KEY = {{ site.playground_turnstile_site_key | jsonify }};
  </script>
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
    <button id="pg-ui-toggle" class="pg-ui-toggle" type="button" aria-expanded="true">UI 숨기기</button>
    <div class="pg-panel-toggles" role="group" aria-label="패널 표시 설정">
      <button id="pg-toggle-left" type="button" class="pg-panel-toggle is-active" aria-pressed="true">정보</button>
      <button id="pg-toggle-right" type="button" class="pg-panel-toggle is-active" aria-pressed="true">로그</button>
      <button id="pg-toggle-chat" type="button" class="pg-panel-toggle is-active" aria-pressed="true">채팅</button>
    </div>
    <div class="pg-world-ui">
      <div class="pg-hud-left">
        <div class="pg-world-card">
          <h3>조작</h3>
          <p><strong>이동</strong>: WASD / 방향키</p>
          <p><strong>달리기</strong>: Shift 누르기</p>
          <p><strong>카메라</strong>: 마우스 좌클릭 드래그</p>
          <p><strong>줌</strong>: 마우스 휠</p>
          <p><strong>모바일</strong>: 조이스틱 + 드래그/핀치</p>
          <p><strong>시점 초기화</strong>: Space</p>
          <p><strong>상호작용</strong>: E (NPC 근처)</p>
          <p><strong>나가기</strong>: 좌측 Exit에서 E</p>
          <p><strong>일시정지</strong>: P</p>
          <div class="pg-actions">
            <button id="pg-save" type="button">저장</button>
            <button id="pg-load" type="button">불러오기</button>
          </div>
        </div>
        <div class="pg-world-card">
          <h3>캐릭터 생성</h3>
          <div class="pg-create-row">
            <input id="pg-create-name" type="text" maxlength="18" placeholder="이름" />
            <button id="pg-create-btn" type="button">생성</button>
          </div>
          <div class="pg-create-row pg-create-row-single">
            <input id="pg-create-personality" type="text" maxlength="60" placeholder="성격 (선택)" />
          </div>
          <p id="pg-create-status">모든 사용자가 공유하는 NPC로 추가됩니다.</p>
        </div>
        <div class="pg-world-card">
          <h3>월드 상태</h3>
          <p id="pg-time">시간: --:--</p>
          <p id="pg-player">플레이어: --</p>
          <p id="pg-nearby">근처: --</p>
          <p id="pg-quest">퀘스트: --</p>
          <p id="pg-rel">관계도: --</p>
          <canvas id="pg-minimap" width="240" height="190" aria-label="World minimap"></canvas>
        </div>
      </div>
      <div class="pg-hud-right">
        <div class="pg-world-card">
          <h3>이벤트 로그</h3>
          <div id="pg-log" class="pg-log"></div>
        </div>
      </div>
    </div>
    <div class="pg-chat-dock">
      <h3 class="pg-chat-title">NPC Chat</h3>
      <p id="pg-chat-target" class="pg-chat-target-line">대상: 없음</p>
      <div class="pg-chat-meta">
        <p id="pg-chat-active-target">대상: 없음</p>
        <p id="pg-chat-active-state">상태: 대화 불가</p>
        <p id="pg-chat-model">모델: 로컬 응답</p>
      </div>
      <div id="pg-chat-log" class="pg-chat-log pg-chat-log-dock"></div>
      <div class="pg-chat-input-row">
        <input id="pg-chat-input" type="text" placeholder="NPC에게 말 걸기..." />
        <button id="pg-chat-send" type="button">전송</button>
      </div>
    </div>
  </div>
</div>
