import { type ErrorComponentProps, Link } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import NotFound from "./not-found";
import { Button } from "@oedulms/ui/components/button";

export function DefaultErrorComponent({ error, reset }: ErrorComponentProps) {
  // If the error is an API 404 Not Found error, render the clean 404 page
  if (isAxiosError(error) && error.response?.status === 404) {
    return <NotFound />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="flex flex-col gap-4 max-w-md items-center border border-border/60 bg-card p-8 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong!</h2>
        <p className="text-muted-foreground text-sm">
          {error?.message || "An unexpected error occurred while loading this page."}
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => reset()}>
            Try Again
          </Button>
          <Link to="/">
            <Button>Go to Homepage</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
