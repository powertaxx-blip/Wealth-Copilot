import { describe, it, expect } from "vitest";
import { isOldAddress, NEW_SITE_URL, NEW_SITE_HOST } from "@/lib/siteAddress";

describe("moved banner — which address shows it", () => {
  it("shows only on the old vercel.app address", () => {
    expect(isOldAddress("wealth-copilot-44gu.vercel.app")).toBe(true);
    expect(isOldAddress("Wealth-Copilot-44gu.vercel.app")).toBe(true);
  });

  it("never shows on the new address, previews, or local development", () => {
    expect(isOldAddress("app.powertaxxltd.com")).toBe(false);
    expect(isOldAddress("wealth-copilot-44gu-git-main-shadhuu.vercel.app")).toBe(false);
    expect(isOldAddress("localhost")).toBe(false);
  });

  it("points to the new address over HTTPS", () => {
    expect(NEW_SITE_URL).toBe(`https://${NEW_SITE_HOST}`);
  });
});
