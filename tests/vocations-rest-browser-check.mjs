import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://localhost:3000/play/#session');
 await page.waitForFunction(()=>window.KATAR_CHARACTERS?.isReady()&&window.KATAR_PLAY_TOOLS);
 assert.equal(await page.locator('.vocation-guide').count(),26);
 assert.equal(await page.locator('.vocation-actions li').count(),78);
 assert.equal(await page.locator('#view-rules .system-rule-chapter').count(),18);
 assert.equal(await page.locator('.sheet [contenteditable]').count(),194);
 const result=await page.evaluate(()=>{
  const d=VOCATION_DATA;
  for(const name of Object.keys(d)){
   const g=d[name].guide;if(!g||g.actions.length!==3||g.chosen.length!==2)throw Error('Missing guide '+name);
   for(const skill of g.chosen)if(!d[name].skills.some(a=>a[0]===skill))throw Error('Unavailable skill '+name+skill);
  }
  return {mage:d['Кудесник'].skills.map(s=>s.slice(0,2)),shield:d['Щитоносец'].skills.map(s=>s[0]),rift:d['Кудесник'].key[2]};
 });
 assert.equal(result.mage.length,5);assert.equal(result.mage[0][1],'Действие');assert.equal(result.mage[1][1],'Действие + 2 стресса');
 assert.deepEqual(result.shield,['Плечом к плечу','Строевой зверь','Непробиваемый','Щитобой','Стой за мной']);
 assert(result.rift.includes('не более одного существа'));
 // Existing selected indices and legacy favorite names migrate to the new shield abilities.
 await page.evaluate(async()=>{
  const d=KATAR_PORTAL.snapshot();d.vocation='Щитоносец';d.modules.abilities={omen:[],vocation:[0,4]};
  d.modules.playTools={favorites:['ability:'+JSON.stringify(['vocation','Щитоносец','Тяжеловес']),'ability:'+JSON.stringify(['vocation','Щитоносец','Неистовство'])]};
  await KATAR_PORTAL.restore(d,false);await KATAR_PORTAL.save(true);KATAR_PORTAL.showView('session');
 });
 await page.waitForFunction(()=>document.getElementById('session-ritual-title').textContent.includes('За щитом тихо'));
 await page.waitForFunction(()=>document.querySelectorAll('#session-abilities .play-card').length===3);
 assert.match(await page.locator('#session-abilities').innerText(),/Плечом к плечу/);
 assert.match(await page.locator('#session-abilities').innerText(),/Стой за мной/);
 assert.equal(await page.evaluate(()=>KATAR_PLAY_TOOLS.favorites().length),2);
 assert((await page.evaluate(()=>KATAR_PLAY_TOOLS.favorites())).every(k=>!k.includes('Тяжеловес')&&!k.includes('Неистовство')));
 // Cancellation, deterministic die, unchanged unrelated resources, undo/redo, both rest kinds and floor zero.
 await page.evaluate(()=>{const s=document.getElementById('stress-total');s.value='8';s.dispatchEvent(new Event('change',{bubbles:true}));Math.random=()=>.7;KATAR_PLAY_TOOLS.resetHistory();});
 const resources=await page.locator('#session-resources').evaluate(n=>[n.querySelector('#session-hp').value,n.querySelector('#session-mp').value,n.querySelector('#session-inspiration').value]);
 page.once('dialog',d=>d.dismiss());await page.locator('#session-rest-finish').click();
 assert.equal(await page.locator('#stress-total').inputValue(),'8');
 page.once('dialog',d=>d.accept());await page.locator('#session-rest-finish').click();
 await page.waitForFunction(()=>document.getElementById('session-rest-result').textContent.includes('8 → 3'));
 assert.deepEqual(await page.locator('#session-resources').evaluate(n=>[n.querySelector('#session-hp').value,n.querySelector('#session-mp').value,n.querySelector('#session-inspiration').value]),resources);
 await page.evaluate(()=>KATAR_PLAY_TOOLS.undo());assert.equal(await page.locator('#stress-total').inputValue(),'8');
 await page.evaluate(()=>KATAR_PLAY_TOOLS.redo());assert.equal(await page.locator('#stress-total').inputValue(),'3');
 await page.selectOption('#session-rest-kind','long');page.once('dialog',d=>d.accept());await page.locator('#session-rest-finish').click();
 await page.waitForFunction(()=>document.getElementById('session-rest-result').textContent.includes('3 → 0'));
 assert.match(await page.locator('#session-rest-result').innerText(),/Длинный отдых/);
 await page.reload();await page.waitForFunction(()=>KATAR_CHARACTERS?.isReady());assert.equal(await page.locator('#stress-total').inputValue(),'0');
 assert.equal(await page.evaluate(()=>KATAR_PORTAL.snapshot().vocation),'Щитоносец');
 await page.evaluate(()=>KATAR_PORTAL.showView('session'));
 await page.locator('#session-vocation-guide').click();assert.equal(await page.locator('#rules-vocations').getAttribute('open'),'');
 assert.equal(await page.locator('.vocation-guide[data-vocation="Щитоносец"]').getAttribute('open'),'');
 for(const width of [360,390,430,768,1280]){
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>{KATAR_PORTAL.showView('rules');document.getElementById('rules-vocations').open=true;document.querySelectorAll('.vocation-guide').forEach(d=>d.open=true);});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Guide overflow '+width);
  await page.evaluate(()=>KATAR_PORTAL.showView('session'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Session overflow '+width);
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#session-rest-tools').screenshot({path:'/tmp/katar-rest-mobile.png'});
 await page.evaluate(()=>{KATAR_PORTAL.showView('rules');document.getElementById('rules-vocations').open=true;document.querySelectorAll('.vocation-guide').forEach(d=>d.open=false);document.querySelector('.vocation-guide[data-vocation="Кудесник"]').open=true;});
 await page.locator('.vocation-guide[data-vocation="Кудесник"]').screenshot({path:'/tmp/katar-mage-guide-mobile.png'});
 assert.match(await page.locator('#rules-chase').innerText(),/Отдельного броска погони нет/);
 assert.match(await page.locator('#rules-rest').innerText(),/один к6/);
 await page.emulateMedia({media:'print'});assert.equal(await page.locator('#session-rest-tools').evaluate(n=>getComputedStyle(n).display),'none');
 // All reworked choices stay inside the unchanged 82 mm printable cards.
 await page.setViewportSize({width:794,height:1123});await page.evaluate(()=>document.fonts.ready);
 for(const vocation of ['Кудесник','Щитоносец'])for(const choices of [[0,1],[2,3],[4]]){
  await page.emulateMedia({media:'screen'});
  await page.evaluate(async({vocation,choices})=>{const d=KATAR_PORTAL.snapshot();d.vocation=vocation;d.modules.abilities={omen:[],vocation:choices};await KATAR_PORTAL.restore(d,false);},{vocation,choices});
  await page.emulateMedia({media:'print'});
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  const overflow=await page.locator('#chosen-skills .ability-card').evaluateAll(ns=>ns.filter(n=>n.scrollHeight>n.clientHeight+2).map(n=>n.querySelector('h3').textContent));
  assert.deepEqual(overflow,[],vocation+' print card overflow');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: 26 rituals, 78 actions, reworked vocations, favorite migration, selected-index persistence, rest cancellation/roll/floor/undo/redo/reload, unchanged other resources, rules links, 360–1280 layouts, print, no JS errors.');
}finally{await browser.close();}
