const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
export class ApiError extends Error {
  constructor(public status: number) {
    super(
      status === 404
        ? "The requested record was not found."
        : "Unable to retrieve data. Please try again.",
    );
    this.name = "ApiError";
  }
}
export async function get<T>(
  path: string,
  params?: URLSearchParams,
  signal?: AbortSignal,
): Promise<T> {
  const query = params?.toString();
  const response = await fetch(
    `${base}/api${path}${query ? `?${query}` : ""}`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}
