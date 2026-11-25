import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareNote, publishPendingNotes, saveNote, sections } from './publish-study-note.mjs';

const body = sections.map((section) => `## ${section}\n\n${section === '검증 근거' ? '[MDN](https://developer.mozilla.org/) — 확인 범위 예시' : '학습 내용'}`).join('\n\n');
const input = { category: 'js', slug: 'event-loop', title: '이벤트 루프: "순서"', description: '학습\n복습', body };

test('메타데이터를 안전하게 인코딩하고 정해진 문서 경로를 생성한다', async () => {
  const note = await prepareNote(input);
  assert.equal(note.path, 'src/content/docs/js/event-loop.md');
  assert.ok(note.content.includes(String.raw`title: "이벤트 루프: \"순서\""`));
  assert.ok(note.content.includes('description: "학습\\n복습"'));
  assert.match(note.content, /updatedAt: \d{4}-\d{2}-\d{2}/);
});

test('경로 이탈, 허용하지 않은 분류, 크기 초과를 거절한다', async () => {
  for (const patch of [{ slug: '../index' }, { category: '../secret' }, { slug: 'UPPER' }, { body: 'x'.repeat(35001) }]) {
    await assert.rejects(prepareNote({ ...input, ...patch }));
  }
});

test('코드 블록 속 제목과 링크를 검증 근거로 인정하지 않는다', async () => {
  await assert.rejects(prepareNote({ ...input, body: `\`\`\`md\n${body}\n\`\`\`` }), /필수 항목 누락/);
  await assert.rejects(prepareNote({ ...input, body: body.replace('[MDN](https://developer.mozilla.org/)', '`MDN`') }), /HTTPS 링크/);
  await assert.rejects(prepareNote({ ...input, body: body.replace('## 내가 몰랐던 부분', '### 내가 몰랐던 부분') }), /필수 항목 누락/);
});

test('HTML과 위험한 링크는 거절하고 코드 속 HTML은 허용한다', async () => {
  await assert.rejects(prepareNote({ ...input, body: body + '\n<script>alert(1)</script>' }), /HTML/);
  await assert.rejects(prepareNote({ ...input, body: body + '\n[x](javascript:alert)' }), /HTTPS/);
  await assert.rejects(prepareNote({ ...input, body: '---\ntitle: injected\n---\n' + body }), /frontmatter/);
  await prepareNote({ ...input, body: body + '\n```html\n<div>예제</div>\n```' });
});

test('누락 폴더를 만들고 기존 MD 및 MDX 글은 보호한다', async () => {
  const root = await mkdtemp(join(tmpdir(), 'study-note-'));
  try {
    const path = await saveNote(input, root);
    const before = await readFile(join(root, path), 'utf8');
    await assert.rejects(saveNote(input, root), { code: 'EEXIST' });
    assert.equal(await readFile(join(root, path), 'utf8'), before);
    await mkdir(join(root, 'src/content/docs/network'), { recursive: true });
    await writeFile(join(root, 'src/content/docs/network/event-loop.mdx'), 'existing');
    await assert.rejects(saveNote({ ...input, category: 'network' }, root), /MDX/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('정상 게시 요청은 처리하고 잘못된 요청은 보존한다', async () => {
  const root = await mkdtemp(join(tmpdir(), 'study-queue-'));
  try {
    await mkdir(join(root, '.study-inbox'));
    await writeFile(join(root, '.study-inbox/good.json'), JSON.stringify(input));
    await writeFile(join(root, '.study-inbox/bad.json'), JSON.stringify({ ...input, slug: '../index' }));
    const result = await publishPendingNotes(root);
    assert.deepEqual(result.published, ['src/content/docs/js/event-loop.md']);
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0].file, 'bad.json');
    await assert.rejects(readFile(join(root, '.study-inbox/good.json')), { code: 'ENOENT' });
    assert.ok(await readFile(join(root, '.study-inbox/bad.json')));
    const retry = await publishPendingNotes(root);
    assert.equal(retry.published.length, 0);
    assert.equal(retry.failed.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
