import type { StarlightUserConfig } from "@astrojs/starlight/types";

export const engineering = [
  {
    label: "JavaScript & TypeScript",
    collapsed: true,
    items: [{ autogenerate: { directory: "js" } }],
  },
  {
    label: "Frontend",
    collapsed: true,
    items: [
      "browser/virtual-dom",
      "cs/server_client_component",
      "fe/state",
      "fe/react-batching",
      "fe/ssr-csr",
      "fe/web-standards",
      "fe/dynamic-meta",
      "fe/webpack",
      { autogenerate: { directory: "tip" } },
    ],
  },
  {
    label: "Browser & Runtime",
    collapsed: true,
    items: [
      "browser/cross-browsing",
      "fe/reflow_repaint",
    ],
  },
  {
    label: "Computer Science",
    collapsed: true,
    items: [
      { autogenerate: { directory: "cs" } },
      { autogenerate: { directory: "algorithm" } },
    ],
  },
  {
    label: "Network",
    collapsed: true,
    items: [
      "network/network",
      "network/protocol",
      "network/http-https",
      "network/fetch-and-http",
    ],
  },
  {
    label: "Backend & Database",
    collapsed: true,
    items: ["fe/web-server", { autogenerate: { directory: "server-side" } }],
  },
  {
    label: "Infrastructure",
    collapsed: true,
    items: [
      "network/cdn",
      "network/frontdoor",
      "fe/vercel-cloudflare",
    ],
  },
  {
    label: "AI Engineering",
    collapsed: true,
    items: [{ autogenerate: { directory: "ai" } }],
  },
] satisfies NonNullable<StarlightUserConfig["sidebar"]>;
