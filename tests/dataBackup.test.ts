import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  exportAllData,
  restoreFromText,
  countBackupKeys,
  readLastBackupAt,
  describeSavedData,
  clearAllData,
  LAST_BACKUP_KEY,
  BACKUP_KEY_PREFIX,
} from "@/lib/dataBackup";

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

  it("round-trips: a downloaded file restores every key exactly, including plain-text settings", async () => {
    // One value of every storage style the app uses.
    const original: Record<string, string> = {
      "wc.grants": JSON.stringify({ grants: [{ id: "g1", grantName: "Arts Fund", amountRequested: 25000 }] }),
      "wc.creditHealth": JSON.stringify({ personal: [{ id: "p", date: "2026-09-01", score: 712, bureau: "experian", createdAt: 1 }], business: [] }),
      "wc.ownerName": JSON.stringify("Maria's Bakery"), // a JSON string (useLocalStorageState<string>)
      "wc.schedulec.netProfit": JSON.stringify(61600), // a bare JSON number
      "wc.welcomeVideoSeen": JSON.stringify(true), // a JSON boolean
      "wc.orgType": "nonprofit", // plain text, written directly
      "wc.theme": "dark", // plain text, written directly
    };
    for (const [k, v] of Object.entries(original)) env.store.set(k, v);

    exportAllData();
    const fileText = await env.downloads[0].blob.text();

    env.store.clear(); // a fresh browser
    const result = restoreFromText(fileText);
    expect(result).toEqual({ restoredKeys: 7 });
    for (const [k, v] of Object.entries(original)) expect(env.store.get(k), k).toBe(v);
  });

  it("restores plain-text settings from older backup files that predate plainTextKeys", () => {
    const oldSettingsExport = JSON.stringify({ "wc.orgType": "nonprofit", "wc.theme": "dark", "wc.ownerName": "Maria" });
    expect(restoreFromText(oldSettingsExport).restoredKeys).toBe(3);
    expect(env.store.get("wc.orgType")).toBe("nonprofit");
    expect(env.store.get("wc.theme")).toBe("dark");
    expect(env.store.get("wc.ownerName")).toBe(JSON.stringify("Maria"));
  });

  it("rejects files that aren't Wealth Copilot backups, and ignores keys that aren't ours", () => {
    expect(restoreFromText("not json").error).toMatch(/doesn't look like/);
    expect(restoreFromText("[1,2,3]").error).toMatch(/doesn't look like/);
    expect(restoreFromText(JSON.stringify({ data: { "other.key": 1 } })).error).toMatch(/recognizable/);
    expect(env.store.has("other.key")).toBe(false);
  });

  it("records when the backup was downloaded", () => {
    expect(readLastBackupAt()).toBe(null);
    exportAllData();
    const at = readLastBackupAt();
    expect(at).not.toBe(null);
    expect(Math.abs(Date.now() - new Date(at!).getTime())).toBeLessThan(5000);
  });
});

describe("Settings → Your Data list", () => {
  it("shows friendly names, groups related keys, and hides internal ones", () => {
    const keys = ["wc.budgeting", "wc.debts", "wc.debts.extra", "wc.debts.strategy", "wc.creditHealth", "wc.form990", "wc.grants", "wc.theme", "wc.welcomeVideoSeen", "wc.orgType", "wc.powerThoughtDeck"];
    expect(describeSavedData(keys, false)).toEqual(["Budgeting", "Credit Health", "Debt Payoff Planner", "Form 990", "Grants"]);
  });

  it("uses Nonprofit Mode names where the app does", () => {
    expect(describeSavedData(["wc.emergency", "wc.invoices"], true)).toEqual(["Donation Receipts", "Operating Reserve"]);
  });

  it("shows an unknown future key as 'Other saved data', never as a raw key", () => {
    expect(describeSavedData(["wc.somethingNew", "wc.grants"], false)).toEqual(["Grants", "Other saved data"]);
  });

  it("has a friendly name (or is marked internal) for every storage key the app's code uses", () => {
    const found = new Set<string>();
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          for (const m of fs.readFileSync(p, "utf8").matchAll(/["'](wc\.[A-Za-z0-9.]+)["']/g)) found.add(m[1]);
        }
      }
    };
    for (const d of ["app", "components", "lib"]) walk(path.resolve(__dirname, "..", d));
    found.delete("wc."); // the prefix constant itself
    found.delete("wc.xxx"); // an example in a code comment, not a real key
    expect(found.size).toBeGreaterThan(25);
    const unnamed = [...found].filter((k) => describeSavedData([k], false).includes("Other saved data"));
    expect(unnamed, `give these a name in SAVED_DATA_LABELS: ${unnamed.join(", ")}`).toEqual([]);
  });
});

describe("Clear my saved data", () => {
  it("removes every wc. key but leaves other sites' keys and the last-backup marker", () => {
    const store = new Map<string, string>([
      ["wc.grants", "{}"],
      ["wc.orgType", "nonprofit"],
      ["someone-else", "x"],
      [LAST_BACKUP_KEY, "2026-09-26T00:00:00.000Z"],
    ]);
    (globalThis as Record<string, unknown>).window = {
      localStorage: {
        get length() {
          return store.size;
        },
        key: (i: number) => [...store.keys()][i] ?? null,
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    };
    clearAllData();
    expect([...store.keys()].sort()).toEqual([LAST_BACKUP_KEY, "someone-else"].sort());
  });
});
