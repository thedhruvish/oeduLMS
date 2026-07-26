import { Route as rootRoute } from "./routes/__root";
import "./routes/_public/route";
import "./routes/_public/index";
import "./routes/_public/home";
import "./routes/_public/about";
import "./routes/_public/courses.index";
import "./routes/_public/courses.$slug";

export function getPublicRouteTree() {
  return rootRoute;
}
