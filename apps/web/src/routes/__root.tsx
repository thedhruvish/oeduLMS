import { GlobalConfirmDialog } from "@/components/ui/global-confirm-dialog";
import { TooltipProvider } from "@oedulms/ui/components/tooltip";
import { Toaster } from "@oedulms/ui/components/sonner";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import "../index.css";
import { ThemeProvider } from "@/components/theme-provider";
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
        title: "oedulms",
      },
      {
        name: "description",
        content: "oedulms is a web application",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
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
        <TooltipProvider>
          <Outlet />
          <Toaster richColors />
          <GlobalConfirmDialog />
        </TooltipProvider>
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
    </>
  );
}
