import { describe, expect, it } from "vitest";
import { cardNeedsShrink, shrunkCardName, shrunkSize } from "@/lib/card-shrink";
import { joinErrorField } from "@/lib/join-form";

describe("business card photos from phones (Nov 7, Stephanie)", () => {
  it("shrinks large photos only", () => {
    expect(cardNeedsShrink({ type: "image/jpeg", size: 6_000_000 })).toBe(true);
    expect(cardNeedsShrink({ type: "image/jpeg", size: 300_000 })).toBe(false);
    expect(cardNeedsShrink({ type: "application/pdf", size: 9_000_000 })).toBe(false);
  });
  it("keeps the shape and caps the long edge", () => {
    expect(shrunkSize(3024, 4032)).toEqual({ width: 1500, height: 2000 });
    expect(shrunkSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(shrunkCardName("IMG_1234.HEIC")).toBe("IMG_1234.jpg");
  });
  it("card errors point at the upload box", () => {
    expect(joinErrorField("Business card must be 5 MB or smaller.")).toBe("businessCard");
    expect(joinErrorField("Upload a JPG, PNG, or PDF business card.")).toBe("businessCard");
  });
});
