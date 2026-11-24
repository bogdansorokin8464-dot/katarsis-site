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

test('the soul catharsis template and its assets are available through public GM routes', async () => {
  for (const [pathname, asset] of [
    ['/gm/soul-catharsis', '/soul-catharsis/index.html'],
    ['/gm/soul-catharsis/', '/soul-catharsis/index.html'],
    ['/soul-catharsis.css', '/soul-catharsis.css'],
    ['/soul-catharsis.js', '/soul-catharsis.js'],
  ]) {
    const response = await worker.fetch(request(pathname), env);
    assert.equal(response.status, 200, pathname);
    assert.equal(await response.text(), `ASSET:${asset}`, pathname);
    assert.equal(response.headers.get('cache-control'), 'no-cache', pathname);
  }
});

test('the printable document has three matched cards on each A4 side', async () => {
  const html = await read('web/soul-catharsis/index.html');
  const css = await read('web/soul-catharsis.css');
  const art = await readFile(new URL('../web/assets/e0698678a36c087fde7a4705.png', import.meta.url));
  assert.equal(art.subarray(1, 4).toString('ascii'), 'PNG');
  assert.match(html, /<html lang="ru">/);
  assert.equal([...html.matchAll(/class="quest-card quest-card--front"/g)].length, 3);
  assert.equal([...html.matchAll(/class="quest-card quest-card--back"/g)].length, 3);
  assert.equal([...html.matchAll(/class="front-ornament"/g)].length, 3);
  assert.equal([...html.matchAll(/class="card-art-background"/g)].length, 0);
  assert.match(css, /background-image:url\("\/assets\/e0698678a36c087fde7a4705\.png"\)/);
  assert.match(css, /background-size:cover/);
  assert.match(css, /quest-card--front \.quest-title-field\{[^}]*padding:/);
  assert.match(css, /quest-card--front \.hero-field\{[^}]*padding:/);
  assert.match(html, /preserveAspectRatio="none"/);
  assert.match(html, /печать фоновой графики/);
  assert.match(html, /Лицевая сторона/);
  assert.match(html, /Оборотная сторона/);
  for (const card of ['01', '02', '03']) {
    assert.ok(html.includes(`${card} <i>/</i> 03`), `missing front/back pair index ${card}`);
  }
  assert.match(html, /НАЗВАНИЕ КАТАРСИСА ДУШИ/);
  assert.match(html, /ИМЯ ГЕРОЯ/);
  assert.match(html, /КОМУ ЭТОТ КАТАРСИС БУДЕТ ПОЛЕЗЕН/);
  assert.match(html, /Условие катарсиса/);
  assert.match(html, /Награда/);
  assert.match(css, /@page\{size:A4 portrait;margin:0\}/);
  assert.match(css, /grid-template-rows:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /front-ornament \.ornament-corner/);
  assert.match(css, /quest-card--front\{border-color:#c3a15f/);
  assert.match(css, /break-after:page/);
});

test('the front artwork shows through the outlined, legible writing fields', async () => {
  const css = await read('web/soul-catharsis.css');
  assert.match(css, /quest-card--front \.front-main\{[^}]*background:transparent/);
  assert.match(css, /quest-card--front \.quest-title-field\{[^}]*background:transparent/);
  assert.match(css, /quest-card--front \.beneficiary-field\{[^}]*background:transparent/);
  assert.match(css, /quest-card--front \.front-main::before\{[^}]*url\("\/assets\/e0698678a36c087fde7a4705\.png"\)/);
  assert.match(css, /quest-card--front \.front-main\{grid-template-columns:minmax\(0,1\.5fr\) minmax\(28mm,\.65fr\) minmax\(0,1fr\)/);
  assert.match(css, /quest-card--front \.beneficiary-field\{grid-column:3;grid-row:1 \/ 3/);
  assert.match(css, /quest-card--front \.field-label\{[^}]*background:rgba\(255,253,246,\.96\)/);
  assert.match(css, /quest-card--front \.writing-field\{[^}]*background-color:rgba\(255,253,246,\.86\)/);
});

test('the fields can be typed into before printing and cleared together', async () => {
  const [html, script] = await Promise.all([
    read('web/soul-catharsis/index.html'),
    read('web/soul-catharsis.js'),
  ]);
  assert.equal([...html.matchAll(/contenteditable="true"/g)].length, 15);
  assert.match(html, /data-print/);
  assert.match(html, /data-clear-fields/);
  assert.match(script, /window\.print\(\)/);
  assert.match(script, /window\.confirm\(/);
  assert.match(html, /не отправляется на сервер/);
});

test('the GM landing page links to the soul catharsis print template', async () => {
  const gmHome = await read('web/gm.html');
  assert.match(gmHome, /href="\/gm\/soul-catharsis\/"/);
  assert.match(gmHome, /Катарсисы души/);
  assert.match(gmHome, /три на каждом листе A4/);
});
