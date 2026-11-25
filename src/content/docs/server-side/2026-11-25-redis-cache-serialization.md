---
title: "Redis의 캐싱 전략과 직렬화: TTL, 압축, 타입 복원"
description: "Redis의 Cache-Aside, TTL, 데이터 압축과 JSON 직렬화의 원리를 학습하고 Dataverse 조회 최적화에 연결한다."
updatedAt: 2026-11-25
---

## 핵심 요약

Redis는 메모리 중심의 데이터 저장소다. Cache-Aside에서는 Redis가 아니라 애플리케이션이 원본 DB 접근 여부를 결정한다. TTL은 최신성과 DB 부하 사이의 균형을, 압축은 저장·전송 비용과 CPU 비용 사이의 균형을 조절한다. 직렬화는 압축과 달리 프로세스 경계를 넘어 데이터를 표현하는 과정이며 원본 타입이 모두 보존되지는 않는다.

## Redis는 DB를 대체하는가?

Redis는 Key-Value 기반으로 다양한 자료구조를 제공한다. RAM 중심의 접근은 디스크 I/O를 줄이는 데 유리하지만 네트워크와 명령 처리 비용까지 없애지는 않는다. 관계형 DB와 함께 사용하거나 요구사항에 따라 독립 저장소로 사용할 수도 있다.

상품 조회를 예로 들어보자. 기존에는 매 조회마다 DB를 호출하지만, Cache-Aside에서는 애플리케이션이 캐시를 먼저 확인한다.

~~~text
요청 → Redis GET
         ├─ Hit  → 캐시 응답
         └─ Miss → DB 조회 → Redis SET → 응답
~~~

~~~javascript
async function getProduct(id) {
  const key = `product:${id}`;
  const cached = await redis.get(key);
  if (cached !== null) return JSON.parse(cached);

  const product = await db.findProduct(id);
  await redis.set(key, JSON.stringify(product), { EX: 60 });
  return product;
}
~~~

