---
title: "Redis의 캐싱 전략과 직렬화: TTL, 압축, 타입 복원"
description: "Redis의 Cache-Aside, TTL, 데이터 압축과 JSON 직렬화의 원리를 학습하고 Dataverse 조회 최적화에 연결한다."
updatedAt: 2026-11-26
---

## 핵심 요약

Redis에 조회 결과를 저장하면 반복되는 DB 조회를 줄일 수 있다. 캐시를 얼마나 오래 유지할지는 TTL로 설정하고, 데이터가 변경되면 기존 캐시를 무효화할 수 있다. 데이터를 저장하기 전에는 직렬화가 필요하며, 크기가 크다면 압축도 고려할 수 있다. 이 과정에서 데이터의 최신성, CPU 사용량, 메모리 사용량을 함께 고려해야 한다.

## Redis는 DB를 대체하는가?

처음에는 Redis가 DB에 접근할지 말지를 결정하는 구조라고 생각했다. 그런데 Redis는 메모리를 중심으로 데이터를 관리하는 독립적인 저장소이고, Cache-Aside에서는 백엔드가 DB 접근 여부를 결정한다. Key-Value 기반으로 여러 자료구조를 지원하며 관계형 DB와 함께 사용할 수 있다. 메모리에서 데이터를 읽어 디스크 I/O를 줄일 수 있지만 네트워크 통신 비용은 여전히 발생한다.

상품 조회 API에 캐시가 없다면 매 요청마다 DB를 조회한다. Cache-Aside를 적용하면 백엔드는 먼저 Redis에 해당 상품의 키가 있는지 확인한다.

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

