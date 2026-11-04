import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({
  viewport: { width: 1024, height: 600 },
});
await context.addInitScript(() => {
  if (!localStorage.getItem("katarsis.companion.v1"))
    localStorage.setItem(
      "katarsis.companion.v1",
      JSON.stringify({
        version: 1,
        entries: [],
        gm: {
          scene: "",
          npcs: "",
          initiative: "",
          notes: "autobackup seed",
          tracker: [],
          turn: 0,
        },
      }),
    );
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:3000/play/#home");
await page.waitForFunction(() => window.KATAR_CHARACTERS?.isReady());
await page.waitForTimeout(900);
const auto = await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const r = indexedDB.open("katarsis.autobackup.v1", 3);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains("copies"))
        r.result.createObjectStore("copies", { keyPath: "id" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  const rows = await new Promise((resolve) => {
    const r = db.transaction("copies").objectStore("copies").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => resolve([]);
  });
  const found = rows
    .filter((x) => x.kind === "auto")
    .map((x) => ({
      id: x.id,
      format: x.payload.collection.format,
      version: x.payload.collection.version,
    }));
  return found.length ? found : null;
});
assert(
  auto.length >= 1,
  "a non-empty local profile gets an automatic copy on launch",
);
assert.equal(auto[0].format, "katarsis-collection");
assert.equal(auto[0].version, 1);
await page.waitForFunction(() =>
  /^Сохранено в \d{1,2}:\d{2}$/.test(
    document.querySelector("#portal-save-state")?.textContent?.trim() || "",
  ),
);
const before = await page.evaluate(() =>
  localStorage.getItem("katarsis.save.time"),
);
await page.evaluate(() => window.KATAR_PORTAL.showView("builder"));
await page.locator("#react-portal-name").fill("Autosave keyboard check");
await page.keyboard.press("Control+s");
await page.waitForFunction(
  (old) =>
    /^Сохранено в \d{1,2}:\d{2}$/.test(
      document.querySelector("#portal-save-state")?.textContent?.trim() || "",
    ) && localStorage.getItem("katarsis.save.time") !== old,
  before,
);
assert.equal(
  await page.locator("#portal-save-state").getAttribute("aria-live"),
  "polite",
);
await page.getByRole("button", { name: "↓ Резервная копия" }).click();
await page.waitForTimeout(500);
const sidebar = await page.evaluate(() => {
  const bar = document.querySelector(".portal-sidebar"),
    item = bar.querySelector('.kx-launch[aria-current="page"]'),
    a = item.getBoundingClientRect(),
    b = bar.getBoundingClientRect();
  return {
    label: item.textContent,
    selected: item.dataset.kxTab,
    visible: a.top >= b.top - 1 && a.bottom <= b.bottom + 1,
    scrollHeight: bar.scrollHeight,
    clientHeight: bar.clientHeight,
  };
});
assert.equal(sidebar.selected, "backup");
assert(sidebar.visible, "selected backup launcher is in view");
await page
  .getByRole("button", { name: "Резервная копия", exact: true })
  .click();
assert(
  (await page.locator("#kx-export-reminder").textContent()).includes("копию"),
);
assert(
  (await page.locator(".kx-copy").count()) >= 1,
  "automatic copies appear in backup panel",
);
await page.getByRole("button", { name: "Режим Мастера", exact: true }).click();
const gm = await page.evaluate(
  () =>
    document.querySelector('.kx-launch[aria-current="page"]')?.dataset.kxTab,
);
assert.equal(gm, "gm");
await page.getByLabel("Секреты и планы").fill("rotation seed");
for (let i = 0; i < 4; i++) {
  await page.evaluate((index) => {
    const state = JSON.parse(localStorage.getItem("katarsis.companion.v1"));
    state.gm.notes = `rotation check ${index}`;
    localStorage.setItem("katarsis.companion.v1", JSON.stringify(state));
    localStorage.removeItem("katarsis.autobackup.lastLoad");
  }, i);
  await page.reload();
  await page.waitForFunction(() => window.KATAR_CHARACTERS?.isReady());
  await page.waitForFunction(async (index) => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("katarsis.autobackup.v1", 3);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains("copies"))
          r.result.createObjectStore("copies", { keyPath: "id" });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return await new Promise((resolve) => {
      const r = db.transaction("copies").objectStore("copies").getAll();
      r.onsuccess = () =>
        resolve(
          r.result.some(
            (x) => x.payload.companion.gm.notes === `rotation check ${index}`,
          ),
        );
      r.onerror = () => resolve(false);
    });
  }, i);
}
const rotated = await page.evaluate(async () => {
  const db = await new Promise((resolve) => {
    const r = indexedDB.open("katarsis.autobackup.v1", 3);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains("copies"))
        r.result.createObjectStore("copies", { keyPath: "id" });
    };
    r.onsuccess = () => resolve(r.result);
  });
  return await new Promise((resolve) => {
    const r = db.transaction("copies").objectStore("copies").getAll();
    r.onsuccess = () => resolve(r.result);
  });
});
assert.equal(
  rotated.length,
  3,
  "only the three newest automatic copies remain",
);
assert.deepEqual(errors, []);
console.log(
  "PASS: automatic backup and three-copy rotation, reminder/list, Ctrl+S saved time and live announcement, selected sidebar items",
);
await browser.close();
