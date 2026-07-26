import { createRootRouteWithContext, createRoute } from "@tanstack/react-router";
import type { RouterAppContext } from "./routes/__root";
import { Route as rootRoute } from "./routes/__root";
import { Route as publicLayoutRoute } from "./routes/_public/route";
import { Route as indexRoute } from "./routes/_public/index";
import { Route as homeRoute } from "./routes/_public/home";
import { Route as aboutRoute } from "./routes/_public/about";
import { Route as coursesIndexRoute } from "./routes/_public/courses.index";
import { Route as coursesSlugRoute } from "./routes/_public/courses.$slug";

export function getPublicRouteTree() {
  const ssgRoot = createRootRouteWithContext<RouterAppContext>()({
    component: rootRoute.options.component,
    notFoundComponent: rootRoute.options.notFoundComponent,
    head: rootRoute.options.head as unknown as undefined,
  });

  const ssgLayout = createRoute({
    getParentRoute: () => ssgRoot,
    id: "_public",
    component: publicLayoutRoute.options.component,
  });

  const ssgIndex = createRoute({
    getParentRoute: () => ssgLayout,
    path: "/",
    component: indexRoute.options.component,
    loader: indexRoute.options.loader as unknown as undefined,
  });

  const ssgHome = createRoute({
    getParentRoute: () => ssgLayout,
    path: "/home",
    component: homeRoute.options.component,
    loader: homeRoute.options.loader as unknown as undefined,
  });

  const ssgAbout = createRoute({
    getParentRoute: () => ssgLayout,
    path: "/about",
    component: aboutRoute.options.component,
    loader: aboutRoute.options.loader as unknown as undefined,
  });

  const ssgCoursesIndex = createRoute({
    getParentRoute: () => ssgLayout,
    path: "/courses",
    component: coursesIndexRoute.options.component,
    loader: coursesIndexRoute.options.loader as unknown as undefined,
  });

  const ssgCoursesSlug = createRoute({
    getParentRoute: () => ssgLayout,
    path: "/courses/$slug",
    component: coursesSlugRoute.options.component,
    loader: coursesSlugRoute.options.loader as unknown as undefined,
  });

  return ssgRoot.addChildren([
    ssgLayout.addChildren([
      ssgIndex,
      ssgHome,
      ssgAbout,
      ssgCoursesIndex,
      ssgCoursesSlug,
    ]),
  ]);
}
