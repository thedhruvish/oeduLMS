import { GlobalConfirmDialog } from "@/components/ui/global-confirm-dialog";
import { TooltipProvider } from "@oedulms/ui/components/tooltip";
import { Toaster } from "@oedulms/ui/components/sonner";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import "../index.css";
import { ThemeProvider } from "@/components/theme-provider";
import { DynamicThemeProvider } from "@/components/dynamic-theme-provider";
import type { QueryClient } from "@tanstack/react-query";
import type { AuthContextType } from "@/types/auth";
import NotFound from "@/components/not-found";

export interface RouterAppContext {
  auth?: AuthContextType;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      {
        title: "ProTech",
      },
      {
        name: "description",
        content: "Master programming languages with expert-led courses. Build real projects. Land your dream job.",
      },
      {
        name: "keywords",
        content: "programming, learning, courses, python, javascript, typescript, rust, coding",
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        href: "/favicon.png",
      },
    ],
  }),
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <DynamicThemeProvider>
          <TooltipProvider>
            <Outlet />
            <Toaster richColors />
            <GlobalConfirmDialog />
          </TooltipProvider>
        </DynamicThemeProvider>
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
    </>
  );
}
