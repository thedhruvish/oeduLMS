import { Link } from "@tanstack/react-router";
import { Button } from "@oedulms/ui/components/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="flex flex-col gap-6 max-w-md items-center">
        <h1 className="text-8xl font-black tracking-tight text-primary">404</h1>
        <h2 className="text-2xl font-bold tracking-tight">Page Not Found</h2>
        <p className="text-muted-foreground text-sm">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved,
          deleted, or you might not have access to it.
        </p>
        <div className="flex gap-4">
          <Link to="/">
            <Button>Go to Homepage</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
