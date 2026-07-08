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
