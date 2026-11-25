import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWritingActivity } from '../src/utils/writing-activity.ts';

test('선택한 연도의 1~12월을 표시하고 다른 연도와 미래 글은 제외한다', () => {
  const activity = buildWritingActivity([
    new Date('2026-11-25'), new Date('2026-11-25'),
    new Date('2025-11-26'), new Date('2026-11-26'),
  ], 2026, '2026-11-25');
  const days = activity.days.filter(({ date }) => date);
  assert.equal(days.length, 365);
  assert.equal(days[0].date, '2026-01-01');
  assert.equal(days.at(-1).date, '2026-12-31');
  assert.equal(activity.total, 2);
  assert.equal(days.find(({ date }) => date === '2026-11-25').count, 2);
  assert.equal(days.at(-1).future, true);
  assert.equal(activity.days.length % 7, 0);
  assert.equal(activity.days.findIndex(({ date }) => date), new Date('2026-01-01').getUTCDay());
});

test('한국 시간의 연도 경계와 윤년 2월 29일을 처리한다', () => {
  const activity = buildWritingActivity([
    new Date('2023-12-31T15:00:00Z'), new Date('2023-12-31T14:59:59Z'),
    new Date('2024-02-29'),
  ], 2024, '2026-11-25');
  assert.equal(activity.days.find(({ date }) => date === '2024-01-01').count, 1);
  assert.equal(activity.days.find(({ date }) => date === '2024-02-29').count, 1);
  assert.equal(activity.days.filter(({ date }) => date).length, 366);
  assert.equal(activity.total, 2);
});

test('과거 연도는 연말까지 집계하고 유효하지 않은 날짜는 제외한다', () => {
  const activity = buildWritingActivity([
    new Date('invalid'), new Date('2025-12-31'),
  ], 2025, '2026-11-25');
  assert.equal(activity.total, 1);
  assert.ok(activity.days.every(({ future }) => !future));
  assert.equal(activity.days.find(({ date }) => date === '2025-12-31').count, 1);
});
