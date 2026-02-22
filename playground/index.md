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
        <button id="pg-mobile-interact" type="button">대화</button>
        <button id="pg-mobile-run" type="button">달리기</button>
        <button id="pg-mobile-pause" type="button">일시정지</button>
        <button id="pg-mobile-reset" type="button">시점초기화</button>
        <button id="pg-mobile-utility" type="button" aria-pressed="false">추가기능</button>
      </div>
    </div>
    <div class="pg-mobile-sheet" aria-label="Mobile panels">
      <button id="pg-mobile-sheet-toggle" type="button" aria-expanded="false">패널 열기</button>
      <div class="pg-mobile-sheet-tabs" role="tablist" aria-label="모바일 패널 탭">
        <button id="pg-mobile-tab-controls" type="button" class="pg-mobile-tab is-active" role="tab" aria-selected="true">조작</button>
        <button id="pg-mobile-tab-info" type="button" class="pg-mobile-tab" role="tab" aria-selected="false">정보</button>
        <button id="pg-mobile-tab-log" type="button" class="pg-mobile-tab" role="tab" aria-selected="false">로그</button>
        <button id="pg-mobile-tab-chat" type="button" class="pg-mobile-tab" role="tab" aria-selected="false">채팅</button>
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
        <div id="pg-card-controls" class="pg-world-card">
          <h3>조작</h3>
          <div class="pg-controls-help">
            <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동</p>
            <p><kbd>Shift</kbd> 달리기</p>
            <p><kbd>E</kbd> 대화 / 상호작용</p>
            <p><kbd>Space</kbd> 시점 초기화</p>
            <p><kbd>P</kbd> 일시정지</p>
            <p>마우스 드래그로 화면 이동</p>
          </div>
          <div class="pg-actions">
            <button id="pg-save" type="button">저장</button>
            <button id="pg-load" type="button">불러오기</button>
            <button id="pg-rename" type="button">이름 변경</button>
          </div>
        </div>
        <div id="pg-card-info" class="pg-world-card">
          <h3>캐릭터 관리</h3>
          <div class="pg-create-row">
            <input id="pg-create-name" type="text" maxlength="18" placeholder="이름" />
            <button id="pg-create-btn" type="button">생성</button>
          </div>
          <div class="pg-create-row">
            <select id="pg-remove-select"><option value="">NPC 선택</option></select>
            <button id="pg-remove-btn" type="button">제거</button>
          </div>
          <div class="pg-create-row pg-create-row-single">
            <input id="pg-create-personality" type="text" maxlength="60" placeholder="성격 (선택)" />
          </div>
          <p id="pg-create-status">모든 사용자가 공유하는 NPC로 추가됩니다.</p>
        </div>
        <div id="pg-card-status" class="pg-world-card">
          <div class="pg-card-header">
            <h3>월드 상태</h3>
            <button id="pg-status-toggle" type="button" aria-expanded="true">접기</button>
          </div>
          <div id="pg-status-body">
            <p id="pg-time">시간: --:--</p>
            <p id="pg-player">플레이어: --</p>
            <p id="pg-online" hidden>접속자: --</p>
            <p id="pg-nearby">근처: --</p>
            <p id="pg-quest">퀘스트: --</p>
            <p id="pg-rel">관계도: --</p>
            <canvas id="pg-minimap" width="240" height="190" aria-label="World minimap"></canvas>
          </div>
        </div>
      </div>
      <div class="pg-hud-right">
        <div id="pg-card-log" class="pg-world-card">
          <div class="pg-card-header">
            <h3>이벤트 로그</h3>
            <button id="pg-log-toggle" type="button" aria-expanded="true">접기</button>
          </div>
          <div id="pg-log-body">
            <div id="pg-log" class="pg-log"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="pg-chat-dock">
      <div class="pg-chat-title-row">
        <h3 class="pg-chat-title">NPC 대화</h3>
        <button id="pg-chat-close" type="button" hidden>채팅 종료</button>
      </div>
      <p id="pg-chat-target" class="pg-chat-target-line">대상: 없음</p>
      <div class="pg-chat-meta">
        <p id="pg-chat-active-target">대상: 없음</p>
        <p id="pg-chat-active-state">상태: 대화 불가</p>
        <p id="pg-chat-model">모델: 로컬 응답</p>
      </div>
      <div id="pg-chat-log" class="pg-chat-log pg-chat-log-dock"></div>
      <div id="pg-chat-suggestions" class="pg-chat-suggestions"></div>
      <div class="pg-chat-input-row">
        <input id="pg-chat-input" type="text" placeholder="NPC에게 말 걸기..." />
        <button id="pg-chat-send" type="button">전송</button>
      </div>
    </div>
  </div>
  <div id="pg-name-modal" class="pg-name-modal" hidden>
    <div class="pg-name-modal-box">
      <h3>🏘️ 마을에 오신 걸 환영합니다</h3>
      <label for="pg-name-input">이름</label>
      <input id="pg-name-input" type="text" maxlength="18" placeholder="이름을 입력하세요" />
      <label>언어 / Language</label>
      <div class="pg-name-lang-select">
        <button id="pg-name-lang-ko" type="button" class="active">한국어</button>
        <button id="pg-name-lang-en" type="button">English</button>
      </div>
      <button id="pg-name-confirm" type="button">시작하기</button>
    </div>
  </div>
</div>
