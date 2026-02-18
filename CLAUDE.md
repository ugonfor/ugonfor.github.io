# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
실행 방법, 구현 현황, 파일 구조 등은 README.md를 참고한다.

## Project Overview

GitHub Pages 개인 홈페이지 + 캔버스 기반 오픈월드 브라우저 게임(Playground). Jekyll 정적 사이트에 Node.js LLM 프록시 서버가 결합된 구조.

- 운영 도메인: `https://ugonfor.kr`
- 정적 사이트: Jekyll (`remote_theme: yaoyao-liu/minimal-light`)
- 동적 백엔드: Node.js LLM Proxy → Google Gemini API
- 네비게이션: Home → About Me → Playground → Posts

## 코드 작성 헌법

> 이 섹션의 규칙은 모든 코드 변경에 우선 적용된다.

1. 코드를 작성하기 전에, 주변에 다른 코드들은 어떻게 작성되었는지 확인하고, 생각한 다음에 코드를 작성한다.
2. 개발을 진행할 때에는 어느정도 진행이 되면, Posts에 DevLog를 작성한다.
3. CLAUDE.md에는 어떤 코드나, 어떤 가치를 지향하는 지를 적는다 & 적혀있다. 어떻게 실행하는지, 어떤 것이 구현되어 있는지 등은 README에 적는다.

## 지향하는 것.
### Home
1. 지금으로 만족. 예술적으로 보이고 싶음. 미감을 최대한 살려서 만든다.

### About Me
1. 지금으로 만족. 담백하게 보이기.

### Playground
1. 재미있는 오픈월드 세상을 만들고 싶음.
- NPC한명을 위임해서, 세상을 소개하는 도슨트 같이 한다던가...
- 아니면, 진짜 오픈월드처럼 알아서 AI NPC가 살아가게 한다던가... 어떤 것이 정답인지 모르겠어서 고민중.

### Posts
1. 개발하면서 클러드가 작성하는 개발로그.
2. 어떤 것을 개발했는지 트레킹이 필요해서 작성.

