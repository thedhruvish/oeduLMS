import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "@/lib/query-client";
import { useAuth, authQueryOptions } from "@/api/auth";
import type { AuthContextType } from "@/types/auth";

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


if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  
  // Prime auth session query cache before mounting to prevent initial route pending flash
  queryClient.ensureQueryData(authQueryOptions).finally(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
  });
}
