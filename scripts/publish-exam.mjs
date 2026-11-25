import { access, copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { validateExam } from '../src/utils/exam.mjs';

export async function publishExam(input, root = process.cwd()) {
  if (typeof input.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || input.slug.length > 100) {
    throw new Error('시험 파일명은 영문 소문자·숫자·하이픈으로 100자 이내여야 합니다.');
  }
  const exam = validateExam(input.exam);
  const dataPath = resolve(root, `src/data/exams/${input.slug}.json`);
  const pdfPath = resolve(root, `public/exams/${input.slug}`);
  for (const path of [dataPath, pdfPath]) {
    try { await access(path); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    throw new Error('같은 경로의 시험이 이미 있습니다.');
  }
  const staging = await mkdtemp(join(tmpdir(), 'publish-exam-'));
  let dataCreated = false;
  let pdfCreated = false;
  try {
    const jsonPath = join(staging, 'exam.json');
    const output = join(staging, 'pdf');
    await writeFile(jsonPath, JSON.stringify(exam));
    execFileSync(process.env.STUDY_PYTHON || 'python3', [
      resolve(root, 'plugins/study-notes/skills/create-exam/scripts/render_exam.py'),
      jsonPath, '--output-dir', output,
    ], { encoding: 'utf8', timeout: 120000 });
    await mkdir(resolve(root, 'src/data/exams'), { recursive: true });
    await mkdir(resolve(root, 'public/exams'), { recursive: true });
    await writeFile(dataPath, JSON.stringify(exam, null, 2) + '\n', { flag: 'wx' });
    dataCreated = true;
    await mkdir(pdfPath);
    pdfCreated = true;
    for (const name of ['questions.pdf', 'answers.pdf']) await copyFile(join(output, name), join(pdfPath, name));
    return `/exams/${input.slug}/`;
  } catch (error) {
    if (dataCreated) await rm(dataPath);
    if (pdfCreated) await rm(pdfPath, { recursive: true });
    throw error;
  } finally { await rm(staging, { recursive: true, force: true }); }
}
