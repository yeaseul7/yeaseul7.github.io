import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, copyFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { validateExam, gradeExam, restoreAttempt } from '../src/utils/exam.mjs';
import { publishExam } from './publish-exam.mjs';

const exam = {
  title: '이해도 점검', source_title: '가상 모델',
  questions: [{ stem: 'A가 신호를 받으면 B가 된다. A가 신호를 받으면?', choices: ['A', 'B', 'C', '종료'], answer: 1,
    choice_explanations: ['상태가 바뀐다.', '정의된 전이다.', '정의되지 않았다.', '종료하지 않는다.'], source: '모델의 전제', topic: '상태 전이' }],
};

test('문항 형식과 정답·해설을 검증하고 임의 메타데이터는 버린다', () => {
  assert.deepEqual(validateExam({ ...exam, pdf: 'javascript:bad' }), exam);
  for (const patch of [{ answer: true }, { answer: 4 }, { choices: ['a', 'a', 'b', 'c'] }, { choice_explanations: [] }]) {
    assert.throws(() => validateExam({ ...exam, questions: [{ ...exam.questions[0], ...patch }] }));
  }
  assert.throws(() => validateExam({ ...exam, questions: [] }));
});

test('정답·오답·미응답을 구분해 채점한다', () => {
  assert.equal(gradeExam(exam, [1]).correct, 1);
  assert.deepEqual(gradeExam(exam, [0]).results, [false]);
  assert.deepEqual(gradeExam(exam, [null]), { results: [null], correct: 0, total: 1, answered: 0 });
  assert.throws(() => gradeExam(exam, []));
  assert.throws(() => gradeExam(exam, [true]));
});

test('저장한 답안·메모를 복원하고 손상된 기록을 무시한다', () => {
  const saved = { answers: [1], notes: ['궁금한 점'], graded: true };
  assert.deepEqual(restoreAttempt(exam, JSON.stringify(saved)), saved);
  for (const raw of ['broken', JSON.stringify({ ...saved, answers: [4] }), JSON.stringify({ ...saved, notes: ['x'.repeat(5001)] })]) {
    assert.deepEqual(restoreAttempt(exam, raw), { answers: [null], notes: [''], graded: false });
  }
});

test('파일 경로 이탈과 기존 시험 덮어쓰기를 차단한다', async () => {
  const root = await mkdtemp(join(tmpdir(), 'exam-path-test-'));
  try {
    await assert.rejects(publishExam({ slug: '../escape', exam }, root));
    await mkdir(join(root, 'src/data/exams'), { recursive: true });
    const path = join(root, 'src/data/exams/existing.json');
    await writeFile(path, 'keep');
    await assert.rejects(publishExam({ slug: 'existing', exam }, root), /이미 있습니다/);
    assert.equal(await readFile(path, 'utf8'), 'keep');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('시험 게시가 온라인 데이터와 문제지·답지 PDF를 함께 생성한다', { skip: !process.env.STUDY_PYTHON }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'exam-publish-test-'));
  const renderer = 'plugins/study-notes/skills/create-exam/scripts/render_exam.py';
  try {
    await mkdir(join(root, 'plugins/study-notes/skills/create-exam/scripts'), { recursive: true });
    await copyFile(resolve(renderer), join(root, renderer));
    assert.equal(await publishExam({ slug: 'test-exam', exam }, root), '/exams/test-exam/');
    assert.deepEqual(JSON.parse(await readFile(join(root, 'src/data/exams/test-exam.json'), 'utf8')), exam);
    for (const file of ['questions.pdf', 'answers.pdf']) {
      assert.equal((await readFile(join(root, 'public/exams/test-exam', file))).subarray(0, 4).toString(), '%PDF');
    }
    await assert.rejects(publishExam({ slug: 'test-exam', exam }, root), /이미 있습니다/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
