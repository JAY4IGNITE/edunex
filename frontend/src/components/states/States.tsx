import { CircleAlert, SearchX, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="empty-state" role="status">
      <SearchX size={27} aria-hidden="true" />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="empty-state error-state" role="alert">
      <CircleAlert size={27} aria-hidden="true" />
      <h3>{message}</h3>
      <p>Please check your connection and try again.</p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          <RotateCcw size={15} /> Try again
        </Button>
      )}
    </div>
  );
}
export function QueryState<T>({
  query,
  skeleton,
  message,
  children,
}: {
  query: UseQueryResult<T, Error>;
  skeleton: ReactNode;
  message: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return skeleton;
  if (query.isError)
    return (
      <ErrorState
        message={message}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  return <>{children(query.data)}</>;
}
