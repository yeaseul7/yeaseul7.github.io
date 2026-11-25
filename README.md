# Ssaong Dev Blog

Astro Starlight 기반 개발 블로그입니다.

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run lint
npm run build
```

## 글 작성

문서는 `src/content/docs` 아래에 MDX/Markdown 파일로 작성합니다.

```md
---
title: 문서 제목
description: 문서 설명
---
```

## 배포

`main` 브랜치에 push하면 GitHub Actions가 `npm run build`를 실행하고 `dist/` 산출물을 GitHub Pages로 배포합니다.

## 공개 조회수

각 페이지 하단에 [Hits](https://github.com/silentsoft/hits)의 누적 카운터를 표시합니다. 페이지 경로별로 집계하며, 쿼리와 해시는 집계 기준에서 제외합니다. 새 카운터이므로 기존 GA4 통계는 합산하지 않습니다.

브라우저가 `astro.config.ts`의 `site` 도메인에서 실행될 때만 요청합니다. 로컬 미리보기와 `/secret/` 경로는 집계하지 않습니다. 외부 서비스가 차단되거나 응답하지 않으면 숫자를 표시하지 않습니다. 이미지 요청 기반의 참고 수치이며, 고유 방문자 수나 GA4 조회수와 일치하지 않을 수 있습니다.

## ChatGPT에서 학습 글 게시

브라우저 ChatGPT의 학습 플러그인에서 공부한 내용을 자료와 대조하고, 복습 글로 정리해 GitHub에 게시할 수 있습니다. 최초 연결은 [설정 안내](automation/study-notes/README.md)를 따릅니다.
