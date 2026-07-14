import { Skeleton } from "@oedulms/ui/components/skeleton";

export function ProfilePageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-8 pb-12">
      {/* Header Skeleton */}
      <div className="border-b border-border pb-5 flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 mt-1" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left preview card skeleton */}
        <div className="md:col-span-1">
          <ProfilePreviewSkeleton />
        </div>

        {/* Right form card skeleton */}
        <div className="md:col-span-2">
          <ProfileFormSkeleton />
        </div>
      </div>
    </div>
  );
}

export function ProfilePreviewSkeleton() {
  return (
    <div className="border border-border/40 p-6 rounded-(--radius-xl) flex flex-col items-center gap-4">
      <Skeleton className="size-24 rounded-full" />
      <Skeleton className="h-5 w-32 mt-2" />
      <Skeleton className="h-4 w-20 rounded-full" />
      <div className="w-full border-t border-border/20 mt-4 pt-4 flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function ProfileFormSkeleton() {
  return (
    <div className="border border-border/40 p-6 rounded-(--radius-xl) flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
