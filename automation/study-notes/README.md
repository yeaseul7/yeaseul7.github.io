# ChatGPT 학습 기록 플러그인

커스텀 GPT나 별도 MCP 서버 대신 `학습 기록` 스킬과 기존 GitHub 연결을 사용한다. 브라우저 ChatGPT에서 이 플러그인을 선택해 공부한다.

## 연결

1. 이 저장소의 게시 workflow, scripts, `.study-inbox/.gitkeep`을 main에 반영한다.
2. `plugins/study-notes` 폴더를 Plugin Creator로 비공개 플러그인으로 생성한다. 로컬 파일만 만들어서는 브라우저에 설치되지 않는다.
3. 생성된 플러그인 링크에서 설치하고 GitHub 연결을 확인한다. 저장소 접근과 쓰기는 기존 GitHub 권한을 따른다. 새 토큰이나 API 키를 채팅에 입력하지 않는다.
4. 브라우저 ChatGPT에서 `@학습 기록`을 선택한다. 플러그인 사용·설치 제공 여부는 계정과 작업 공간에 따라 다르다.

## 사용

평소처럼 질문하며 공부한 뒤 `오늘 공부한 내용을 검토해서 블로그에 올려 줘`라고 요청한다. 단순히 `정리해 줘`라고 하면 초안까지만 만든다. 일반 채팅의 모든 대화를 자동 수집하지 않으며 현재 대화에서 접근 가능한 내용만 정리한다.

글에는 핵심 요약, 실제로 몰랐던 부분과 오해 수정, 개념과 동작 원리, 예제와 반례, 복습 질문, 검증 근거, 정답과 해설이 들어간다. 자료를 확인하지 못하거나 핵심 오류가 해결되지 않으면 게시를 중지한다. 실행하지 않은 코드는 미실행 예제로 구분한다.

## 게시 처리

GitHub 플러그인은 최종 공개 글의 category·slug·title·description·body를 `.study-inbox/{slug}.json`에 생성한다. 이 push가 `Publish study note`를 실행한다. Actions는 미처리 요청을 읽어 허용된 카테고리에 `.md`를 생성하고, 테스트·타입 검사·빌드를 통과하면 Markdown 추가와 요청 JSON 제거를 한 커밋으로 저장한다. 이후 기존 배포 workflow를 명시적으로 실행한다.

GitHub Pages는 정적 호스팅이므로 게시 API 서버로 사용하지 않는다. 실제 내용 대조는 ChatGPT가 수행한다. Actions는 출처 링크 존재와 구조·빌드를 검사하며 주장과 출처의 일치까지 보장하지 않는다.

## 실패와 재시도

- 검사가 실패하면 해당 Markdown은 원격에 커밋되지 않는다. 요청 JSON은 남으므로 실행 로그를 확인하고 수정해야 한다. 요청 파일도 공개 저장소 기록이므로 검토한 공개 글만 제출한다.
- 잘못된 요청은 보존하고 나머지 정상 요청을 처리한다. workflow 성공 여부만 보지 말고 해당 Markdown의 생성과 요청 제거를 확인한다.
- 기존 MD/MDX 글을 덮어쓰지 않는다. 현재 구성은 새 글 게시용이다.
- 동시에 다른 main 변경이 발생하면 push가 거절될 수 있다. 최신 main 기준으로 workflow를 다시 실행한다. 강제 push하지 않는다.
- main 보호 규칙이 직접 push를 금지하면 PR 방식으로 변경해야 한다. 규칙을 임의로 해제하지 않는다.
- 커밋은 성공하고 배포 요청만 실패하면 `Deploy to GitHub Pages`를 main 기준으로 수동 실행한다.

## 로컬 검증

```sh
node --test scripts/publish-study-note.test.mjs
npm run lint
npm run build
```

## 근거

- [브라우저에서 플러그인 만들기](https://learn.chatgpt.com/docs/build-plugins)
- [플러그인 패키지 형식](https://developers.openai.com/plugins/build/plugins)
