import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const p = await context.newPage(),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("dialog", (d) => d.accept());
const state = () => p.evaluate(() => window.KATAR_HOOKS.stats.get());
const sheet = () =>
  p.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll(".stats .stat")].map((s) => [
        s.querySelector(".nm").textContent.trim(),
        s.querySelector(".mod .uline").textContent.trim(),
      ]),
    ),
  );
await p.goto("http://localhost:3000/play/#builder");
await p.waitForFunction(() => window.KATAR_CHARACTERS?.isReady());
await p.evaluate(() => {
  KATAR_PORTAL.showStep(2);
});
await p.locator(".react-method").first().waitFor({ state: "visible" });
// One React table only: the legacy visual table is gone, its engine nodes stay functional.
assert.equal(await p.locator(".dice-table").count(), 1);
assert.equal(await p.locator(".dice-target").count(), 8);
assert.equal(await p.locator("#stats-roll").isVisible(), false);
assert.equal(
  await p.locator("#stats-creator > .stats-methods").isVisible(),
  false,
);
assert.equal(await p.locator("#stats-roll-controls").isVisible(), false);
assert.equal(await p.locator("#stats-allocation").isVisible(), false);
assert.equal(
  await p.locator(".react-stats-progress").innerText(),
  "Выберите способ распределения.",
);
assert.equal(await p.locator(".dice-roll").isHidden(), true);
// Rolls, assignment and sheet writes keep going through the original engine.
await p.locator(".react-method").first().click();
await p.locator(".dice-roll").click();
await p.waitForFunction(
  () => !document.querySelector(".dice-table").classList.contains("is-rolling"),
);
let pending = (await state()).pending;
assert(pending);
assert.equal(await p.locator(".dice-target.is-available").count(), 8);
await p.locator('.dice-target[data-stat="Мудрость"]').click();
assert.equal((await state()).history.length, 1);
assert.equal(
  (await sheet())["Мудрость"],
  pending.value > 0 ? "+" + pending.value : String(pending.value),
);
assert.match(await p.locator(".react-stats-history").innerText(), /Мудрость: /);
assert.match(
  await p.locator(".react-stats-progress").innerText(),
  /Распределено 1 из 8/,
);
assert.equal(await p.locator(".dice-progress").innerText(), "1 / 8");
// Undo returns the exact die and clears the field again.
await p.getByRole("button", { name: "Отменить назначение" }).click();
assert.equal((await state()).history.length, 0);
assert.deepEqual((await state()).pending, pending);
assert.equal((await sheet())["Мудрость"], "");
assert.equal(
  await p.locator('.dice-target[data-stat="Мудрость"]').isDisabled(),
  false,
);
assert.equal(await p.locator(".dice-target.is-assigned").count(), 0);
// Arm-and-click path, then reset.
await p.locator(".dice-token").click();
assert.match(
  await p.locator(".dice-result").innerText(),
  /Теперь выбери свободную характеристику/,
);
await p.locator('.dice-target[data-stat="Магия"]').click();
assert.equal((await state()).history.length, 1);
// The select plus «Назначить» pair works as before, next to the tiles.
await p.locator(".dice-roll").click();
await p.waitForFunction(
  () => !document.querySelector(".dice-table").classList.contains("is-rolling"),
);
await p.selectOption(".stats-actions select", "Удача");
await p.getByRole("button", { name: "Назначить", exact: true }).click();
assert.equal((await state()).history.length, 2);
assert.equal((await sheet())["Удача"] !== "", true);
await p.getByRole("button", { name: "Начать заново" }).click();
assert.equal((await state()).history.length, 0);
assert.equal(
  await p.locator(".react-stats-progress").innerText(),
  "Распределено 0 из 8",
);
// Standard set: native +3 from the omen, the rest through React tiles.
await p.evaluate(() => {
  KATAR_PORTAL.showStep(1);
});
await p.locator("#omen-select").selectOption("Ловкость");
await p.evaluate(() => {
  KATAR_PORTAL.showStep(2);
});
await p.locator(".react-method").nth(1).click();
assert.equal(
  await p.locator(".react-method").nth(1).getAttribute("aria-checked"),
  "true",
);
assert.equal((await sheet())["Ловкость"], "+3");
assert.equal(
  await p.locator('.dice-target[data-stat="Ловкость"]').isDisabled(),
  true,
);
assert.equal(await p.locator(".dice-roll").isHidden(), true);
for (const name of [
  "Сила",
  "Харизма",
  "Интеллект",
  "Мудрость",
  "Удача",
  "Проклятие",
  "Магия",
])
  await p.locator(`.dice-target[data-stat="${name}"]`).click();
