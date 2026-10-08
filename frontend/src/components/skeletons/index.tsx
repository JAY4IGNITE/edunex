import { Skeleton } from "@/components/ui/skeleton";
export function KPISkeleton() {
  return (
    <div
      className="panel kpi"
      role="status"
      aria-busy="true"
      aria-label="Loading metric"
    >
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-10 w-24 my-4" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}
export function ChartSkeleton() {
  return (
    <div
      className="panel chart-skeleton"
      role="status"
      aria-busy="true"
      aria-label="Loading chart"
    >
      <Skeleton className="h-5 w-44" />
      <div className="skeleton-bars">
        {[40, 65, 50, 85, 70, 90, 65].map((h, i) => (
          <Skeleton key={i} style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}
export function TableSkeleton() {
  return (
    <div
      className="panel table-skeleton"
      role="status"
      aria-busy="true"
      aria-label="Loading students"
    >
      <Skeleton className="h-6 w-48 mb-8" />
      {Array.from({ length: 10 }, (_, i) => (
        <div className="skeleton-row" key={i}>
          {[1, 2, 3, 4].map((x) => (
            <Skeleton className="h-5 w-full" key={x} />
          ))}
        </div>
      ))}
    </div>
  );
}
export function InsightSkeleton() {
  return (
    <div
      className="panel insight-skeleton"
      role="status"
      aria-busy="true"
      aria-label="Loading insights"
    >
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-6 w-3/4 my-5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3 mt-3" />
    </div>
  );
}
export function SegmentSkeleton() {
  return (
    <div
      className="panel segment-skeleton"
      role="status"
      aria-busy="true"
      aria-label="Loading segment"
    >
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="h-6 w-4/5 my-5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-12 w-1/3 mt-5" />
    </div>
  );
}
export function ProfileSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading student profile">
      <Skeleton className="h-12 w-64 mb-6" />
      <div className="grid-two">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <TableSkeleton />
    </div>
  );
}
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-12 w-64 mb-8" />
      <div className="kpi-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <KPISkeleton key={i} />
        ))}
      </div>
      <div className="grid-two">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}
