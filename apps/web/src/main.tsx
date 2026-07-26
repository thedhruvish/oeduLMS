import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { QueryClientProvider, hydrate } from "@tanstack/react-query";

import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "@/lib/query-client";
import { useAuth, authQueryOptions } from "@/api/auth";
import type { AuthContextType } from "@/types/auth";

// Hydrate pre-fetched React Query state from SSG html if present
if (typeof window !== "undefined" && (window as any).__REACT_QUERY_STATE__) {
  hydrate(queryClient, (window as any).__REACT_QUERY_STATE__);
}

// Automatically clean trailing /index.html from URL path in browser before router initialization
if (typeof window !== "undefined" && window.location.pathname.endsWith("/index.html")) {
  const cleanPath = window.location.pathname.replace(/\/index\.html$/, "") || "/";
  window.history.replaceState(null, "", cleanPath + window.location.search + window.location.hash);
}

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultPendingComponent: () => <Loader />,
  context: {
    auth: undefined!, // Declared but initialized inside App wrapper
    queryClient,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const { user, role, isLoading, logout, refresh } = useAuth();

  const authContext: AuthContextType = {
    user,
    role,
    isLoading,
    logout,
    refresh,
  };

  return <RouterProvider router={router} context={{ auth: authContext }} />;
}

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

const appContent = (
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

if (rootElement.innerHTML.trim()) {
  ReactDOM.hydrateRoot(rootElement, appContent);
} else {
  ReactDOM.createRoot(rootElement).render(appContent);
}

// Prime auth query cache in background without delaying hydration
queryClient.ensureQueryData(authQueryOptions).catch(() => {});
