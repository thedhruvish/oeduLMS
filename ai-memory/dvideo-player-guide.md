# Custom Premium Video Player (`DvideoPlayer`) Guide

The `DvideoPlayer` is a premium, feature-rich HTML5 & HLS video player package built on top of `@videojs/react`.

---

## 1. Import and Basic Usage

To use the custom premium video player, import `DvideoPlayer` from the `@oedulms/dvideo` workspace package:

```tsx
import { DvideoPlayer } from "@oedulms/dvideo";
import { toast } from "sonner";

export function CourseLecture() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <DvideoPlayer
        src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        poster="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"
        isEnableCinemaMode={true}
        onNext={() => toast.success("Playing next lecture")}
        onPrev={() => toast.success("Playing previous lecture")}
      />
    </div>
  );
}
```

---

## 2. Configuration Options (`Props`)

The `DvideoPlayer` component accepts the following props:

| Prop | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `src` | `string` | **Yes** | The video source URL. Supports standard video files (`.mp4`, `.webm`) and HLS playlists (`.m3u8`). |
| `poster` | `string` | No | URL of the image displayed before the video starts playing. |
| `isEnableCinemaMode` | `boolean` | No | If `true`, renders a button and registers the `T` hotkey to toggle widescreen aspect-21/9 cinema view. |
| `onNext` | `() => void` | No | Callback triggered when the user clicks the "Next Video" skip button. |
| `onPrev` | `() => void` | No | Callback triggered when the user clicks the "Previous Video" skip button. |

---

## 3. Core Features

### 📡 Native & HLS (.m3u8) Playback
*   **Automatic Quality Detection**: Detects `.m3u8` source URLs and dynamically mounts `<HlsJsVideo>` driven by `hls.js`. 
*   **Quality Selection Menu**: Manifest streams are parsed and resolutions (e.g., 1080p, 720p, Auto) are added as selectable options in the Settings dropdown.

### ⏱️ Smart Timeline Control
*   **Persistent Handle**: Scrubber handle remains visible at `scale-75`, expanding to `scale-110` on hover for optimal mobile and desktop targeting.
*   **Remaining/Elapsed Time Toggle**: Clicking on the time display toggles the left-side timer between elapsed (e.g. `5:00 / 20:00`) and remaining (e.g. `-15:00 / 20:00`) formats.

### 🎛️ Premium Theme & UI
*   **Glassmorphic Settings Menu**: Dropdown background uses `bg-dv-surface/50 backdrop-blur-xl` and smooth scale/zoom-in transitions.
*   **Custom Volume Slider**: Draggable volume slider with absolute thumb positioning ensuring the slider handle never clips or becomes square at boundary edges.
*   **Dual-Ring Buffering Indicator**: A counter-rotating dual spinner that renders over a frosted overlay when HLS chunks are loading or network speed drops.

### ⚡ Click & Hold 2x Fast-Forward
*   **Action**: Clicking and holding the left mouse button on the video surface, or long-pressing the `Space` key triggers a temporary `2.0x` speed-up.
*   **Visual HUD**: Renders a glowing `2.0x SPEED` banner at the top of the player.
*   **Reset**: Releasing the key/mouse button smoothly restores the video to its original playback rate.

### 💾 Resume Playback Tracker
*   Saves video progress to `localStorage` keyed by `src` URL.
*   Triggers a custom prompt toast allowing users to resume their viewing session from the exact second they left off.

---

## 4. Keyboard Shortcuts (Hotkeys)

The player listens for global window keyboard shortcuts when no input field is focused:

| Key | Action |
| --- | ------ |
| `Space` or `K` | Play / Pause |
| `F` | Toggle Fullscreen |
| `M` | Mute / Unmute Volume |
| `P` | Toggle Picture-in-Picture |
| `C` | Toggle Captions/Subtitles |
| `T` | Toggle Cinema Mode (requires `isEnableCinemaMode={true}`) |
| `Shift + >` or `.` | Speed Up Playback (Max 4x) |
| `Shift + <` or `,` | Slow Down Playback (Min 0.25x) |
| `→` | Seek Forward 5 seconds |
| `←` | Seek Backward 5 seconds |
| `↑` | Increase Volume by 5% |
| `↓` | Decrease Volume by 5% |
| `Shift + ?` | Open Keyboard Shortcuts Help Modal |
