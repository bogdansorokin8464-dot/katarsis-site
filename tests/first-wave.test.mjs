import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const play=read('web/play/index.html');
const source=read('КАТАРСИС.html');
const worker=read('src/worker.mjs');
const updates=read('web/updates.html');

test('critical success, critical failure and rounding are defined', () => {
  for (const [name,html] of [['public play page',play],['canonical source',source]]) {
    assert.match(html,/id="rules-critical"/,`${name} has no critical hit section`);
    assert.match(html,/кость урона берёт максимальное значение/,`${name} does not define critical damage`);
    assert.match(html,/критический провал/,`${name} does not define a critical failure`);
    assert.match(html,/Половина нечётного урона округляется вверх/,`${name} does not round half damage up`);
    assert.doesNotMatch(html,/Как округлять половину нечётного результата, нужно уточнить с Мастером/,`${name} still leaves rounding open`);
  }
  assert.match(source,/id="rules-check-crit"/,'checks do not mention natural 20 and 1');
});

test('inspiration has explicit sources and a cap', () => {
  for (const [name,html] of [['public play page',play],['canonical source',source]]) {
    assert.match(html,/id="rules-inspiration"/,`${name} has no inspiration section`);
    assert.match(html,/Критический успех[^<]*[\s\S]{0,200}?\+1 вдохновение|Натуральная 20 на любой проверке или атаке даёт \+1 вдохновение/,`${name} has no inspiration source`);
    assert.match(html,/Максимум — <b>восемь<\/b> делений трекера/,`${name} has no inspiration cap`);
  }
});

test('rests grant two downtime moves with bounded recovery', () => {
  for (const [name,html] of [['public play page',play],['canonical source',source]]) {
    assert.match(html,/id="rules-rest-moves"/,`${name} has no rest move section`);
    assert.match(html,/два хода отдыха/,`${name} does not grant rest moves`);
    assert.match(html,/1к4 ФЗ<\/td><td>2к4 ФЗ/,`${name} has no wound recovery row`);
    assert.match(html,/1к4 МЗ<\/td><td>2к4 МЗ/,`${name} has no mental recovery row`);
    assert.match(html,/1 ячейка<\/td><td>все ячейки/,`${name} has no armour repair row`);
    assert.match(html,/\+1 вдохновение<\/td><td>\+2 вдохновения/,`${name} has no preparation row`);
  }
  assert.doesNotMatch(source,/Эта процедура не назначает автоматическое восстановление ФЗ, МЗ или вдохновения/,'old no-recovery sentence survives');
});

test('death and zero health are settled', () => {
  for (const [name,html] of [['public play page',play],['canonical source',source]]) {
    assert.match(html,/id="rules-death"/,`${name} has no death section`);
    for (const move of ['Пламя славы','Избежать смерти','Рискнуть всем']) {
      assert.ok(html.includes(move),`${name} is missing the death move ${move}`);
    }
    assert.match(html,/против <b>12<\/b>/,`${name} has no risk-it-all target number`);
    assert.match(html,/навсегда получает −1/,`${name} does not define a scar`);
    assert.match(html,/0 МЗ\.<\/b> Персонаж недееспособен/,`${name} does not define zero mental health`);
  }
  assert.doesNotMatch(source,/спасброски смерти, таблица травм/,'old disclaimer about death rules survives');
});

test('a scene has a definition and an end', () => {
  for (const [name,html] of [['public play page',play],['canonical source',source]]) {
    assert.match(html,/id="rules-scene"/,`${name} has no scene definition`);
    assert.match(html,/Завершённый отдых всегда закрывает сцену/,`${name} does not close a scene on rest`);
  }
});

test('the calling ritual is printed above the ability cards', () => {
  for (const [name,html] of [['public play page',play],['canonical source',source]]) {
    assert.match(html,/cards-ritual-style/,`${name} has no ritual card style`);
    assert.match(html,/ritual\.className='ritual-card'/,`${name} does not build a ritual card`);
    assert.match(html,/Ритуал призвания · /,`${name} does not label the ritual card`);
    assert.match(html,/второй бросок не добавляет/,`${name} does not repeat the single-d6 rule`);
  }
  assert.equal((source.match(/"ritualName"/g)||[]).length,26,'not every calling has a ritual');
});

test('the changelog, version and build agree', () => {
  assert.match(worker,/id:'2026\.11\.12\.\d+'/);
  assert.match(worker,/title:'[^']+'/);
  assert.match(updates,/id="release-2026-11-08-2"/);
  assert.match(updates,/Ритуал призвания печатается на странице карточек/);
  assert.doesNotMatch(updates,/30 октября 2026 · 2026\.11\.08\.2/,'the October release eyebrow was overwritten');
  const bytes=Buffer.byteLength(play);
  assert.ok(bytes<25*1024*1024,`play/index.html is ${bytes} bytes`);
});
