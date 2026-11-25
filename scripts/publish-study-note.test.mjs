import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { deleteNote, prepareNote, publishPendingNotes, saveNote } from './publish-study-note.mjs';

const body = '## 실행 순서를 왜 예측하기 어려웠을까\n\n실행 문맥과 큐의 역할을 구분한다. [MDN](https://developer.mozilla.org/)의 설명과 대조한다.';
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

test('코드 블록이나 미사용 참조 정의를 출처로 인정하지 않는다', async () => {
  await assert.rejects(prepareNote({ ...input, body: `\`\`\`md\n${body}\n\`\`\`` }), /HTTPS 링크/);
  await assert.rejects(prepareNote({ ...input, body: body.replace('[MDN](https://developer.mozilla.org/)', '`MDN`') }), /HTTPS 링크/);
  await assert.rejects(prepareNote({ ...input, body: '본문\n\n[unused]: https://example.com' }), /HTTPS 링크/);
  await assert.rejects(prepareNote({ ...input, body: '![그림](https://example.com/image.png)' }), /HTTPS 링크/);
});

test('목차를 자유롭게 구성하고 인라인·참조형 출처와 문서 내 이동을 지원한다', async () => {
  await prepareNote({ ...input, body });
  await prepareNote({ ...input, body: '## 왜 격리 방식이 중요할까\n\n[메모리 구조로 이동](#memory)\n\n### 힙과 프로세스\n\n[공식 문서][engine]\n\n[engine]: https://v8.dev/docs' });
  // 이전 형식의 제출도 계속 처리한다.
  await prepareNote({ ...input, body: '## 검증 근거\n\n[MDN](https://developer.mozilla.org/)' });
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

test('확인한 SHA의 MD와 MDX만 삭제하고 다른 파일은 보존한다', async () => {
  const root = await mkdtemp(join(tmpdir(), 'study-delete-'));
  try {
    await mkdir(join(root, 'src/content/docs/js'), { recursive: true });
    const md = join(root, 'src/content/docs/js/event_loop.md');
    const mdx = join(root, 'src/content/docs/js/event_loop.mdx');
    await writeFile(md, '확인한 글');
    await writeFile(mdx, '다른 글');
    const sha = execFileSync('git', ['hash-object', '--', md], { encoding: 'utf8' }).trim();
    const request = { category: 'js', slug: 'event_loop', extension: 'md', sha };
    for (const patch of [{ category: '../secret' }, { slug: '../index' }, { extension: '../md' }, { sha: '0'.repeat(40) }]) {
      await assert.rejects(deleteNote({ ...request, ...patch }, root));
    }
    assert.equal(await readFile(md, 'utf8'), '확인한 글');
    assert.equal(await deleteNote(request, root), 'src/content/docs/js/event_loop.md');
    await assert.rejects(readFile(md), { code: 'ENOENT' });
    assert.equal(await readFile(mdx, 'utf8'), '다른 글');
    await assert.rejects(deleteNote(request, root), { code: 'ENOENT' });
    const mdxSha = execFileSync('git', ['hash-object', '--', mdx], { encoding: 'utf8' }).trim();
    await deleteNote({ ...request, extension: 'mdx', sha: mdxSha }, root);
    await assert.rejects(readFile(mdx), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('삭제 요청 처리와 변경된 글 보호 및 미지원 작업 거절', async () => {
  const root = await mkdtemp(join(tmpdir(), 'study-delete-queue-'));
  try {
    await mkdir(join(root, '.study-inbox'));
    const path = await saveNote(input, root);
    const sha = execFileSync('git', ['hash-object', '--', join(root, path)], { encoding: 'utf8' }).trim();
    const request = { action: 'delete', category: 'js', slug: 'event-loop', extension: 'md', sha };
    const queue = join(root, '.study-inbox/delete-event-loop.json');
    await writeFile(queue, JSON.stringify(request));
    await writeFile(join(root, path), '확인 후 변경된 내용');
    const stale = await publishPendingNotes(root);
    assert.equal(stale.deleted.length, 0);
    assert.equal(stale.failed.length, 1);
    assert.ok(await readFile(queue));
    const newSha = execFileSync('git', ['hash-object', '--', join(root, path)], { encoding: 'utf8' }).trim();
    await writeFile(queue, JSON.stringify({ ...request, sha: newSha }));
    await writeFile(join(root, '.study-inbox/unsupported.json'), JSON.stringify({ ...input, action: 'replace' }));
    const result = await publishPendingNotes(root);
    assert.deepEqual(result.deleted, [path]);
    assert.equal(result.published.length, 0);
    assert.equal(result.failed.length, 1);
    await assert.rejects(readFile(queue), { code: 'ENOENT' });
    await assert.rejects(readFile(join(root, path)), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
