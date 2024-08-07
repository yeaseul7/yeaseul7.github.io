import PageModule from "../component/pageModule";
import ProjectMain from "../component/ProjectMain";
import { programersList } from "./algorithm/programers";
import { projectList } from "./projects/projectList";
import { list2023 } from "./retrospect/list2023";
import { list2024 } from "./retrospect/list2024";
import { javascriptBook } from "./Review/javascriptBook";
import { azureList } from "./tech/azureList";

import { csList } from "./tech/csList";
import { developList } from "./tech/developList";
import { javascriptList } from "./tech/javascriptList";
import { nextList } from "./tech/nextList";
import { nodeList } from "./tech/nodeList";
import { reactList } from "./tech/reactList";
import { sqlList } from "./tech/sqlList";
import { webList } from "./tech/webList";

export const menuList = [
  {
    name: "About",
    path: "/blogInro/markdown/introMd/",
    Component: () => <PageModule />,
  },
  {
    name: "Tech",
    path: "/tech/*",
    Component: () => <ProjectMain subMenuList={tectMenuList} />,
  },
  {
    name: "Review",
    path: "/review/*",
    Component: () => <ProjectMain subMenuList={reviewMenuList} />,
  },
  {
    name: "Algorithm",
    path: "/algorithm/*",
    Component: () => <ProjectMain subMenuList={algorithmMenuList} />,
  },
  {
    name: "Retrospect",
    path: "/retrospect/*",
    Component: () => <ProjectMain subMenuList={retrospectMenuList} />,
  },
  {
    name: "Project",
    path: "/project/*",
    Component: () => <ProjectMain subMenuList={projectMenuList} />,
  },
];

export const tectMenuList = [
  { name: "Computer Science", path: "/tech/cs/*", list: csList },
  { name: "React", path: "/tech/react/*", list: reactList },
  { name: "Next.js", path: "/tech/next/*", list: nextList },
  { name: "Web", path: "/tech/web/*", list: webList },
  { name: "Node.js", path: "/tech/node/*", list: nodeList },
  { name: "javascript", path: "/tech/javascript/*", list: javascriptList },
  { name: "azure", path: "/tech/azure/*", list: azureList },
  { name: "sql", path: "/tech/sql/*", list: sqlList },
  { name: "develop", path: "/tech/develop/*", list: developList },
];
export const reviewMenuList = [
  { name: "javascriptBook", path: "/review/book/*", list: javascriptBook },
  // { name: "Book1", path: "/review/book1/*", list: csList },
  // { name: "Book2", path: "/review/book2/*", list: csList },
  // { name: "Book3", path: "/review/book3/*", list: csList },
];
export const algorithmMenuList = [
  // { name: "Baekjoon", path: "/algorithm/baekjoon/*", list: csList },
  {
    name: "Programmers",
    path: "/algorithm/programmers/*",
    list: programersList,
  },
];
export const retrospectMenuList = [
  { name: "2023", path: "/retrospect/2023/*", list: list2023 },
  { name: "2024", path: "/retrospect/2024/*", list: list2024 },
];
export const projectMenuList = [
  { name: "blog", path: "/project/blog/*", list: projectList },
];
