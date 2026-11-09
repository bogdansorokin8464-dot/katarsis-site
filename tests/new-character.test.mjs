import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const play=read('web/play/index.html');
const source=read('КАТАРСИС.html');
const worker=read('src/worker.mjs');
const updates=read('web/updates.html');

const pages=[['public play page',play],['canonical source',source]];

test('the blank template is defined by code, not by form values restored by the browser', () => {
  for(const [name,html] of pages){
    assert.match(html,/window\.KATAR_EMPTY_CHARACTER=snapshot\(\);\s*\/\/ Пустой шаблон задаётся кодом/,
      `${name} captures the blank template from whatever the form holds`);
    assert.match(html,/blank\.omen='';blank\.vocation='';/,`${name} keeps a restored omen or vocation in the blank template`);
    assert.match(html,/blank\.checks=blank\.checks\.map\(\(\)=>false\)/,`${name} keeps restored conditions in the blank template`);
    assert.match(html,/modules\.shop=\{rolled:false,rolls:\[\],receipts:\[\],cart:\[\],overflow:\[\],owned:\[\[\],\[\],\[\]\],clothes:'',personal:''\}/,
      `${name} keeps clothes, personal item or purchases in the blank template`);
    assert.match(html,/modules\.armor=\{marked:0\}/,`${name} keeps marked armour cells in the blank template`);
    assert.match(html,/modules\.rulesV2=\{stress:0\}/,`${name} keeps stress in the blank template`);
    assert.match(html,/modules\.defense=Object\.fromEntries/ ,`${name} keeps defence inputs in the blank template`);
  }
});

test('every section of the sheet is reset when a character is restored', () => {
  for(const [name,html] of pages){
    assert.match(html,/function applyModule\(key,value\)\{/,'no tolerant per-section reset helper');
    assert.match(html,/console\.warn\('Раздел «'\+key\+'» не восстановлен:',error\)/,'a failing section still aborts the whole restore');
    assert.match(html,/\['abilities','stats','shop','training','custom'\]\.forEach\(key=>applyModule\(key,data\.modules\[key\]\)\)/,
      `${name} skips sections that are missing from the file`);
    assert.match(html,/applyModule\('defense',data\.modules\.defense\)/);
    assert.match(html,/applyModule\('armor',data\.modules\.armor\)/,`${name} does not reset marked armour cells`);
    assert.match(html,/applyModule\('fullplay',data\.modules\.fullplay\)/);
    assert.match(html,/applyModule\('rulesV2',data\.modules\.rulesV2\)/);
    assert.match(html,/applyModule\('playTools',data\.modules\.playTools\)/);
  }
  // Gear lives in the sheet text, so sections are reset before the fields: resetting the
  // shop after the fields writes the "before" texts back and wipes the inventory.
  const modules=source.indexOf("['abilities','stats','shop','training','custom'].forEach");
  const fields=source.indexOf('editableFields().forEach((field,index)');
  assert.ok(modules>0&&fields>0&&modules<fields,'modules must be reset before the sheet fields');
  assert.doesNotMatch(source,/\[['"]custom['"],['"]stats['"],['"]abilities['"]\][\s\S]{0,80}shop/,
    'the shop must not be reset a second time after the fields');
});

test('a new character is verified against the blank template', () => {
  for(const [name,html] of pages){
    assert.match(html,/function blankDrift\(template\)\{/,`${name} has no drift check`);
    assert.match(html,/function settleBlank\(template\)\{/,`${name} has no repair for leftovers`);
    assert.match(html,/const drift=blankDrift\(next\);if\(drift\.length\)\{await api\.restore\(next,false\);settleBlank\(next\);\}/,
      `${name} does not retry a restore that left old data behind`);
    assert.match(html,/остались от прежнего героя\. Проверьте их и очистите вручную; прежний лист не изменён\./,
      `${name} keeps leftover sections silent`);
  }
  assert.match(source,/function create\(\)\{return action\(async previous=>addSnapshot\(clone\(fresh\),previous,true\)\);\}/,
    'create must ask for the blank-sheet verification');
  assert.match(source,/async function addSnapshot\(snapshot,previous,blank=false\)\{/);
  assert.doesNotMatch(source,/addSnapshot\(copy,previous,true\)/,'a duplicate must keep its data');
  assert.doesNotMatch(source,/addSnapshot\(snapshot,previous,true\)/,'an imported character must keep its data');
});

test('creation never fails silently and snapshots never share live arrays', () => {
  for(const [name,html] of pages){
    assert.match(html,/if\(busy\|\|!ready\)\{note\('Дождитесь загрузки персонажей и повторите действие\.'\);return;\}/,
      `${name} can swallow a create click without any message`);
    assert.match(html,/const detach=v=>/,`${name} stores live module arrays inside a snapshot`);
    assert.match(html,/modules\[key\]=detach\(hook\.get\(\)\)/,`${name} copies module state by reference`);
  }
});

test('the fix ships with a version and a changelog entry', () => {
  assert.match(read('web/index.html'),/Версия 2026\.11\.08\.9/);
  assert.match(read('ВЕРСИЯ.txt'),/^2026\.11\.08\.9/);
  assert.match(worker,/id:'2026\.11\.08\.9'/);
  assert.match(worker,/title:'Травмы — только выбор на второй странице листа'/);
  assert.match(updates,/id="release-2026-11-08-5"/);
  assert.match(updates,/Новый персонаж без остатков прежнего листа/);
});
