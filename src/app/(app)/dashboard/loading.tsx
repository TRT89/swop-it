import { Skeleton, ListingGridSkeleton, RowsSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-10">
      <Skeleton className="h-10 w-64" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <RowsSkeleton count={2} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-44" />
        <ListingGridSkeleton />
      </div>
    </div>
  );
}
