import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { publishExam } from './publish-exam.mjs';

export const categories = ['js', 'algorithm', 'fe', 'browser', 'cs', 'network', 'server-side', 'ai', 'tip', 'project'];

export async function prepareNote(input) {
  const { category, slug, title, description, body } = input;
  if (!categories.includes(category)) throw new Error('지원하지 않는 카테고리입니다.');
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
    throw new Error('slug는 영문 소문자·숫자·하이픈으로 100자 이내여야 합니다.');
  }
  for (const [name, value, max] of [['title', title, 120], ['description', description, 300], ['body', body, 35000]]) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${name}의 값 또는 길이가 잘못되었습니다.`);
  }
  if (/^---\s*(?:\r?\n|$)/.test(body)) throw new Error('본문에 frontmatter를 넣지 마세요.');

  // shortcut: 출처 링크의 존재만 검사한다. 글의 깊이와 주장·출처의 일치는 GPT가 자료와 대조해 검토한다.
  let sourceLinks = 0;
  const processor = await createMarkdownProcessor({
    syntaxHighlight: false,
    remarkPlugins: [() => (tree) => {
      const definitions = new Map(tree.children
        .filter((node) => node.type === 'definition')
        .map((node) => [node.identifier.toLowerCase(), node.url]));
      function inspect(node) {
        if (node.type === 'html') throw new Error('코드 블록 밖의 HTML은 허용하지 않습니다.');
        if (node.type === 'link' || node.type === 'image' || node.type === 'definition') {
          const anchor = node.type !== 'image' && node.url.startsWith('#');
          if (!anchor && !/^https:\/\//i.test(node.url)) throw new Error('외부 링크와 이미지는 HTTPS 절대 주소를 사용하세요.');
        }
        const url = node.type === 'link' ? node.url
          : node.type === 'linkReference' ? definitions.get(node.identifier.toLowerCase()) : undefined;
        if (url && /^https:\/\//i.test(url)) sourceLinks++;
        for (const child of node.children ?? []) inspect(child);
      }
      inspect(tree);
    }],
  });
  await processor.render(body);
  if (!sourceLinks) throw new Error('본문에서 참조한 자료의 HTTPS 링크가 필요합니다.');
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
  const frontmatter = `---\ntitle: ${JSON.stringify(title.trim())}\ndescription: ${JSON.stringify(description.trim())}\nupdatedAt: ${date}\n---\n\n`;
  return { path: `src/content/docs/${category}/${slug}.md`, content: frontmatter + body.trim() + '\n' };
}

export async function saveNote(input, root = process.cwd()) {
  const note = await prepareNote(input);
  const target = resolve(root, note.path);
  try {
    await access(target.replace(/\.md$/, '.mdx'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await mkdir(resolve(target, '..'), { recursive: true });
    // 재시도와 같은 제목의 새 글 모두 기존 학습 기록을 덮어쓰지 않는다.
    await writeFile(target, note.content, { flag: 'wx' });
    return note.path;
  }
  throw new Error('같은 경로의 MDX 글이 이미 있습니다.');
}

export async function deleteNote(input, root = process.cwd()) {
  const { category, slug, extension, sha } = input;
  if (![...categories, 'retrospect', 'game'].includes(category)
    || typeof slug !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,99}$/.test(slug)
    || !['md', 'mdx'].includes(extension)
    || typeof sha !== 'string' || !/^[a-f0-9]{40}$/.test(sha)) {
    throw new Error('삭제 대상의 카테고리·파일명·확장자·SHA를 확인하세요.');
  }
  const path = `src/content/docs/${category}/${slug}.${extension}`;
  const target = resolve(root, path);
  const content = await readFile(target);
  const currentSha = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
  if (sha !== currentSha) throw new Error('확인 후 글이 변경되어 삭제하지 않았습니다. 최신 글을 확인하세요.');
  await rm(target);
  return path;
}

export async function publishPendingNotes(root = process.cwd()) {
  const inbox = resolve(root, '.study-inbox');
  const published = [];
  const deleted = [];
  const exams = [];
  const failed = [];
  for (const file of await readdir(inbox, { withFileTypes: true })) {
    if (!file.isFile() || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(file.name)) continue;
    try {
      const request = await readFile(resolve(inbox, file.name), 'utf8');
      if (Buffer.byteLength(request) > 200000) throw new Error('게시 요청 크기를 초과했습니다.');
      const input = JSON.parse(request);
      const action = input.action ?? 'create';
      if (!['create', 'delete', 'publish-exam'].includes(action)) throw new Error('지원하지 않는 작업입니다.');
      const path = action === 'publish-exam' ? await publishExam(input, root)
        : action === 'delete' ? await deleteNote(input, root) : await saveNote(input, root);
      await rm(resolve(inbox, file.name));
      (action === 'publish-exam' ? exams : action === 'delete' ? deleted : published).push(path);
    } catch (error) {
      // 잘못된 요청 하나가 이후의 정상 요청까지 막지 않도록 남겨 두고 계속한다.
      failed.push({ file: file.name, reason: error.message });
    }
  }
  return { published, deleted, exams, failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await publishPendingNotes();
  const count = result.published.length + result.deleted.length + result.exams.length;
  await writeFile(process.env.GITHUB_OUTPUT, `count=${count}\n`, { flag: 'a' });
  console.log(JSON.stringify(result, null, 2));
  if (!count && result.failed.length) process.exitCode = 1;
}
