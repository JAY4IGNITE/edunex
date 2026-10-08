import { expect, it } from "vitest";
import { readableSourceText } from "@/utils/text";
it("repairs Windows-decoded dash punctuation while preserving provenance claims", () => {
  expect(
    readableSourceText(
      "DEMONSTRATION \u00e2\u20ac\u201d NOT REAL INSTITUTIONAL DATA",
    ),
  ).toBe("DEMONSTRATION — NOT REAL INSTITUTIONAL DATA");
  expect(readableSourceText("UNKNOWN — REQUIRES VERIFICATION")).toBe(
    "UNKNOWN — REQUIRES VERIFICATION",
  );
});
