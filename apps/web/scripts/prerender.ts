import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import React from "react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider, dehydrate } from "@tanstack/react-query";

interface GlobalWindowPolyfill {
  window?: unknown;
  matchMedia?: (query: string) => MediaQueryList;
}

// Global DOM & Window polyfill for SSG Node/Bun environment
if (typeof window === "undefined") {
  const globalObj = globalThis as unknown as GlobalWindowPolyfill;
  globalObj.window = globalThis;
  if (!globalThis.window.matchMedia) {
    globalThis.window.matchMedia = () => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
}

import { getPublicRouteTree } from "../src/publicRouteTree";
import { queryClient } from "../src/lib/query-client";
import {
  publicCoursesQueryOptions,
  publicCourseDetailQueryOptions,
  publicCourseCurriculumQueryOptions,
  publicCourseFaqsQueryOptions,
} from "../src/api/courses";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, "..");
const distDir = path.resolve(webDir, "dist");

interface PageConfig {
  url: string;
  title: string;
  prefetch?: () => Promise<void>;
}

async function runPrerender() {
  console.log("🚀 Starting SSG prerendering using live API...");

  const templatePath = path.join(distDir, "index.html");
  let htmlTemplate: string;
  try {
    htmlTemplate = await fs.readFile(templatePath, "utf-8");
  } catch (err) {
    console.error("❌ Failed to read dist/index.html. Make sure 'vite build' runs first.", err);
    process.exit(1);
  }

  const serverUrl = process.env.VITE_SERVER_URL || "https://api-protech.dhruvish.in";
  const coursesApiUrl = `${serverUrl}/api/public/courses`;
  console.log(`🔍 Fetching course list from API: ${coursesApiUrl}`);

  let apiCourses: Array<{ id: string; title: string; slug: string }> = [];
  try {
    const res = await fetch(coursesApiUrl);
    if (res.ok) {
      apiCourses = (await res.json()) as Array<{ id: string; title: string; slug: string }>;
      console.log(`✅ Retrieved ${apiCourses.length} course(s) from API.`);
    } else {
      console.warn(`⚠️ API ${coursesApiUrl} returned status ${res.status}`);
    }
  } catch {
    console.warn(`⚠️ Could not connect to API at ${coursesApiUrl}.`);
  }

  // Fallback to production worker API if local API fails or returns no courses
  if (apiCourses.length === 0 && serverUrl !== "https://api-protech.dhruvish.in") {
    const prodServerUrl = "https://api-protech.dhruvish.in";
    const prodCoursesApiUrl = `${prodServerUrl}/api/public/courses`;
    console.log(`🔍 Falling back to production API: ${prodCoursesApiUrl}`);
    try {
      const res = await fetch(prodCoursesApiUrl);
      if (res.ok) {
        apiCourses = (await res.json()) as Array<{ id: string; title: string; slug: string }>;
        console.log(`✅ Retrieved ${apiCourses.length} course(s) from production API.`);
      }
    } catch (err) {
      console.warn(`⚠️ Could not connect to production API at ${prodCoursesApiUrl}.`, err);
    }
  }

  const pages: PageConfig[] = [
    {
      url: "/",
      title: "ProTech - Master Modern Programming",
      prefetch: async () => {
        await queryClient.ensureQueryData(publicCoursesQueryOptions);
      },
    },
    {
      url: "/home",
      title: "Home | ProTech",
      prefetch: async () => {
        await queryClient.ensureQueryData(publicCoursesQueryOptions);
      },
    },
    {
      url: "/about",
      title: "About Us | ProTech",
    },
    {
      url: "/courses",
      title: "All Courses | ProTech",
      prefetch: async () => {
        await queryClient.ensureQueryData(publicCoursesQueryOptions);
      },
    },
  ];

  // Add all dynamic /courses/* pages returned from the live API
  for (const course of apiCourses) {
    if (!course.slug) continue;
    pages.push({
      url: `/courses/${course.slug}`,
      title: `${course.title} | ProTech`,
      prefetch: async () => {
        await Promise.all([
          queryClient.ensureQueryData(publicCourseDetailQueryOptions(course.slug)),
          queryClient.ensureQueryData(publicCourseCurriculumQueryOptions(course.slug)),
          queryClient.ensureQueryData(publicCourseFaqsQueryOptions(course.slug)),
        ]);
      },
    });
  }

  const memoryHistory = createMemoryHistory({
    initialEntries: ["/"],
  });

  const router = createRouter({
    routeTree: getPublicRouteTree(),
    history: memoryHistory,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
    context: {
      auth: {
        user: null,
        role: null,
        isLoading: false,
        logout: async () => {},
        refresh: async () => {},
      },
      queryClient,
    },
  });

  let count = 0;

  for (const page of pages) {
    // Clear queryClient cache before each page so fresh route data is fetched
    queryClient.clear();

    if (page.prefetch) {
      try {
        await page.prefetch();
      } catch (e) {
        console.warn(`[SSG Warning] Prefetch failed for ${page.url}`, e);
      }
    }

    memoryHistory.push(page.url);
    await router.load();

    // Preload component chunks for matched routes
    interface PreloadableComponent {
      preload?: () => Promise<unknown>;
    }
    interface PreloadableRouteMatch {
      component?: PreloadableComponent;
      routeComponent?: PreloadableComponent;
      route?: {
        options?: {
          component?: PreloadableComponent;
          lazy?: PreloadableComponent;
        };
      };
    }

    await Promise.all(
      (router.state.matches || []).map(async (rawMatch) => {
        const match = rawMatch as PreloadableRouteMatch;
        const comps = [
          match?.component,
          match?.routeComponent,
          match?.route?.options?.component,
          match?.route?.options?.lazy,
        ];
        for (const comp of comps) {
          if (comp && typeof comp.preload === "function") {
            await comp.preload();
          }
        }
      })
    );

    let renderedContent = renderToString(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(RouterProvider, { router })
      )
    );

    // Extract any <link ...> tags from body HTML so they are moved to <head>
    const extractedLinks: string[] = [];
    renderedContent = renderedContent.replace(/<link\s+[^>]*\/?>/gi, (match) => {
      extractedLinks.push(match);
      return "";
    });

    // Clean out any <title>, <meta> tags, and initial hidden motion inline styles (opacity:0)
    renderedContent = renderedContent
      .replace(/<title>.*?<\/title>/gi, "")
      .replace(/<meta\s+[^>]*>/gi, "")
      .replace(/style="[^"]*opacity:\s*0[^"]*"/gi, "");

    const dehydratedState = dehydrate(queryClient);
    const headAdditions = [
      ...extractedLinks,
      `<script>window.__REACT_QUERY_STATE__ = ${JSON.stringify(dehydratedState)};</script>`,
    ].join("\n");

    // Update <title> tag in <head> template & inject head additions before </head>
    let pageHtml = htmlTemplate
      .replace(/<title>.*?<\/title>/i, `<title>${page.title}</title>`)
      .replace("</head>", `${headAdditions}\n</head>`);

    // Inject rendered markup into <div id="app">...</div>
    pageHtml = pageHtml.replace('<div id="app"></div>', `<div id="app">${renderedContent}</div>`);

    // Determine target output filepath
    const targetFile =
      page.url === "/"
        ? path.join(distDir, "index.html")
        : path.join(distDir, page.url.replace(/^\//, ""), "index.html");

    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.writeFile(targetFile, pageHtml, "utf-8");

    // Also write direct .html file for non-root routes (e.g. /courses -> dist/courses.html)
    // so preview servers resolving /courses without trailing slash serve courses.html directly instead of falling back to home index.html
    if (page.url !== "/") {
      const directHtmlFile = path.join(distDir, `${page.url.replace(/^\//, "")}.html`);
      await fs.mkdir(path.dirname(directHtmlFile), { recursive: true });
      await fs.writeFile(directHtmlFile, pageHtml, "utf-8");
    }

    console.log(`  ✓ Prerendered ${page.url} → ${path.relative(webDir, targetFile)}`);
    count++;
  }

  // Generate 404.html fallback and _redirects for Cloudflare Pages & Netlify SPA routing
  const rootIndexHtml = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
  await fs.writeFile(path.join(distDir, "404.html"), rootIndexHtml, "utf-8");
  await fs.writeFile(path.join(distDir, "_redirects"), "/*  /index.html  200\n", "utf-8");
  console.log(`  ✓ Generated 404.html fallback & _redirects for Cloudflare Pages`);

  console.log(`\n🎉 Successfully prerendered ${count} public pages at build time!`);
  process.exit(0);
}

runPrerender().catch((err) => {
  console.error("❌ SSG Prerender script failed:", err);
  process.exit(1);
});
