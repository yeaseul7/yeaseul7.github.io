import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightThemeNext from "starlight-theme-next";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [
    react(),
    starlight({
      credits: false,
      plugins: [starlightThemeNext()],
      sidebar: [
        {
          label: "Home",
          items: ["index", "about"],
        },

        {
          label: "Javascript",
          items: [
            "js/arguments_property",
            "js/prototype",
            "js/class",
            "js/closure",
            "js/hoisting",
            "js/javasciprt_para",
            "js/javascript_func",
            "js/javascrpt_func_this",
            "js/iterable",
            "js/array_like_object",
            "js/single-thread",
            "js/v8-bytecode",
          ],
          collapsed: true,
        },
        {
          label: "Frontend",
          autogenerate: { directory: "fe" },
          collapsed: true,
        },
        {
          label: "Browser",
          autogenerate: { directory: "browser" },
          collapsed: true,
        },
        {
          label: "Computer Science",
          autogenerate: { directory: "cs" },
          collapsed: true,
        },
        {
          label: "Network",
          autogenerate: { directory: "network" },
          collapsed: true,
        },
        {
          label: "Server",
          autogenerate: { directory: "server-side" },
          collapsed: true,
        },
        {
          label: "Tip",
          autogenerate: { directory: "tip" },
          collapsed: true,
        },
        {
          label: "Retrospect",
          autogenerate: { directory: "retrospect" },
          collapsed: true,
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
      ],
    }),
    mdx(),
    sitemap({
      changefreq: "weekly",
      priority: 0.7,
      serialize(item) {
        // 각 URL에 lastmod 추가 (Google이 더 잘 읽을 수 있도록)
        item.lastmod = new Date().toISOString();
        return item;
      },
      // 사용하지 않는 네임스페이스 제거 (더 깔끔한 sitemap)
      namespaces: {
        news: false,
        video: false,
        image: false,
        xhtml: true, // 다국어 지원이 필요하면 true 유지
      },
    }),
  ],
  site: "https://yeaseul7.github.io/",
  trailingSlash: "always",
  outDir: "docs",
});
