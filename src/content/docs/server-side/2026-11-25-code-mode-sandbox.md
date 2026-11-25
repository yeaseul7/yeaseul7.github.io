---
title: "Cloudflare Code Mode와 Sandbox의 동작 원리"
description: "MCP의 컨텍스트 최적화와 코드 실행 격리의 원리 및 활용 조건을 정리한다."
updatedAt: 2026-11-25
---

## 핵심 요약

- Code Mode는 MCP를 대체하지 않고 도구 사용에 필요한 컨텍스트를 줄이는 설계 방식이다.
- 전체 API 명세를 모델에 전달하지 않고 필요한 기능을 탐색한 뒤 코드를 실행한다.
- Cloudflare의 발표에서 초기 도구 명세 비용은 약 117만 토큰에서 약 1,000 토큰으로 감소했다. 전체 작업 비용의 절감률은 아니다.
- Sandbox는 생성된 코드의 실행 권한을 제한한다. 격리와 API 권한 제어는 별도로 설계해야 한다.

## 내가 몰랐던 부분

대화에서 명시적인 오해는 확인되지 않았다. 실제 질문은 다음과 같았다.

- MCP의 토큰 사용량을 줄이는 기술은 무엇인가? Cloudflare Code Mode는 API를 코드로 탐색하고 호출하는 방식이다.
- 어디에 활용할 수 있는가? 여러 API를 조회하고 결과를 집계하는 Agent에서 중간 응답을 모델에 전달하지 않는 구조를 고려할 수 있다.
- Sandbox란 무엇인가? 신뢰하기 어려운 코드가 호스트 자원에 접근하는 범위를 제한하는 실행 환경이다.

이전 설명에서 네트워크 기본 차단은 Code Mode의 구성에 한정해야 한다. 일반 Dynamic Worker의 네트워크 접근은 설정에 따라 달라진다. 이해 여부는 아직 복습 답변으로 확인하지 않았다.

## 개념과 동작 원리

### MCP와 Code Mode

MCP는 모델을 외부 도구와 연결하는 프로토콜이다. 모든 API 작업을 개별 도구로 제공하면 초기 명세가 커질 수 있다. 다만 모든 MCP 구현이 반드시 전체 도구를 한 번에 모델에 전달하는 것은 아니다.

Cloudflare의 서버 측 Code Mode는 다음 두 도구를 제공한다.

1. `search()`: 모델이 생성한 JavaScript로 OpenAPI 명세를 탐색하고 관련 작업을 반환한다.
2. `execute()`: 허용된 API를 호출하고 페이지네이션, 조건 분기, 데이터 가공 등을 실행한다.

필요한 기능만 단계적으로 공개하는 방식은 Progressive Disclosure라고 한다. 초기 도구 명세 크기는 API 개수와 독립적이지만 탐색 결과, 생성 코드, 실행 결과에는 추가 토큰이 필요하다.

### Sandbox와 V8 Isolate

Sandbox는 특정 제품이 아니라 실행을 격리하고 권한을 제한하는 개념이다. VM은 게스트 운영체제를 사용할 수 있고, 컨테이너는 일반적으로 호스트 커널을 공유하며, V8 Isolate는 엔진 수준에서 독립적인 힙과 실행 상태를 제공한다. Isolate 자체는 OS 프로세스나 스레드와 동일한 단위가 아니다.

Cloudflare Code Mode는 Dynamic Worker Loader를 사용해 코드를 격리하고 승인된 인터페이스로 API를 호출한다. 일반 Dynamic Worker에서 `globalOutbound: null`로 설정하면 직접적인 네트워크 접근을 차단할 수 있다. 해당 옵션을 생략하면 부모 Worker의 네트워크 접근 설정을 상속한다. 환경 변수나 서비스 바인딩도 명시적으로 제공할 수 있으므로 민감한 정보를 전달하지 않는 설계가 필요하다.

실행 환경의 격리만으로 데이터 유출이나 잘못된 API 변경을 모두 막을 수는 없다. 최소 권한, 쓰기 작업 승인, 출력 크기 및 실행 자원 제한도 고려한다.

## 예제와 반례

### API 결과 가공

다음은 가상의 프로젝트 API 응답을 집계하는 순수 JavaScript 예제다. 실제 Cloudflare API 호출 코드는 아니다.

```js
const projects = [
  { id: 1, plan: 100, actual: 120 },
  { id: 2, plan: 100, actual: 80 },
];

const result = projects
  .map(({ id, plan, actual }) => ({
    id,
    difference: actual - plan,
  }))
  .filter(p => p.difference > 0);

console.log(JSON.stringify(result));
```

예측 결과: `[{"id":1,"difference":20}]`. 계획보다 실적이 큰 항목만 반환한다. 이 연산을 실행 환경에서 처리하면 모델에 원본 전체를 전달할 필요가 없다. JavaScript 실행 환경에서 위 예측 결과를 확인했다. 실제 Sandbox 동작 검증은 별개다.

반례: 도구가 두세 개뿐이고 응답이 작은 단순 서비스에서는 코드 생성 및 실행 환경의 추가 비용이 절감 효과보다 클 수 있다. API 호출 자체의 횟수도 자동으로 줄어드는 것은 아니다.

활용 아이디어: 공개 GitHub 저장소 분석 Agent에서 일반 Tool Calling과 Code Mode의 입력·출력 토큰, 응답 시간, API 호출 수를 비교한다. 아직 측정하지 않은 설계 아이디어다.

## 복습 질문

1. API가 2,500개에서 5,000개로 늘면 Code Mode의 초기 명세와 전체 작업 토큰은 각각 어떻게 달라질까?
2. Sandbox에서 외부 네트워크를 차단했더라도 쓰기 권한이 있는 API 바인딩을 제공하면 어떤 위험이 남을까?
3. API가 두 개뿐인 서비스에서도 Code Mode를 도입하는 것이 항상 유리할까? 어떤 지표로 판단해야 할까?

## 검증 근거

확인일: 2026-11-25.

- [Cloudflare Code Mode 발표 원문](https://blog.cloudflare.com/code-mode-mcp/): 2026-02-20 발표의 도구 구성, 초기 명세 토큰 수치, 서버 측 실행 방식을 대조했다.
- [Dynamic Workers API reference](https://developers.cloudflare.com/dynamic-workers/api-reference/): globalOutbound의 생략·null 설정 차이 및 환경 바인딩 제공 가능성을 확인했다.
- [Cloudflare Workers Security model](https://developers.cloudflare.com/workers/reference/security-model/): 격리 외에도 추가적인 보안 방어가 필요함을 확인했다.

실제 Cloudflare 환경에서 API 호출이나 토큰 비용 측정은 수행하지 않았다. 후속 학습 주제는 V8 Isolate의 메모리 구조와 프로세스 격리의 차이, 실제 Agent 성능 비교다.

## 복습 정답과 해설

1. 두 도구의 정의가 그대로라면 초기 도구 명세 비용은 일정하다. 다만 탐색 결과와 실제 실행 결과에 따라 전체 작업 토큰은 증가할 수 있다.
2. 허용된 바인딩을 통해 잘못된 데이터 변경이 일어날 수 있다. 네트워크 차단과 API 권한 관리는 별개의 방어층이다.
3. 항상 유리하지 않다. 동일한 작업에 대해 성공률, 전체 토큰 비용, 지연 시간, 실행 비용 및 보안 운영 부담을 비교해야 한다.
