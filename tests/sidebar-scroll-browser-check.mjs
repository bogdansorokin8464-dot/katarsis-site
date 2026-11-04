import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const metrics = () =>
  page.evaluate(() => {
    const bar = document.querySelector(".portal-sidebar");
    const foot = bar.querySelector(".portal-sidebar-foot");
    return {
      overflow: getComputedStyle(bar).overflowY,
      scrollTop: bar.scrollTop,
      scrollHeight: bar.scrollHeight,
      clientHeight: bar.clientHeight,
      footBottom: Math.round(foot.getBoundingClientRect().bottom),
      viewport: innerHeight,
      pageOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
for (const [width, height] of [
  [1280, 900],
  [1366, 768],
  [1440, 700],
  [1024, 600],
]) {
  await page.setViewportSize({ width, height });
  await page.goto("http://localhost:3000/play/#home");
  await page.waitForFunction(() => !!window.KATAR_PORTAL);
  const before = await metrics();
  assert.equal(
    before.overflow,
    "auto",
    `sidebar must scroll at ${width}x${height}`,
  );
  assert(
    before.scrollHeight > before.clientHeight,
    `sidebar is taller than the screen at ${width}`,
  );
  assert(
    before.footBottom > before.viewport,
    `footer starts below the screen at ${width}`,
  );
  assert.equal(before.pageOverflow, false, "no horizontal overflow");
  const box = await page.locator(".portal-sidebar").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 40);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(300);
  const after = await metrics();
  assert(after.scrollTop > 0, `wheel must scroll the sidebar at ${width}`);
  assert(
    after.footBottom <= after.viewport + 1,
    `footer must be reachable at ${width}`,
  );
  assert.equal(after.pageOverflow, false);
}
// The last menu entry stays clickable once scrolled into view.
await page.setViewportSize({ width: 1366, height: 768 });
await page.goto("http://localhost:3000/play/#home");
await page.waitForFunction(() => !!window.KATAR_PORTAL);
await page
  .locator(
    ".portal-sidebar nav a, .portal-sidebar nav button, .portal-sidebar [data-view]",
  )
  .last()
  .scrollIntoViewIfNeeded();
assert(
  await page.evaluate(() => {
    const bar = document.querySelector(".portal-sidebar");
    return bar.scrollTop > 0;
  }),
  "focus/scroll brings the last entry into view",
);
// Keyboard focus must not leave the entry hidden behind the fold.
await page.evaluate(() => {
  const bar = document.querySelector(".portal-sidebar");
  bar.scrollTop = 0;
});
await page.locator(".portal-sidebar [data-view]").last().focus();
await page.waitForTimeout(250);
assert(
  await page.evaluate(() => {
    const bar = document.querySelector(".portal-sidebar");
    const items = [...bar.querySelectorAll("[data-view]")];
    const item = items[items.length - 1];
    const box = item.getBoundingClientRect();
    return box.bottom <= innerHeight + 1;
  }),
);
// The phone drawer keeps its own behaviour.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:3000/play/#home");
await page.waitForFunction(() => !!window.KATAR_PORTAL);
await page.locator(".portal-mobile-menu").click();
await page.waitForTimeout(300);
const drawer = await page.evaluate(() => {
  const bar = document.querySelector(".portal-sidebar");
  const box = bar.getBoundingClientRect();
  return {
    open: bar.classList.contains("is-open"),
    x: Math.round(box.x),
    overflow: getComputedStyle(bar).overflowY,
    scrollHeight: bar.scrollHeight,
    clientHeight: bar.clientHeight,
    pageOverflow: document.documentElement.scrollWidth > innerWidth,
  };
});
assert.equal(drawer.open, true);
assert.equal(drawer.x, 0);
assert.equal(drawer.overflow, "auto");
assert.equal(drawer.pageOverflow, false);
assert(drawer.scrollHeight > drawer.clientHeight);
await page.locator("#portal-backdrop").click({position:{x:330,y:420}});
await page.waitForTimeout(300);
assert.equal(
  await page.evaluate(() =>
    document.querySelector(".portal-sidebar").classList.contains("is-open"),
  ),
  false,
);
// Print keeps hiding the whole sidebar.
await page.emulateMedia({ media: "print" });
assert.equal(await page.locator(".portal-sidebar").isVisible(), false);
await page.emulateMedia({ media: "screen" });
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS: desktop sidebar scrolls and reveals its footer at 1024–1440 px widths and 600–900 px heights, last entries reachable by wheel, scroll and keyboard, phone drawer and print untouched, no horizontal overflow.",
);
