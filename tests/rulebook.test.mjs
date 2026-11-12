import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../src/worker.mjs';

const request = (pathname) => new Request(`https://katarsis.example${pathname}`);
const env = {
  ASSETS: {
    fetch: async (assetRequest) => new Response(`ASSET:${new URL(assetRequest.url).pathname}`),
  },
};

function countMatches(text, expression) {
  return [...text.matchAll(expression)].length;
}

test('the complete rulebook is reachable from all canonical paths', async () => {
  for (const [pathname, asset] of [
    ['/rulebook', '/rulebook/index.html'],
    ['/rulebook/', '/rulebook/index.html'],
    ['/rulebook/index.html', '/rulebook/index.html'],
    ['/rulebook.css', '/rulebook.css'],
    ['/rulebook.js', '/rulebook.js'],
  ]) {
    const response = await worker.fetch(request(pathname), env);
    assert.equal(response.status, 200, pathname);
    assert.equal(await response.text(), `ASSET:${asset}`, pathname);
    assert.equal(response.headers.get('cache-control'), 'no-cache', pathname);
  }
});

test('the generated book contains the current rules, every ability and every shop entry', async () => {
  const html = await readFile(new URL('../web/rulebook/index.html', import.meta.url), 'utf8');
  assert.match(html, /data-rulebook-version="2026\.11\.12\.2"/);
  assert.equal(countMatches(html, /class="system-rule-chapter"/g), 25);
  assert.equal(countMatches(html, /class="book-ability-card"/g), 212);
  assert.equal(countMatches(html, /class="book-gear-item"/g), 439);
  assert.equal(countMatches(html, /class="vocation-guide"/g), 26);
  assert.match(html, /<b>31<\/b> навык/);
  assert.match(html, /Снаряжение/);
  assert.match(html, /Хроника мира/);
  assert.match(html, /Сохранить как PDF/);
  assert.ok(Buffer.byteLength(html) < 25 * 1024 * 1024);
});

test('book fragments do not expose the original interactive calculators', async () => {
  const html = await readFile(new URL('../web/rulebook/index.html', import.meta.url), 'utf8');
  const rulesStart = html.indexOf('<section class="book-rule-content" id="book-rules">');
  const combatStart = html.indexOf('<section class="book-part book-combat-part"');
  const rules = html.slice(rulesStart, combatStart);
  const loreStart = html.indexOf('<section class="book-world-content" id="book-world-content">');
  const loreEnd = html.indexOf('</section></section>\n    <footer class="book-footer"', loreStart);
  const lore = html.slice(loreStart, loreEnd);
  assert.ok(rulesStart >= 0 && combatStart > rulesStart);
  assert.ok(loreStart >= 0 && loreEnd > loreStart);
  assert.doesNotMatch(rules, /<(?:button|input|select|textarea|iframe|form)\b/i);
  assert.doesNotMatch(lore, /<(?:button|input|select|textarea|iframe|form)\b/i);
  assert.doesNotMatch(html, /id="view-rules"[^>]*hidden/);
});

test('the book navigation and its in-page links point to existing anchors', async () => {
  const html = await readFile(new URL('../web/rulebook/index.html', import.meta.url), 'utf8');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const missing = [...new Set([...html.matchAll(/\bhref="#([^"]+)"/g)]
    .map((match) => match[1])
    .filter((target) => !ids.has(target)))];
  assert.deepEqual(missing, []);
  assert.ok(ids.has('book-cover'));
  assert.ok(ids.has('book-rules'));
  assert.ok(ids.has('book-abilities'));
  assert.ok(ids.has('book-equipment'));
  assert.ok(ids.has('book-world'));
});
