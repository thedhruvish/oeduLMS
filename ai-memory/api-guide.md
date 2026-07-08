# API Client & Server State Guide (`TanStack Query`)

This document is a guide on how to set up, define, and consume backend API hooks using TanStack Query and Axios inside the web application (`apps/web`).

## Directory Structure
All server state logic is located under `apps/web/src/api/`.

```
apps/web/src/api/
├── axios-client.ts    # Reusable Axios instance with base VITE_SERVER_URL and credentials

├── query-keys.ts      # Product-domain modeled Query Key factories
├── auth.ts            # Authentication queries (useMe) and mutations (useLogin, useLogout)
└── courses.ts         # Course catalog queries (useCourses) and mutations (useCreateCourse)
```

---

## Guide: Creating a New API Hook (e.g. Courses)

### Step 1: Model Query Keys in `query-keys.ts`
Query keys must model the product domain. Create a key factory to keep key structures consistent:

```typescript
export const coursesKeys = {
  all: ["courses"] as const,
  lists: () => [...coursesKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...coursesKeys.lists(), filters] as const,
  details: () => [...coursesKeys.all, "detail"] as const,
  detail: (id: string) => [...coursesKeys.details(), id] as const,
};
```

### Step 2: Define Fetchers & Hooks in `src/api/courses.ts`
Write colocated fetcher functions and TanStack Query hooks in a domain-specific file.

#### 1. Defining Queries (Lists & Details)
Queries are used to fetch read-only data. Define queries with clean loading/error/stale data states:

```typescript
import { useQuery } from "@tanstack/react-query";
import { axiosClient } from "./axios-client";
import { coursesKeys } from "./query-keys";

// Colocated fetcher
async function fetchCourses(filters = {}): Promise<Course[]> {
  const { data } = await axiosClient.get("/api/courses", { params: filters });
  return data;
}

// Custom hook
export function useCourses(filters = {}) {
  const query = useQuery({
    queryKey: coursesKeys.list(filters),
    queryFn: () => fetchCourses(filters),
  });

  return {
    ...query,
    // Custom helper state for UX (avoids manual length checks)
    isEmpty: query.isSuccess && query.data.length === 0,
    isBackgroundRefetching: query.isFetching && !query.isLoading,
  };
}
```

#### 2. Defining Mutations (Targeted Invalidation)
Mutations write/modify server data. Trigger targeted cache invalidations on success:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

async function createCourse(payload: CreatePayload): Promise<Course> {
  const { data } = await axiosClient.post("/api/courses", payload);
  return data;
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      // Invalidate course lists to trigger fresh fetches
      queryClient.invalidateQueries({ queryKey: coursesKeys.lists() });
    },
  });
}
```

#### 3. Defining Mutations (Optimistic Updates)
Use optimistic updates for high-latency actions (like updating titles or toggling statuses) to make the UI feel instantaneous:

```typescript
export function useUpdateCourse(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePayload) => axiosClient.put(`/api/courses/${id}`, payload),
    onMutate: async (newCourseData) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: coursesKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: coursesKeys.lists() });

      // Snapshot previous value
      const previousCourse = queryClient.getQueryData<Course>(coursesKeys.detail(id));

      // Optimistically update details cache
      if (previousCourse) {
        queryClient.setQueryData<Course>(coursesKeys.detail(id), {
          ...previousCourse,
          ...newCourseData,
        });
      }

      // Context for rollback
      return { previousCourse };
    },
    onError: (_err, _newVal, context) => {
      if (context?.previousCourse) {
        queryClient.setQueryData(coursesKeys.detail(id), context.previousCourse);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: coursesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: coursesKeys.lists() });
    },
  });
}
```

---

## Best Practices
- **Do Not Mirror Mutation States**: Do not copy `isPending` or `error` state flags into local component `useState` variables. Reference them directly in the UI layout (e.g. `disabled={login.isPending}`).
- **Asynchronous Guards**: Ensure query checks inside TanStack Router `beforeLoad` hooks are asynchronous by utilizing `await queryClient.ensureQueryData(...)` to fetch credentials prior to route rendering.
