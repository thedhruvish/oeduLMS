import { Outlet } from "@tanstack/react-router";
import { Navbar } from "@/features/public/components/navbar";
import { Footer } from "@/features/public/components/footer";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
