import { Route as rootRoute } from "./routes/__root";
import { Route as publicLayoutRoute } from "./routes/_public/route";
import { Route as indexRoute } from "./routes/_public/index";
import { Route as homeRoute } from "./routes/_public/home";
import { Route as aboutRoute } from "./routes/_public/about";
import { Route as coursesIndexRoute } from "./routes/_public/courses.index";
import { Route as coursesSlugRoute } from "./routes/_public/courses.$slug";

export function getPublicRouteTree() {
  const publicLayout = publicLayoutRoute.update({
    id: "/_public",
    getParentRoute: () => rootRoute,
  });

  const idx = indexRoute.update({
    id: "/",
    path: "/",
    getParentRoute: () => publicLayout,
  });

  const home = homeRoute.update({
    id: "/home",
    path: "/home",
    getParentRoute: () => publicLayout,
  });

  const about = aboutRoute.update({
    id: "/about",
    path: "/about",
    getParentRoute: () => publicLayout,
  });

  const coursesIndex = coursesIndexRoute.update({
    id: "/courses/",
    path: "/courses",
    getParentRoute: () => publicLayout,
  });

  const coursesSlug = coursesSlugRoute.update({
    id: "/courses/$slug",
    path: "/courses/$slug",
    getParentRoute: () => publicLayout,
  });

  const publicChildren = {
    indexRoute: idx,
    homeRoute: home,
    aboutRoute: about,
    coursesIndexRoute: coursesIndex,
    coursesSlugRoute: coursesSlug,
  };

  const publicWithChildren = (publicLayout)._addFileChildren(publicChildren);

  return (rootRoute)._addFileChildren({
    publicRoute: publicWithChildren,
  });
}
