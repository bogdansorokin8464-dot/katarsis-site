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
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('GM screen links resolve to the two print formats and shared assets', async () => {
  for (const [pathname, asset] of [
    ['/gm/screen', '/gm-screen/index.html'],
    ['/gm/screen/', '/gm-screen/index.html'],
    ['/gm/screen/a5', '/gm-screen/a5.html'],
    ['/gm/screen/a5/', '/gm-screen/a5.html'],
    ['/gm/screen/a4', '/gm-screen/a4.html'],
    ['/gm/screen/a4/', '/gm-screen/a4.html'],
    ['/gm/screen/a5.pdf', '/gm-screen/a5.pdf'],
    ['/gm/screen/a4.pdf', '/gm-screen/a4.pdf'],
    ['/gm/screen/all.pdf', '/gm-screen/all.pdf'],
    ['/gm-screen.css', '/gm-screen.css'],
    ['/gm-screen.js', '/gm-screen.js'],
  ]) {
    const response = await worker.fetch(request(pathname), env);
    assert.equal(response.status, 200, pathname);
    assert.equal(await response.text(), `ASSET:${asset}`, pathname);
    assert.equal(response.headers.get('cache-control'), 'no-cache', pathname);
  }
});

test('the A5 screen is exactly four portrait sheets with print controls', async () => {
  const html = await read('web/gm-screen/a5.html');
  assert.equal([...html.matchAll(/class="gm-page gm-page--a5"/g)].length, 4);
  assert.match(html, /@page\{size:A5 portrait;margin:0\}/);
  assert.match(html, /Печать 4 листов A5/);
  for (const label of ['ПРОВЕРКИ', 'БОЙ', 'ПОЛЕ БОЯ', 'ЗА РАМКАМИ ХОДА']) {
    assert.ok(html.includes(label), `missing sheet: ${label}`);
  }
  assert.match(html, /Провал операции добавляет один длинный отдых/);
  assert.match(html, /Снятие черепов и момент проверки вне своего хода не уточнены/);
});

test('the landscape companion is a single A4 landscape sheet', async () => {
  const html = await read('web/gm-screen/a4.html');
  assert.equal([...html.matchAll(/class="gm-page gm-page--a4"/g)].length, 1);
  assert.match(html, /@page\{size:A4 landscape;margin:0\}/);
  assert.match(html, /Печать A4 альбомной/);
  assert.match(html, /к20 \+ Реакция/);
  assert.match(html, /\+2 и выше/);
  assert.match(html, /длительность отдыха/);
});

test('the downloadable print copies are valid PDFs in both sizes', async () => {
  const [a5, a4, all, hub] = await Promise.all([
    readFile(new URL('../web/gm-screen/a5.pdf', import.meta.url)),
    readFile(new URL('../web/gm-screen/a4.pdf', import.meta.url)),
    readFile(new URL('../web/gm-screen/all.pdf', import.meta.url)),
    read('web/gm-screen/index.html'),
  ]);
  assert.equal(a5.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.equal(a4.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.equal(all.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.ok(a5.length > 100_000);
  assert.ok(a4.length > 100_000);
  assert.ok(all.length > a4.length);
  assert.ok(hub.includes('href="/gm/screen/a5.pdf"'));
  assert.ok(hub.includes('href="/gm/screen/a4.pdf"'));
  assert.ok(hub.includes('href="/gm/screen/all.pdf"'));
});

test('the GM landing page offers both formats and the GM home links to it', async () => {
  const [hub, gmHome] = await Promise.all([
    read('web/gm-screen/index.html'),
    read('web/gm.html'),
  ]);
  assert.match(hub, /href="\/gm\/screen\/a5\/"/);
  assert.match(hub, /href="\/gm\/screen\/a4\/"/);
  assert.ok(hub.includes('href="/gm/screen/a5.pdf"'));
  assert.ok(hub.includes('href="/gm/screen/a4.pdf"'));
  assert.match(hub, /четыре листа A5/i);
  assert.match(gmHome, /href="\/gm\/screen\/"/);
  assert.match(gmHome, /Памятка для ширмы/);
});
