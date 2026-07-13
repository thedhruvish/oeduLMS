import { createFileRoute } from "@tanstack/react-router";
import { DvideoPlayer } from "@oedulms/dvideo";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Custom Premium Video Player</h1>
      <p className="text-sm opacity-80">
        Testing `@oedulms/dvideo` with local workspace video. Try shortcuts: <b>Space/K</b> (play),{" "}
        <b>F</b> (fullscreen), <b>M</b> (mute), <b>P</b> (PiP), <b>Arrows</b> (seek/volume).
      </p>
      <div className="w-full">
        <DvideoPlayer
          src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
          isEnableCinemaMode={true}
          onNext={() => toast.success("Next video skip triggered!")}
          onPrev={() => toast.success("Previous video skip triggered!")}
        />
      </div>
    </div>
  );
}
