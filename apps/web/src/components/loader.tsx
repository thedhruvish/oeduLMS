import { Loader2 } from "lucide-react";

export default function Loader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Loader2 className="animate-spin text-primary size-10" />
    </div>
  );
}