연결 설정과 오류 처리를 생략한 예제다. `GET`에서 값이 반환되면 DB에 접근하지 않고, `null`이 반환되면 DB를 조회해 결과를 Redis에 저장한다. [Cache-Aside](https://redis.io/docs/latest/develop/use-cases/cache-aside/)와 [SET 명령](https://redis.io/docs/latest/commands/set/)을 참고했다.

## 캐시의 최신성: TTL과 무효화

상품 가격이 10,000원에서 15,000원으로 변경되면 DB는 최신 값을 갖지만 Redis에는 기존 값이 남을 수 있다. 애플리케이션이 캐시를 적중하면 오래된 값이 반환된다.

처음에는 가격이 바뀔 때마다 키를 `product:1:v1`에서 `product:1:v2`로 변경하면 되지 않을까 생각했다. 새로운 키로 조회하면 이전 캐시를 사용하지 않겠지만, 백엔드에서 현재 버전을 알아내는 방법과 이전 키를 삭제하는 정책이 필요하다.

키를 유지한 채 DB 수정에 성공하면 기존 캐시를 삭제하는 방법도 있다. 이후 상품을 조회할 때 Cache Miss가 발생하므로 DB에서 변경된 가격을 가져올 수 있다.

그런데 DB 수정에는 성공하고 캐시 삭제에는 실패하면 어떻게 될까? DB에는 15,000원이, Redis에는 10,000원이 남는다. 캐시가 만료되기 전까지 해당 키를 조회하면 기존 가격을 반환할 수 있다. TTL(Time To Live)을 설정하면 캐시의 유효기간을 제한할 수 있지만, 유효기간 내의 데이터가 최신이라는 보장은 없다.

| 기준 | 짧은 TTL | 긴 TTL |
| --- | --- | --- |
| 캐시 적중 가능성 | 감소 | 증가 |
| 원본 DB 조회 부담 | 증가 | 감소 |
| 오래된 데이터 노출 가능성 | 감소 | 증가 |

같은 요청 패턴에서 별도로 캐시를 무효화하지 않는다고 가정했다. TTL을 짧게 설정하면 오래된 값을 사용할 가능성은 줄지만, 만료 후 DB 조회와 캐시 재저장이 더 자주 발생할 수 있다. 데이터가 얼마나 자주 변경되는지, 어느 정도의 지연을 허용할 수 있는지에 따라 TTL을 결정해야 한다.

## 직렬화와 압축은 무엇이 다른가?

직렬화를 공부하면서 자료구조를 전송한다는 표현이 잘 이해되지 않았다. 이전에 공부한 프로세스와 스레드의 메모리 구조를 떠올리니 이해하기 쉬웠다.

같은 프로세스의 스레드는 일반적으로 주소 공간을 공유한다. 반면 Node.js와 Redis처럼 서로 다른 프로세스는 독립적인 가상 주소 공간을 사용한다. JavaScript 객체의 주소를 Redis에 전달해도 Redis는 해당 주소를 통해 객체를 읽을 수 없다.

직렬화(Serialization)는 객체의 값과 구조를 저장하거나 전송할 수 있는 표현으로 변환하는 과정이다. JavaScript에서는 `JSON.stringify()`로 객체를 문자열로 변환할 수 있고, Redis의 `SET`에는 문자열이나 바이너리 데이터를 전달할 수 있다.

~~~text
JS 객체 → 직렬화 → 바이트 표현 → Redis
Redis → 바이트 표현 → 역직렬화 → JS 값
~~~

직렬화된 데이터의 크기를 줄이고 싶다면 압축을 적용할 수 있다. 저장할 때는 직렬화 후 압축하고, 조회할 때는 압축을 해제한 다음 역직렬화한다. 일반적인 `SET` 명령에 JSON을 전달한다고 Gzip이나 Zstd 압축이 자동 적용되지는 않는다.

예를 들어 1MB의 데이터가 200KB로 줄어든다고 가정하면 1,000개 값의 순수 데이터 용량은 십진 단위 기준 1GB에서 200MB로 감소한다. 키와 Redis의 메모리 관리에 필요한 공간은 제외한 계산이다.

| 자원 | 압축의 영향 |
| --- | --- |
| RAM | 압축률에 따라 저장 용량 감소 |
| 네트워크 | 전송할 바이트 감소 가능 |
| CPU | 압축 및 해제 연산 추가 |
| 응답 시간 | 전송 절약과 해제 비용에 따라 달라짐 |

자주 조회하는 1KB 데이터와 가끔 조회하는 1MB 데이터 중 어느 쪽을 압축하는 것이 좋을까? 처음에는 1KB 데이터를 압축하는 것이 낫다고 생각했다. 하지만 작은 데이터는 압축으로 절약할 수 있는 용량이 적고, 조회할 때마다 압축 해제 연산이 발생한다. 반면 1MB 데이터는 압축으로 더 많은 메모리를 절약할 가능성이 있다. 실제 선택은 압축률, 조회 빈도, CPU 비용과 네트워크 병목을 측정한 뒤 결정해야 한다.

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

ISO 8601이 표준 형식이니 역직렬화하면 자동으로 Date 객체가 복원되지 않을까 생각했다. 하지만 ISO 8601은 날짜와 시간을 표현하는 형식이다. 일반 문자열에도 똑같은 값을 저장할 수 있기 때문에 `JSON.parse()`는 두 값의 원래 타입을 구분할 수 없다.

~~~javascript
new Date(restored.createdAt).getUTCFullYear(); // 2026
~~~

그렇다면 원래 타입 정보도 함께 직렬화하면 되지 않을까? 값과 함께 `type`을 저장하고, 역직렬화할 때 확인하는 방식이다.

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

위 예제에서는 애플리케이션이 `type`을 확인해 Date 객체를 생성한다. Redis는 직렬화된 값을 저장하고 반환할 뿐이다.

JSON.stringify와 JSON.parse도 동기 연산이므로 대용량 데이터는 Node.js 메인 JavaScript 실행을 지연시킬 수 있다. Redis 자체 조회 시간과 애플리케이션 전체 지연을 구분해야 한다.

## Dataverse 조회에 적용할 수 있을까?

Redis를 공부하다 보니 Dataverse에서 데이터를 조회할 때도 비슷한 방법을 적용할 수 있지 않을까 궁금해졌다. Dataverse는 관리형 서비스이므로 내부 DB를 직접 조절하기보다는 API 요청과 애플리케이션의 캐시를 개선하는 방법을 고려할 수 있다.

- OData의 `$select`와 `$filter`로 필요한 필드와 레코드만 가져온다. `$expand`는 호출 수를 줄일 수 있지만 관계 데이터가 커지면 전송량이 늘 수 있다.
- ETag 기반 조건부 단일 레코드 조회는 변경이 없을 때 304 응답을 활용할 수 있다. 변경 확인 요청은 여전히 발생하고 `$expand` 등이 포함되면 제한된다.
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
3. 아니다. 문자열로 반환된다. 타입 정보나 이미 알고 있는 데이터 구조를 기준으로 Date 객체를 명시적으로 생성해야 한다.
4. 아니다. 전송 비용 감소와 CPU 비용 증가를 함께 측정해야 한다.
