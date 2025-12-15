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
          autogenerate: { directory: "js" },
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
      head: [
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: "/favicon.png",
            type: "image/png",
          },
        },
      ],
    }),
    mdx(),
    sitemap(),
  ],
  site: "https://yeaseul7.github.io/",
  trailingSlash: "always",
  outDir: "docs",
});
