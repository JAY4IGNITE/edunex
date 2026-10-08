import { describe, it, expect, vi, afterEach } from "vitest";
import { readFilters, filterParams, trendRows } from "@/utils/data";
import { get, ApiError } from "@/services/api/client";

afterEach(() => vi.unstubAllGlobals());
describe("cohort URLs", () => {
  it("encodes department names and preserves valid year and semester", () => {
    const filters = readFilters(
      new URLSearchParams(
        "department=Arts+%26+Design&year=2&semester=4&page=3",
      ),
    );
    expect(filterParams(filters).toString()).toBe(
      "department=Arts+%26+Design&year=2&semester=4",
    );
  });
  it("rejects out of contract years and semesters", () => {
    expect(
      readFilters(new URLSearchParams("year=-1&semester=11&department=++")),
    ).toEqual({});
  });
});
describe("descriptive trends", () => {
  it("sorts periods numerically and never fills absent measurements with zero", () => {
    expect(
      trendRows({
        success_score_trends: { "Sem-10": 80, "Sem-2": 70 },
        attendance_trends: { "Sem-2": 90 },
        engagement_trends: {},
      }),
    ).toEqual([
      { period: "Sem-2", success: 70, attendance: 90, engagement: null },
      { period: "Sem-10", success: 80, attendance: null, engagement: null },
    ]);
  });
});
describe("API boundary", () => {
  it("sends cohort filters to the backend and propagates cancellation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"total_students":3}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    await get(
      "/analytics/overview",
      new URLSearchParams("department=CSE"),
      controller.signal,
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/analytics/overview?department=CSE",
    );
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });
  it("never exposes server stack traces in its error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("Traceback: secret", { status: 500 })),
    );
    await expect(get("/students")).rejects.toThrow(
      "Unable to retrieve data. Please try again.",
    );
  });
  it("distinguishes a missing student from a server failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 404 })),
    );
    await expect(get("/students/missing")).rejects.toEqual(
      expect.objectContaining<ApiError>({
        status: 404,
        name: "ApiError",
        message: "The requested record was not found.",
      }),
    );
  });
});
