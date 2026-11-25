/** @typedef {{stem: string, choices: string[], answer: number, choice_explanations: string[], source: string, topic: string}} ExamQuestion */
/** @typedef {{title: string, source_title: string, questions: ExamQuestion[]}} Exam */

/** @returns {Exam} */
export function validateExam(value) {
  const text = (value, label, limit) => {
    if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error(`${label}을 확인하세요.`);
    return value.trim();
  };
  if (!value || !Array.isArray(value.questions) || value.questions.length < 1 || value.questions.length > 50) {
    throw new Error('시험은 1~50문항이어야 합니다.');
  }
  return {
    title: text(value.title, '시험 제목', 120),
    source_title: value.source_title ? text(value.source_title, '출제 범위', 300) : '',
    questions: value.questions.map((q, index) => {
      if (!q || !Array.isArray(q.choices) || q.choices.length !== 4
        || !Array.isArray(q.choice_explanations) || q.choice_explanations.length !== 4
        || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
        throw new Error(`${index + 1}번 문항의 보기·정답·해설을 확인하세요.`);
      }
      const choices = q.choices.map((v) => text(v, '보기', 1000));
      if (new Set(choices).size !== 4) throw new Error(`${index + 1}번 문항의 보기가 중복됩니다.`);
      return {
        stem: text(q.stem, '질문', 4000), choices, answer: q.answer,
        choice_explanations: q.choice_explanations.map((v) => text(v, '보기별 해설', 4000)),
        source: text(q.source, '원문 근거', 3000), topic: text(q.topic, '복습 주제', 200),
      };
    }),
  };
}

/** @param {Exam} exam @param {(number|null)[]} answers */
export function gradeExam(exam, answers) {
  if (!Array.isArray(answers) || answers.length !== exam.questions.length
    || answers.some((v) => v !== null && (!Number.isInteger(v) || v < 0 || v > 3))) {
    throw new Error('답안 형식을 확인하세요.');
  }
  const results = exam.questions.map((q, i) => answers[i] === null ? null : answers[i] === q.answer);
  const correct = results.filter((v) => v === true).length;
  return { results, correct, total: results.length, answered: answers.filter((v) => v !== null).length };
}

/** @param {Exam} exam @returns {{answers: (number|null)[], notes: string[], graded: boolean}} */
export function restoreAttempt(exam, raw) {
  const empty = { answers: exam.questions.map(() => null), notes: exam.questions.map(() => ''), graded: false };
  if (!raw) return empty;
  try {
    const value = JSON.parse(raw);
    gradeExam(exam, value.answers);
    if (!Array.isArray(value.notes) || value.notes.length !== exam.questions.length
      || value.notes.some((v) => typeof v !== 'string' || v.length > 5000)) return empty;
    return { answers: value.answers, notes: value.notes, graded: value.graded === true };
  } catch { return empty; }
}
