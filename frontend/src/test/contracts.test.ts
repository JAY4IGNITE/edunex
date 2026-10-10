import { describe, it, expect, vi, afterEach } from "vitest";
import { readFilters, filterParams, trendRows } from "@/utils/data";
import { estimateCapacity, toCsv } from "@/utils/capacity";
import { get, ApiError } from "@/services/api/client";
import { api } from "@/services/api";
import { queryClient } from "@/lib/query";

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

describe("capacity planning assumptions", () => {
  it("uses the larger risk count to avoid double-counting unknown overlap", () => {
    expect(estimateCapacity(12, 8, 2, 3, 2)).toEqual({
      estimatedHighRiskCases: 12,
      availableCapacity: 12,
      uncoveredCases: 0,
      coveragePercent: 100,
    });
  });

  it("reports uncovered capacity and safely quotes exported CSV values", () => {
    expect(estimateCapacity(7, 10, 1, 2, 2).uncoveredCases).toBe(6);
    expect(toCsv([["note", 'review "soon"']])).toBe('"note","review ""soon"""');
    expect(toCsv([["=2+2"]])).toBe('"\'=2+2"');
  });
});
describe("API boundary", () => {
  it("uses the database health route as a readiness probe", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"status":"ok","database":"ready"}', { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.health()).resolves.toEqual({ status: "ok", database: "ready" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/health");
  });

  it("retries transient failures twice with a short backoff, never 4xx responses", () => {
    const retry = queryClient.getDefaultOptions().queries?.retry;
    expect(typeof retry).toBe("function");
    if (typeof retry === "function") {
      expect(retry(0, new Error("network"))).toBe(true);
      expect(retry(1, new Error("network"))).toBe(true);
      expect(retry(2, new Error("network"))).toBe(false);
      expect(retry(0, new ApiError(503))).toBe(true);
      expect(retry(0, new ApiError(401))).toBe(false);
    }
  });

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
