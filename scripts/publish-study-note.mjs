import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';

export const categories = ['js', 'algorithm', 'fe', 'browser', 'cs', 'network', 'server-side', 'tip', 'project'];
export const sections = ['핵심 요약', '내가 몰랐던 부분', '개념과 동작 원리', '예제와 반례', '복습 질문', '검증 근거'];

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

  // shortcut: 근거의 존재와 문서 구조만 검사한다. 주장과 출처의 일치 여부는 GPT의 자료 대조 단계에서 검토한다.
  const headings = new Set();
  let sourceLinks = 0;
  const text = (node) => node.value ?? (node.children ?? []).map(text).join('');
  const processor = await createMarkdownProcessor({
    syntaxHighlight: false,
    remarkPlugins: [() => (tree) => {
      let inSources = false;
      function inspect(node) {
        if (node.type === 'html') throw new Error('코드 블록 밖의 HTML은 허용하지 않습니다.');
        if (node.type === 'link' || node.type === 'image' || node.type === 'definition') {
          if (!/^https:\/\//i.test(node.url)) throw new Error('링크와 이미지는 HTTPS 절대 주소를 사용하세요.');
        }
        if (inSources && node.type === 'link') sourceLinks++;
        for (const child of node.children ?? []) inspect(child);
      }
      for (const node of tree.children) {
        if (node.type === 'heading' && node.depth <= 2) {
          inSources = node.depth === 2 && text(node) === '검증 근거';
          if (node.depth === 2) headings.add(text(node));
        }
        inspect(node);
      }
    }],
  });
  await processor.render(body);
  const missing = sections.filter((section) => !headings.has(section));
  if (missing.length) throw new Error(`필수 항목 누락: ${missing.join(', ')}`);
  if (!sourceLinks) throw new Error('검증 근거에 확인한 자료의 HTTPS 링크가 필요합니다.');
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

export async function publishPendingNotes(root = process.cwd()) {
  const inbox = resolve(root, '.study-inbox');
  const published = [];
  const failed = [];
  for (const file of await readdir(inbox, { withFileTypes: true })) {
    if (!file.isFile() || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(file.name)) continue;
    try {
      const request = await readFile(resolve(inbox, file.name), 'utf8');
      if (Buffer.byteLength(request) > 200000) throw new Error('게시 요청 크기를 초과했습니다.');
      const path = await saveNote(JSON.parse(request), root);
      await rm(resolve(inbox, file.name));
      published.push(path);
    } catch (error) {
      // 잘못된 요청 하나가 이후의 정상 요청까지 막지 않도록 남겨 두고 계속한다.
      failed.push({ file: file.name, reason: error.message });
    }
  }
  return { published, failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await publishPendingNotes();
  await writeFile(process.env.GITHUB_OUTPUT, `count=${result.published.length}\n`, { flag: 'a' });
  console.log(JSON.stringify(result, null, 2));
  if (!result.published.length && result.failed.length) process.exitCode = 1;
}
