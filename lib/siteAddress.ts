/**
 * The app's home is https://app.powertaxxltd.com. The original address,
 * wealth-copilot-44gu.vercel.app, deliberately still serves the app (no
 * redirect): saved data lives in each browser per web address, so a
 * redirect would strand people's data at the old address. Instead the old
 * address shows a banner (components/features/MovedBanner.tsx) asking
 * people to download their data there and restore it at the new address.
 */

export const NEW_SITE_URL = "https://app.powertaxxltd.com";
export const NEW_SITE_HOST = "app.powertaxxltd.com";

/** Hosts that should show the "we've moved" banner. */
const OLD_HOSTS = new Set(["wealth-copilot-44gu.vercel.app"]);

export function isOldAddress(hostname: string): boolean {
  return OLD_HOSTS.has(hostname.trim().toLowerCase());
}