위 코드는 연결 설정, 오류 처리 등을 생략한 미실행 개념 예제다. Redis는 자체 키의 존재 여부만 확인한다. [Cache-Aside](https://redis.io/docs/latest/develop/use-cases/cache-aside/)와 [SET 명령](https://redis.io/docs/latest/commands/set/)을 참고했다.

## 캐시의 최신성: TTL과 무효화

상품 가격이 10,000원에서 15,000원으로 변경되면 DB는 최신 값을 갖지만 Redis에는 기존 값이 남을 수 있다. 애플리케이션이 캐시를 적중하면 오래된 값이 반환된다.

학습 중 제안한 방법은 수정 시 키를 product:1:v1에서 product:1:v2로 변경하는 것이었다. 유효한 접근이지만 현재 버전을 알아낼 방법과 과거 키를 정리할 정책이 필요하다. 대안은 DB 수정 성공 후 기존 키를 삭제하고 다음 조회에서 다시 채우는 것이다.

삭제에 실패하면 DB와 캐시가 서로 다른 값을 보유한다. TTL은 캐시의 수명을 제한하는 안전장치지만 최신성을 보장하지는 않는다.

| 기준 | 짧은 TTL | 긴 TTL |
| --- | --- | --- |
| 캐시 적중 가능성 | 감소 | 증가 |
| 원본 DB 조회 부담 | 증가 | 감소 |
| 오래된 데이터 노출 가능성 | 감소 | 증가 |

동일한 요청 패턴과 별도 무효화가 없는 상황을 가정한 비교다. 짧은 TTL의 핵심 비용은 캐시 조회 자체가 아니라 Miss 이후 DB 조회와 재저장이다.

## 직렬화와 압축은 무엇이 다른가?

Node.js와 Redis는 별도의 프로세스로 실행된다. 같은 프로세스의 스레드는 일반적으로 주소 공간을 공유하지만 별도 프로세스는 독립적인 가상 주소 공간을 가진다. 객체의 주소를 보내는 것만으로 다른 프로세스에서 그 객체를 사용할 수 없다. 직렬화는 객체의 값과 구조를 전송 가능한 표현으로 바꾼다. Redis의 SET에는 문자열 또는 바이너리 데이터를 전달할 수 있다.

~~~text
JS 객체 → 직렬화 → 바이트 표현 → Redis
Redis → 바이트 표현 → 역직렬화 → JS 값
~~~

압축은 이 표현의 크기를 줄이는 별도 과정이다. 압축을 적용하면 직렬화 이후 압축하고 조회 시 압축 해제 후 역직렬화한다. 일반적인 SET에 전달하는 JSON에 Gzip이나 Zstd 압축이 자동 적용되는 것은 아니다.

예를 들어 1MB의 데이터가 200KB로 줄어든다고 가정하면 1,000개 값의 순수 데이터 용량은 십진 단위 기준 1GB에서 200MB로 감소한다. 키 및 Redis 관리 오버헤드는 제외한 가상 계산이며 실측 결과가 아니다.

| 자원 | 압축의 영향 |
| --- | --- |
| RAM | 압축률에 따라 저장 용량 감소 |
| 네트워크 | 전송할 바이트 감소 가능 |
| CPU | 압축 및 해제 연산 추가 |
| 응답 시간 | 전송 절약과 해제 비용에 따라 달라짐 |

학습 중 자주 읽는 1KB와 드물게 읽는 1MB 중 전자를 압축하는 것이 낫다고 예상했다. 후자는 절대적인 저장 용량 절약 효과가 크고 해제 빈도가 낮을 수 있다. 다만 조회 빈도와 압축률, 네트워크 병목, 해제 비용에 따라 결과는 달라지므로 크기만으로 결정하지 않는다.

Redis 내부에서도 메모리를 절약할 수 있다. 예를 들어 Redis 7 이상에서는 설정된 크기 조건을 만족하는 작은 Hash에 Listpack 인코딩을 사용할 수 있다. 이는 애플리케이션의 Gzip 압축과 다른 자료구조 표현 방식이다. [Redis 메모리 최적화](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/) 참고.

## JSON으로 직렬화하면 타입도 복원될까?

~~~javascript
const product = {
  id: 1,
  price: 10000,
  createdAt: new Date("2026-11-25"),
  discount: undefined,
  getPrice() { return this.price; }
};

const serialized = JSON.stringify(product);
const restored = JSON.parse(serialized);

console.log(serialized);
console.log(typeof restored.createdAt);
console.log(Object.hasOwn(restored, "discount"));
console.log(typeof restored.getPrice);
~~~

위 예제의 예상 출력:

~~~text
{"id":1,"price":10000,"createdAt":"2026-11-25T00:00:00.000Z"}
string
false
undefined
~~~

Date는 유효한 날짜인 경우 ISO 문자열로 변환된다. 객체 프로퍼티의 undefined와 함수 값은 생략된다. 이는 V8만의 특징이 아니라 ECMAScript에서 정한 JSON 동작이다. [JSON.stringify 문서](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) 참고.

ISO 8601이 표준이므로 자동으로 Date 객체가 복원될 것이라고 생각했지만, 날짜 표기 형식과 런타임 타입은 다르다. 같은 ISO 문자열을 일반 설명 값으로 저장할 수도 있기 때문에 파서가 원래 의도를 추론할 수 없다.

~~~javascript
new Date(restored.createdAt).getUTCFullYear(); // 2026
~~~

원래 타입 정보를 같이 직렬화한다는 아이디어를 적용하면 다음처럼 복원할 수 있다.

~~~javascript
const encoded = JSON.stringify({
  createdAt: {
    type: "Date",
    value: product.createdAt.toISOString()
  }
});

const decoded = JSON.parse(encoded);
if (decoded.createdAt.type === "Date") {
  decoded.createdAt = new Date(decoded.createdAt.value);
}
// decoded.createdAt instanceof Date → true
~~~

미실행 개념 예제다. 학습 대화에서 제안한 타입 태그를 확인한 뒤 애플리케이션이 Date를 명시적으로 만드는 흐름이다. Redis가 태그를 해석하거나 자동으로 타입을 복원하는 것은 아니다.

JSON.stringify와 JSON.parse도 동기 연산이므로 대용량 데이터는 Node.js 메인 JavaScript 실행을 지연시킬 수 있다. Redis 자체 조회 시간과 애플리케이션 전체 지연을 구분해야 한다.

## Dataverse 조회에 적용할 수 있을까?

실무 적용을 위한 가설이며 실제 환경의 측정 결과는 아니다. 관리형 Dataverse 내부 DB를 직접 조절하기보다 API 호출과 애플리케이션 캐시를 최적화하는 방향이 적합하다.

- OData의 $select와 $filter로 필요한 필드와 레코드만 가져온다. $expand는 호출 수를 줄일 수 있지만 관계 데이터가 커지면 전송량이 늘 수 있다.
- ETag 기반 조건부 단일 레코드 조회는 변경이 없을 때 304 응답을 활용할 수 있다. 변경 확인 요청은 여전히 발생하고 $expand 등이 포함되면 제한된다.
- 프론트엔드 캐시 또는 서버의 Redis는 반복 조회를 줄일 수 있다. 단, 사용자 권한 및 테넌트 경계를 보존하고 수정 시 무효화해야 한다.

참고: [Dataverse OData 조회](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query/overview), [조건부 작업](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/perform-conditional-operations-using-web-api).

먼저 Chrome DevTools Network에서 Fetch/XHR 및 /api/data/ 필터를 적용해 요청 수와 크기를 확인한다. 동일 URL뿐 아니라 메서드, 조회 조건, 본문, Initiator를 비교해 중복 여부를 판단한다. Size에서 전송 크기와 리소스 크기를, Timing에서 Waiting(TTFB)과 Content Download를 확인한다. TTFB는 순수 DB 처리 시간이 아니다. Disable cache는 HTTP 캐시를 대상으로 하므로 애플리케이션 캐시까지 제거하지 않는다. [Chrome Network 기능 참조](https://developer.chrome.com/docs/devtools/network/reference).

동일 조건에서 반복 측정한 중앙값과 전체 화면 응답 시간을 비교한 뒤 최적화 여부를 결정한다.

## 복습 문제

1. 캐시 삭제 실패 시 Redis에 두 값이 생기는가?
2. TTL을 짧게 하면 어떤 비용이 증가하는가?
3. ISO 날짜 문자열을 JSON.parse 하면 Date 객체인가?
4. 압축을 추가하면 응답 시간이 항상 줄어드는가?

### 해설

1. 아니다. 같은 키를 기준으로 DB와 Redis에 서로 다른 값이 남는 문제다.
2. Miss에 따른 원본 조회와 재저장 비용이 증가할 수 있다.
3. 아니다. 스키마 또는 타입 메타데이터를 사용해 명시적으로 복원해야 한다.
4. 아니다. 전송 비용 감소와 CPU 비용 증가를 함께 측정해야 한다.

학습 대화를 기준으로 2026-11-25에 범위를 정리했다. 코드의 출력은 동작 설명을 위한 예상 결과이며, 이 글은 Redis·Dataverse 성능 측정이나 실제 서비스 적용 결과를 담지 않는다.
