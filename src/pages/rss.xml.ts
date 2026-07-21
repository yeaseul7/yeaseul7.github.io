import { getCollection } from "astro:content";

const escapeXml = (value: string) =>
  value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] ?? character);

export async function GET({ site }: { site: URL }) {
  const posts = (await getCollection("docs"))
    .filter(({ id, data }) => id !== "index" && !id.startsWith("secret/") && data.updatedAt)
    .sort((a, b) => b.data.updatedAt!.getTime() - a.data.updatedAt!.getTime());

  const items = posts.map(({ id, data }) => {
    const url = new URL(`/${id}/`, site).href;
    return `<item>
      <title>${escapeXml(data.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <description>${escapeXml(data.description ?? data.title)}</description>
      <pubDate>${data.updatedAt!.toUTCString()}</pubDate>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Sseong Dev</title>
    <link>${site.href}</link>
    <description>Frontend 개발자 이예슬의 Engineering Notes</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