assert.equal(await p.locator(".dice-target.is-assigned").count(), 8);
assert.equal(await p.locator(".react-stats-history li").count(), 8);
const standard = await sheet();
assert.deepEqual(
  Object.keys(standard).map((k) => standard[k]),
  ["+2", "+3", "+2", "+1", "+1", "0", "-1", "-2"],
);
// Omen change resets only the standard distribution, as before.
await p.evaluate(() => {
  KATAR_PORTAL.showStep(1);
});
await p.locator("#omen-select").selectOption("Сила");
await p.evaluate(() => {
  KATAR_PORTAL.showStep(2);
});
assert.equal((await state()).history.length, 0);
assert.equal((await sheet())["Сила"], "+3");
assert.equal((await sheet())["Ловкость"], "");
// Save, reload and make sure the restored values reach the React tiles.
await p.evaluate(async () => {
  await KATAR_PORTAL.save(true);
  await KATAR_CHARACTERS.flush();
});
await p.reload();
await p.waitForFunction(() => window.KATAR_CHARACTERS?.isReady());
await p.evaluate(() => {
  KATAR_PORTAL.showView("builder");
  KATAR_PORTAL.showStep(2);
});
await p.locator(".react-method").first().waitFor({ state: "visible" });
assert.equal((await sheet())["Сила"], "+3");
assert.equal(
  await p.locator('.dice-target[data-stat="Сила"] strong').innerText(),
  "+3",
);
assert.equal(
  await p.locator('.dice-target[data-stat="Сила"]').isDisabled(),
  true,
);
// A second character starts with an empty table instead of the first one's values.
await p.evaluate(() => KATAR_PORTAL.showView("sheet"));
const first = await p.locator("#characters-select").inputValue();
await p.locator("#characters-create").click();
await p.waitForFunction(
  () =>
    document.querySelectorAll("#characters-select option").length === 2 &&
    !document.querySelector("#characters-select").disabled,
);
await p.evaluate(() => {
  KATAR_PORTAL.showView("builder");
  KATAR_PORTAL.showStep(2);
});
assert.equal(await p.locator(".dice-target.is-assigned").count(), 0);
assert.equal(
  await p.locator('.dice-target[data-stat="Сила"] strong').innerText(),
  "—",
);
await p.evaluate(() => KATAR_PORTAL.showView("sheet"));
await p.selectOption("#characters-select", first);
await p.waitForFunction(
  () => !document.querySelector("#characters-select").disabled,
);
await p.evaluate(() => {
  KATAR_PORTAL.showView("builder");
  KATAR_PORTAL.showStep(2);
});
assert.equal(await p.locator(".dice-target.is-assigned").count(), 1);
// Layouts and reduced motion.
for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
  await p.setViewportSize({ width, height: 1000 });
  assert(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "overflow " + width,
  );
  assert(await p.locator(".dice-table").isVisible());
}
await p.emulateMedia({ reducedMotion: "reduce" });
await p.setViewportSize({ width: 1280, height: 900 });
await p.locator(".react-method").first().click();
await p.locator(".dice-roll").click();
assert.equal(
  await p
    .locator(".dice-table")
    .evaluate((n) => n.classList.contains("is-rolling")),
  false,
);
assert((await state()).pending);
await p.emulateMedia({ media: "print" });
assert.equal(await p.locator(".dice-table").isVisible(), false);
await p.emulateMedia({ media: "screen", reducedMotion: "no-preference" });
assert.deepEqual(errors, []);
// Without the React bundle the original stats controls remain in charge.
const fallback = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await fallback.route("**/companion.js", (r) => r.abort());
const legacy = await fallback.newPage();
await legacy.goto("http://localhost:3000/play/#builder");
await legacy.waitForFunction(() => window.KATAR_CHARACTERS?.isReady());
await legacy.evaluate(() => KATAR_PORTAL.showStep(2));
assert.equal(await legacy.locator(".react-method").count(), 0);
assert.equal(await legacy.locator("#stats-creator").isVisible(), true);
await legacy.locator("[name=stats-method][value=roll]").check();
await legacy.locator("#stats-roll").click();
assert((await legacy.evaluate(() => window.KATAR_HOOKS.stats.get())).pending);
await fallback.close();
await browser.close();
console.log(
  "PASS: React stats step over the original engine — methods, dice, assignment, undo, reset, standard set with native +3, omen reset, save/reload, character switching, 320–1440 layouts, reduced motion, print, legacy fallback.",
);
