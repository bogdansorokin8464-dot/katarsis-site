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
  assert.equal([...html.matchAll(/class="quest-field front-title-field"/g)].length, 3);
  assert.equal([...html.matchAll(/class="quest-field front-hero-field"/g)].length, 3);
  assert.equal([...html.matchAll(/class="back-field back-field--beneficiary"/g)].length, 3);
  assert.equal([...html.matchAll(/class="quest-field beneficiary-field"/g)].length, 0);
  assert.equal([...html.matchAll(/<div class="card-kind"><span>ОСОБЫЙ КВЕСТ/gu)].length, 0);
  assert.equal([...html.matchAll(/<div class="card-kind"><span>КАРТОЧКА КВЕСТА/gu)].length, 3);
  assert.match(css, /background-image:url\("\/assets\/e0698678a36c087fde7a4705\.png"\)/);
  assert.match(css, /background-size:contain/);
  assert.match(html, /preserveAspectRatio="none"/);
  assert.match(html, /печать фоновой графики/);
  assert.match(html, /Лицевая сторона/);
  assert.match(html, /Оборотная сторона/);
  for (const card of ['01', '02', '03']) {
    assert.ok(html.includes(`${card} <i>/</i> 03`), `missing front/back pair index ${card}`);
  }
  assert.match(html, /НАЗВАНИЕ КАТАРСИСА ДУШИ/);
  assert.match(html, /ИМЯ ГЕРОЯ/);
  assert.match(html, /Кому полезен катарсис/);
  assert.match(html, /Условие катарсиса/);
  assert.match(html, /Награда/);
  assert.match(css, /@page\{size:A4 portrait;margin:0\}/);
  assert.match(css, /grid-template-rows:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /front-ornament \.ornament-corner/);
  assert.match(css, /quest-card--front\{border-color:#c3a15f/);
  assert.match(css, /break-after:page/);
});

test('the face shows the complete artwork between solid title and hero fields', async () => {
  const [html, css] = await Promise.all([
    read('web/soul-catharsis/index.html'),
    read('web/soul-catharsis.css'),
  ]);
  assert.match(css, /quest-card--front\{[^}]*background-size:contain/);
  assert.match(css, /quest-card--front \.front-main\{display:block[^}]*background:transparent/);
  assert.match(css, /quest-card--front \.front-title-field\{[^}]*background:#fffdf6/);
  assert.match(css, /quest-card--front \.front-hero-field\{grid-column:2;[^}]*background:#fffdf6/);
  assert.match(css, /quest-card--front \.card-index\{grid-column:3/);
  assert.match(css, /quest-card--front \.writing-field\{[^}]*background-color:#fffdf6/);
  assert.doesNotMatch(css, /front-main::before/);
  const fronts = [...html.matchAll(/<article class="quest-card quest-card--front"[\s\S]*?<\/article>/g)];
  assert.equal(fronts.length, 3);
  for (const [index, match] of fronts.entries()) {
    const card = match[0];
    const headerEnd = card.indexOf('</header>');
    const systemName = card.indexOf('brand-name');
    const title = card.indexOf('front-title-field');
    const main = card.indexOf('class="card-main front-main"');
    const hero = card.indexOf('front-hero-field');
    const footerEnd = card.indexOf('</footer>');
    assert.ok(systemName < title && title < headerEnd && headerEnd < main && main < hero && hero < footerEnd, `front card ${index + 1} field positions`);
    assert.doesNotMatch(card, /ОСОБЫЙ КВЕСТ|ПУТЬ К ВОЗВЫШЕНИЮ/);
  }
  assert.match(css, /back-main\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
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
