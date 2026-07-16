# Frontend State & Design Patterns

The frontend application (`apps/web`) is built with React 19 and Vite, styled using Tailwind CSS v4, and utilizes TanStack libraries for routing, state, and form handling.

---

## 🚏 File-Based Routing (TanStack Router)

Routing is defined in a tree structure under `apps/web/src/routes/`:

- **Root Layout (`__root.tsx`)**: Configures the base application shell, rendering the global state managers (theme providers, query clients, confirmation dialogs) and mounting debugging tools.
- **Public Paths (`_public/`)**: Accessible routes for homepage views, marketing content, and course catalogues.
- **Authentication Paths (`auth/`)**: Contains login, registration, password recovery, and email verification layouts.
- **Student Dashboard (`dash/`)**: Layout protecting paths for course pages, lecture videos, progress logs, and discussion boards.
- **Instructor Dashboard (`admin/`)**: Layout protecting teacher dashboard functions (creating courses, uploading videos, managing enrollments, and processing refunds).

---

## 🎨 UI Core & Styling Architecture (Base UI & Branded OKLCH Theme)

To create a highly customisable, responsive, and accessibility-compliant design system, the codebase deviates from basic component frameworks and relies on custom styling definitions:

### 1. Headless Primitives via Base UI (`@base-ui/react`)

Instead of using standard styled components or traditional Radix UI bindings directly, ProTech LMS UI components (`packages/ui/src/components/*`) leverage **Base UI** by MUI.

- **Decoupled Style**: Components are imported from `@base-ui/react` (e.g. `AlertDialogPrimitive`, `ButtonPrimitive`, `DialogPrimitive`) which provide unstyled accessibility mechanics, focus locks, keyboard trap rules, and WAI-ARIA states.
- **Complete Styling Freedom**: Tailwind CSS class lists are written directly onto these primitives, eliminating the rigidity of default theme overlays.

### 2. Branded OKLCH Colors & Tailwind CSS v4 Theme

The styling layer is configured inside [packages/ui/src/styles/globals.css](../packages/ui/src/styles/globals.css) using Tailwind CSS v4 design directives:

- **Modern Color Space**: Color tokens (background, foreground, card, accent, destructive, etc.) are declared using the **OKLCH** color format (e.g. `oklch(0.145 0 0)`), providing perceptually uniform brightness scaling in modern browsers.
- **Custom Dark Mode Hook**: Enforced at compile-time using the Tailwind v4 custom dark selector:
  ```css
  @custom-variant dark (&:is(.dark *));
  ```
- **Inline Theme Mappings**: Custom variables like custom video player elements (`--color-dv-primary`), fonts (`Inter Variable`), and radius levels (`--radius-md`, `--radius-lg`) are registered directly under the `@theme inline` block for build-time optimization.
- **Performant Keyframes**: Animators like scale-fade (`.animate-scale-fade`) are declared in the CSS base layer for GPU-accelerated client-side rendering.

---

## 🔄 Server State Synchronization (TanStack Query)

Client data fetching and caching are managed using TanStack Query, organized into query key factories and custom query/mutation hooks.

### 1. Query Key Factories

Keys are structured hierarchically using query key factories to keep cache invalidation predictable:

```typescript
export const coursesKeys = {
  all: ["courses"] as const,
  lists: () => [...coursesKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...coursesKeys.lists(), filters] as const,
  details: () => [...coursesKeys.all, "detail"] as const,
  detail: (id: string) => [...coursesKeys.details(), id] as const,
};
```

### 2. Optimistic Updates

For high-latency user actions (like saving settings or renaming a module), the application uses optimistic updates to make the UI feel faster:

1.  **Cancel Queries**: Outgoing queries for that key are canceled using `queryClient.cancelQueries()`.
2.  **Snapshot State**: Current query cache values are snapshotted.
3.  **Update Cache**: The cache is updated optimistically using new values.
4.  **Error Rollback**: If the server request fails, the cache is rolled back to the snapshotted state.
5.  **Settled Sync**: On completion (success or error), the queries are invalidated to force a fresh fetch from the server.

---

## 📋 Form Validation (TanStack Form + Zod)

Forms are handled headlessly using `@tanstack/react-form` combined with schemas from the shared `@oedulms/validator` package.

```
[Form Input] ──> [Zod Validation Schema] ──> [If Error] ──> [FormError Component]
                                                                  │
                                                        Animates height & opacity
```

### Key Form Design Patterns:

- **Zod schema re-use**: Schemas are imported from the shared `@oedulms/validator` package to ensure matching validation rules on the client and server.
- **Direct Error Rendering**: Validation errors are passed directly to error elements (e.g. `<FieldError errors={field.state.meta.errors} />`) without runtime transformations.
- **Encapsulated Error UI**: The `<FormError>` component handles the entrance and exit transitions of error messages using height and opacity animations.

---

## 🎬 Custom UI Extensions

### 1. Premium Video Player (`DvideoPlayer`)

Built on top of Video.js and located under `packages/dvideo`, the video player includes premium controls:

- **Adaptive HLS Quality Selection**: Parses `.m3u8` manifests and renders quality options (e.g. 1080p, 720p, Auto) in the settings menu.
- **2x Fast-Forward HUD**: Long-pressing the spacebar or clicking and holding on the video surface speeds up playback to `2.0x`.
- **Volume Slider**: Custom draggable volume bar with absolute bounding bounds.
- **Resume Playback**: Playback offsets are saved to `localStorage` based on the video URL, prompting the user to resume where they left off.

### 2. Promise-Based Confirmation Dialog

To prevent UI clutter from nested modals, confirmation dialogs are handled globally using a promise-based store:

- Calling the `useConfirm()` hook returns an async function:
  ```typescript
  const confirm = useConfirm();
  const isConfirmed = await confirm({ title: "Delete Course?", destructive: true });
  ```
- The application suspends execution, rendering a global modal, and resolves the promise to `true` or `false` based on the user's action.
