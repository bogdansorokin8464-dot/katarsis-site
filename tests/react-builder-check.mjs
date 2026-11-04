import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const p = await context.newPage(),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("dialog", (d) => d.accept());
await p.goto("http://localhost:3000/play/#builder");
await p.waitForFunction(() => window.KATAR_CHARACTERS?.isReady());
await p.locator("#react-portal-name").waitFor({ state: "visible" });
assert.equal(
  await p.locator(".react-wizard-nav .react-wizard-step").count(),
  6,
);
assert.equal(await p.locator("#portal-name").isVisible(), false);
await p.locator("#react-portal-name").fill("Ариадна");
await p.locator("#react-portal-age").fill("27");
await p.locator("#react-portal-origin").fill("Ольмгард");
await p
  .locator("#react-portal-background")
  .fill("Врач из города\nДолгая дорога");
assert.equal(await p.locator("#portal-name").inputValue(), "Ариадна");
assert.equal(
  await p.locator(".ident-l .line").first().textContent(),
  "Ариадна",
);
assert.equal(await p.locator("#portal-origin").inputValue(), "Ольмгард");
await p.evaluate(async () => {
  await KATAR_PORTAL.save(true);
  await KATAR_CHARACTERS.flush();
});
await p.getByRole("button", { name: "Выбрать языки", exact: true }).click();
assert(await p.locator("#languages-dialog").isVisible());
await p.locator("#languages-list").getByLabel("Общий", { exact: true }).check();
await p.locator("#languages-done").click();
assert.match(
  await p.locator(".react-builder-identity .languages-selection").innerText(),
  /Общий/,
);
await p
  .locator(".react-wizard-bottom")
  .getByRole("button", { name: "Далее →" })
  .click();
assert(await p.locator("#portal-step-1").isVisible());
assert.equal(
  await p.locator('.react-wizard-nav button[aria-current="step"]').count(),
  1,
);
await p.selectOption("#omen-select", "Мудрость");
assert.equal(await p.locator("#omen-select").inputValue(), "Мудрость");
await p.locator(".react-wizard-nav .react-wizard-step").nth(2).click();
assert(await p.locator("#portal-step-2").isVisible());
await p.locator(".react-wizard-nav .react-wizard-step").nth(5).click();
assert(await p.locator("#portal-step-5").isVisible());
await p
  .locator(".react-wizard-bottom")
  .getByRole("button", { name: "Выбрать снаряжение →" })
  .click();
assert(await p.locator("#view-shop").isVisible());
await p.evaluate(() => KATAR_PORTAL.showView("builder"));
await p.locator(".react-wizard-nav .react-wizard-step").first().click();
await p.evaluate(async () => {
  await KATAR_PORTAL.save(true);
  await KATAR_CHARACTERS.flush();
});
await p.reload();
await p.waitForFunction(() => window.KATAR_CHARACTERS?.isReady());
await p.evaluate(() => {
  KATAR_PORTAL.showView("builder");
  KATAR_PORTAL.showStep(0);
});
assert.equal(await p.locator("#react-portal-name").inputValue(), "Ариадна");
assert.equal(await p.locator("#react-portal-origin").inputValue(), "Ольмгард");
assert.match(
  await p.locator(".react-builder-identity .languages-selection").innerText(),
  /Общий/,
);
assert.equal(await p.locator("#omen-select").inputValue(), "Мудрость");
// Switch between independent characters and verify the React form follows legacy restore.
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
  KATAR_PORTAL.showStep(0);
});
assert.equal(await p.locator("#react-portal-name").inputValue(), "");
await p.locator("#react-portal-name").fill("Второй");
await p.evaluate(async () => {
  await KATAR_PORTAL.save(true);
  await KATAR_CHARACTERS.flush();
  KATAR_PORTAL.showView("sheet");
});
await p.selectOption("#characters-select", first);
await p.waitForFunction(
  () => !document.querySelector("#characters-select").disabled,
);
await p.evaluate(() => {
  KATAR_PORTAL.showView("builder");
  KATAR_PORTAL.showStep(0);
});
assert.equal(await p.locator("#react-portal-name").inputValue(), "Ариадна");
for (const width of [390, 768, 1440]) {
  await p.setViewportSize({ width, height: 1000 });
  await p.waitForTimeout(100);
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    `overflow ${width}`,
  );
  assert(await p.locator("#react-portal-name").isVisible());
}
assert.deepEqual(errors, []);
console.log(
  "PASS: React identity, legacy sheet, languages, steps, omen, shop, reload, independent character switching and mobile",
);
// With the React bundle unavailable, the original constructor must still work.
const fallback = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
await fallback.route("**/companion.js", (route) => route.abort());
const legacy = await fallback.newPage();
await legacy.goto("http://localhost:3000/play/#builder");
await legacy.waitForFunction(() => window.KATAR_CHARACTERS?.isReady());
assert(await legacy.locator("#portal-name").isVisible());
await legacy.locator("#portal-name").fill("До переноса");
assert.equal(
  await legacy.locator(".ident-l .line").first().textContent(),
  "До переноса",
);
await fallback.close();
await browser.close();
