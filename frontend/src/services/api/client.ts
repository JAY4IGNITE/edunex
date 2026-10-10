const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
export class ApiError extends Error {
  constructor(public status: number, message?: string) {
    super(
      message ?? (status === 404
        ? "The requested record was not found."
        : "Unable to retrieve data. Please try again."),
    );
    this.name = "ApiError";
  }
}
export async function mutate<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const response = await fetch(`${base}/api${path}`, {
    method, credentials: "include", headers: { Accept: "application/json", "Content-Type": "application/json", "X-Requested-With": "EduNex" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiError(response.status, typeof error?.detail === "string" ? error.detail : undefined);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export async function get<T>(
  path: string,
  params?: URLSearchParams,
  signal?: AbortSignal,
): Promise<T> {
  const query = params?.toString();
  const response = await fetch(
    `${base}/api${path}${query ? `?${query}` : ""}`,
    { signal, credentials: "include", headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}
