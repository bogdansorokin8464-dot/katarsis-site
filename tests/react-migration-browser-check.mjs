import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const old = {
  version: 1,
  entries: [
    {
      id: "legacy-note",
      title: "Старая запись",
      date: "2026-01-01",
      character: "Лекарь",
      location: "Ольмгард",
      events: "Сохранённый текст",
      quests: "Задание",
      questions: "Вопрос",
    },
  ],
  gm: {
    scene: "Старая сцена",
    npcs: "Писец",
    initiative: "Лекарь первый",
    notes: "Секрет",
  },
};
const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await c.addInitScript(
  (state) =>
    localStorage.setItem("katarsis.companion.v1", JSON.stringify(state)),
  old,
);
const p = await c.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto("http://localhost:3000/play/#home");
await p.waitForFunction(() => window.KATAR_CHARACTERS?.isReady());
await p.getByRole("button", { name: "✎ Журнал партии" }).click();
await p.getByRole("button", { name: "2026-01-01 · Старая запись" }).click();
assert.equal(
  await p.getByLabel("События", { exact: true }).inputValue(),
  "Сохранённый текст",
);
await p.getByRole("button", { name: "Режим Мастера", exact: true }).click();
assert.equal(
  await p.getByLabel("Текущая сцена", { exact: true }).inputValue(),
  "Старая сцена",
);
await p.getByRole("button", { name: "+ Участник" }).click();
assert.equal(await p.getByLabel("Имя участника").count(), 1);
const migrated = await p.evaluate(() =>
  JSON.parse(localStorage.getItem("katarsis.companion.v1")),
);
assert.equal(migrated.entries[0].events, "Сохранённый текст");
assert.equal(migrated.gm.scene, "Старая сцена");
assert.equal(migrated.gm.tracker.length, 1);
assert.deepEqual(errors, []);
await c.close();
const bad = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
await bad.addInitScript(() =>
  localStorage.setItem("katarsis.companion.v1", "не json"),
);
const q = await bad.newPage();
await q.goto("http://localhost:3000/play/#home");
await q.waitForFunction(() => window.KATAR_CHARACTERS?.isReady());
await q.getByRole("button", { name: "✎ Журнал партии" }).click();
assert.match(
  await q.locator("#kx-status").innerText(),
  /не удалось прочитать/i,
);
await q.getByRole("button", { name: "+ Новая запись" }).click();
assert.equal(
  await q.evaluate(() => localStorage.getItem("katarsis.companion.v1")),
  "не json",
);
await browser.close();
console.log(
  "PASS: v1 notes migrate without deletion; corrupt local data remains untouched",
);
