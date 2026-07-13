import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightThemeNext from "starlight-theme-next";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default defineConfig({
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
  integrations: [
    starlight({
      credits: false,
      plugins: [starlightThemeNext()],
      components: {
        Footer: "./src/components/CommentsFooter.astro",
      },
      sidebar: [
        {
          label: "Home",
          items: ["index", "about"],
        },

        {
          label: "Javascript",
          collapsed: true,
          items: [{ autogenerate: { directory: "js" } }],
        },
        {
          label: "Algorithm",
          collapsed: true,
          items: [{ autogenerate: { directory: "algorithm" } }],
        },
        {
          label: "Frontend",
          collapsed: true,
          items: [{ autogenerate: { directory: "fe" } }],
        },
        {
          label: "Browser",
          collapsed: true,
          items: [{ autogenerate: { directory: "browser" } }],
        },
        {
          label: "Computer Science",
          collapsed: true,
          items: [{ autogenerate: { directory: "cs" } }],
        },
        {
          label: "Network",
          collapsed: true,
          items: [{ autogenerate: { directory: "network" } }],
        },
        {
          label: "Server",
          collapsed: true,
          items: [{ autogenerate: { directory: "server-side" } }],
        },
        {
          label: "Tip",
          collapsed: true,
          items: [{ autogenerate: { directory: "tip" } }],
        },
        {
          label: "Retrospect",
          collapsed: true,
          items: [{ autogenerate: { directory: "retrospect" } }],
        },
      ],
      social: [
        {
          href: "https://github.com/yeaseul7",
          icon: "github",
          label: "GitHub",
        },
        {
          // Use a base-aware internal path so it works under /ssaong_dev_blog/
          href: "/about/",
          icon: "information",
          label: "About Me",
        },
      ],
      title: "Sseong Dev",
      description:
        "Frontend 개발자 이예슬의 개발 블로그. React, TypeScript, Next.js를 주력으로 사용하며 웹 개발과 프론트엔드 기술에 대한 글을 공유합니다.",
      head: [
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: "/favicon.png",
            type: "image/png",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "sitemap",
            href: "/sitemap-index.xml",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "google-site-verification",
            content: "strh2kXWs-eYvP8zwz0bIZMLBThPA0mLKvxzYftfQ6k",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "naver-site-verification",
            content: "6724760dddce453fb49399f0a1133ab8c91d000f",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:description",
            content:
              "Frontend 개발자 이예슬의 개발 블로그. React, TypeScript, Next.js를 주력으로 사용하며 웹 개발과 프론트엔드 기술에 대한 글을 공유합니다.",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "keywords",
            content:
              "프론트엔드, Frontend, React, TypeScript, Next.js, 웹개발, 개발블로그, JavaScript, 개발자, 이예슬, 쎄옹블로그, 쎄옹 블로그, 쎄옹의 개발 블로그, 이예슬 블로그",
          },
        },
        {
          tag: "script",
          attrs: {
            async: true,
            src: "https://www.googletagmanager.com/gtag/js?id=G-CZD8XP5VE0",
          },
        },
        {
          tag: "script",
          content: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-CZD8XP5VE0');
          `,
        },
        {
          tag: "meta",
          attrs: {
            name: "google-adsense-account",
            content: "ca-pub-3760441216253528",
          },
        },
        {
          tag: "script",
          attrs: {
            async: true,
            src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3760441216253528",
            crossorigin: "anonymous",
          },
        },
      ],
    }),
    mdx(),
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith("/secret/"),
      changefreq: "weekly",
      priority: 0.7,
      namespaces: {
        news: false,
        video: false,
        image: false,
        xhtml: true,
      },
    }),
  ],
  site: "https://yeaseul7.github.io/",
  trailingSlash: "always",
  outDir: "dist",
});
