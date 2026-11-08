import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const play=read('web/play/index.html');
const core=read('web/build/materials/core.html');
const pregens=read('web/lipotaktis/pregens.html');
const master=read('web/lipotaktis/master.html');

const legacy=/\bКД\b|Класс[а-я]* Доспеха/;
const normalize=name=>name.toLowerCase().replace(/ё/g,'е').replace(/[−–]/g,'-').replace(/\([^()]*\)/g,'').replace(/\s+/g,' ').trim();

test('published pages no longer use the old armor class labels', () => {
  for (const [name,html] of [['play',play],['core',core],['pregens',pregens],['master',master]]) {
    assert.doesNotMatch(html,legacy,`${name} still contains an old armor-class label`);
  }
});

test('every shop armor item has a profile in the sheet', () => {
  const start=play.indexOf('const SHOP_CATALOG = ')+'const SHOP_CATALOG = '.length;
  const catalog=JSON.parse(play.slice(start).match(/^\[[\s\S]*?\](?=;)/)[0]);
  const keys=new Set([...play.matchAll(/'([^']+)':\{absorb:/g)].map(m=>m[1]));
  const armor=catalog.filter(item=>item.category==='Броня и щиты');
  assert.equal(armor.length,20);
  for (const item of armor) assert.ok(keys.has(normalize(item.name)),`no profile for ${item.name}`);
});

test('profile resolves names, legacy notes, and explicit overrides', () => {
  const start=play.indexOf('const clean=');
  const end=play.indexOf('function statMod',start);
  const sandbox={};
  vm.runInNewContext(play.slice(start,end)+'\n;({profile})',sandbox);
  const {profile}=sandbox;
  assert.deepEqual({...profile('Кожаная кираса')},{absorb:1,slots:3,evasion:1,speed:0,heavy:false});
  assert.deepEqual({...profile('Кольчуга (+2 КД)')},{absorb:2,slots:4,evasion:0,speed:0,heavy:false});
  assert.deepEqual({...profile('Кираса (+3 КД)')},{absorb:2,slots:4,evasion:-1,speed:0,heavy:false});
  assert.deepEqual({...profile('Бригантина: поглощение 3, 2 ячейки, Уклонение -1')},{absorb:3,slots:2,evasion:-1,speed:5,heavy:false});
  assert.deepEqual({...profile('')},{absorb:0,slots:0,evasion:0,speed:0,heavy:false});
});

test('the defense chapter and sheet document evasion, absorption, and slots', () => {
  assert.match(play,/Уклонение = 8 \+ Ловкость \+ доспех \+ щит \+ поправки/);
  assert.match(play,/Поглощение/);
  assert.match(play,/можно отметить только одну ячейку/);
  assert.match(play,/Короткий отдых не возвращает ячейки брони/);
  assert.match(play,/id="armor-pips"/);
  assert.match(play,/\.armor=\{/);
  assert.match(play,/data-armor-rest/);
});

test('printed evasion stays on the new scale', () => {
  for (const [name,html] of [['play',play],['core',core],['master',master]]) {
    const values=[...html.matchAll(/"ac":(\d+)/g)].map(m=>Number(m[1]));
    assert.ok(values.length>0,`${name} has no stat blocks`);
    for (const value of values) assert.ok(value>=6&&value<=12,`${name} has evasion ${value}`);
  }
  const tiles=[...pregens.matchAll(/Уклонение<\/div><div class="v">значение <span class="uline" contenteditable="true">(\d+)<\/span>/g)].map(m=>Number(m[1]));
  assert.equal(tiles.length,5);
  for (const value of tiles) assert.ok(value>=6&&value<=13);
});
