import { describe, it, expect, beforeEach } from "vitest";
import { exportAllData, countBackupKeys, readLastBackupAt, LAST_BACKUP_KEY, BACKUP_KEY_PREFIX } from "@/lib/dataBackup";

// A minimal in-memory localStorage plus just enough of `document` to
// capture the file exportAllData hands to the browser to download.
function installBrowserStubs() {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const downloads: { name: string; blob: Blob }[] = [];
  const blobs = new Map<string, Blob>();
  const g = globalThis as Record<string, unknown>;
  g.window = { localStorage };
  g.document = {
    createElement: () => {
      const a = { href: "", download: "", click: () => downloads.push({ name: a.download, blob: blobs.get(a.href)! }), remove: () => {} };
      return a;
    },
    body: { appendChild: () => {} },
  };
  URL.createObjectURL = (b: Blob) => {
    const url = `blob:test/${blobs.size}`;
    blobs.set(url, b as Blob);
    return url;
  };
  URL.revokeObjectURL = () => {};
  return { store, downloads };
}

describe("Download My Data (backup export)", () => {
  let env: ReturnType<typeof installBrowserStubs>;
  beforeEach(() => {
    env = installBrowserStubs();
  });

  it("the 'last downloaded' marker is outside the backup prefix, so it's never exported or restored", () => {
    expect(LAST_BACKUP_KEY.startsWith(BACKUP_KEY_PREFIX)).toBe(false);
  });

  it("exports every wc. key — grants, credit, contractors, cash flow — and nothing else", async () => {
    env.store.set("wc.grants", JSON.stringify({ grants: [{ id: "g1", grantName: "Arts Fund" }] }));
    env.store.set("wc.creditHealth", JSON.stringify({ personal: [{ score: 712 }], business: [] }));
    env.store.set("wc.contractors", JSON.stringify({ taxYear: 2026, contractors: [] }));
    env.store.set("wc.cashFlow", JSON.stringify({ startingCash: 5000 }));
    env.store.set("some-other-site-key", "not ours");
    env.store.set(LAST_BACKUP_KEY, "2020-01-01T00:00:00.000Z");

    expect(countBackupKeys()).toBe(4);
    exportAllData();

    expect(env.downloads).toHaveLength(1);
    expect(env.downloads[0].name).toMatch(/^wealth-copilot-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const file = JSON.parse(await env.downloads[0].blob.text());
    expect(file.source).toBe("Wealth Copilot");
    expect(Object.keys(file.data).sort()).toEqual(["wc.cashFlow", "wc.contractors", "wc.creditHealth", "wc.grants"]);
    expect(file.data["wc.grants"].grants[0].grantName).toBe("Arts Fund");
  });

  it("records when the backup was downloaded", () => {
    expect(readLastBackupAt()).toBe(null);
    exportAllData();
    const at = readLastBackupAt();
    expect(at).not.toBe(null);
    expect(Math.abs(Date.now() - new Date(at!).getTime())).toBeLessThan(5000);
  });
});
