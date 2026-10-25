/* Session screen, per-character favorites, and bounded in-memory undo. */
(()=>{'use strict';
const $=id=>document.getElementById(id),api=window.KATAR_PORTAL,clone=v=>structuredClone(v);
const catalog=new Map();let favorites=[],renderTimer,undoTimer,applying=false,currentId='',history=[],future=[];
const keyFor=(type,group,name)=>'ability:'+JSON.stringify([type,group,name]);
const notice=t=>{$('playtools-notice').textContent=t;$('playtools-notice').hidden=!t;};
const val=t=>{t=String(t).trim().replaceAll('−','-');return /^[+-]?\d+$/.test(t)?Number(t):null;};
function fingerprint(s){const p={...s};delete p.savedAt;delete p.ui;return JSON.stringify(p);}
function activeId(){return window.KATAR_CHARACTERS?.activeId()||'';}
function available(){return window.KATAR_CHARACTERS?.isReady()&&!applying;}
function undoUI(){$('portal-undo').disabled=!available()||history.length<2;$('portal-redo').disabled=!available()||!future.length;}
function resetHistory(){if(currentId!==activeId())$('session-roll-result').textContent='';currentId=activeId();history=[clone(api.snapshot())];future=[];clearTimeout(undoTimer);undoUI();renderSession();}
function record(){
 clearTimeout(undoTimer);if(!available())return;
 if(currentId!==activeId()){resetHistory();return;}
 const s=api.snapshot();if(!history.length){history=[clone(s)];}
 else if(fingerprint(s)!==fingerprint(history.at(-1))){history.push(clone(s));if(history.length>21)history.shift();future=[];}
 undoUI();
}
function scheduleRecord(){if(applying)return;clearTimeout(undoTimer);undoTimer=setTimeout(record,350);scheduleSession();}
async function travel(redo=false){
 if(!available())return;record();
 if(redo?!future.length:history.length<2){notice('Нет изменений для отмены.');return;}
 const previousScroll=window.scrollY,before=clone(api.snapshot()),oldHistory=history.slice(),oldFuture=future.slice();
 let target;if(redo){target=future.pop();history.push(clone(target));}else{future.push(history.pop());target=history.at(-1);}
 applying=true;undoUI();clearTimeout(undoTimer);
 try{const data=clone(target);data.ui=before.ui;await api.restore(data,false);await api.save(true);history[history.length-1]=clone(api.snapshot());notice(redo?'Изменение возвращено.':'Последнее изменение отменено.');}
 catch(e){history=oldHistory;future=oldFuture;try{await api.restore(before,false);}catch{}notice('Не удалось отменить изменение. Экспортируйте лист в JSON.');}
 finally{applying=false;undoUI();renderFavorites();updateStars();renderSession();window.scrollTo({top:previousScroll,behavior:'instant'});}
}
$('portal-undo').onclick=()=>travel(false);$('portal-redo').onclick=()=>travel(true);
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.closest('input,textarea,[contenteditable="true"]')){e.preventDefault();travel(e.shiftKey);}});
const add=(key,data)=>catalog.set(key,{key,...data});
for(const [group,d] of Object.entries(OMEN_DATA))for(const a of d.skills)add(keyFor('omen',group,a[0]),{type:'ability',name:a[0],source:'Знамение · '+group,cost:a[1],text:a[2],view:'abilities'});
for(const [group,d] of Object.entries(VOCATION_DATA)){
 add(keyFor('key',group,d.key[0]),{type:'ability',name:d.key[0],source:'Ключ · '+group,cost:d.key[1],text:d.key[2],view:'abilities'});
 for(const a of d.skills)add(keyFor('vocation',group,a[0]),{type:'ability',name:a[0],source:'Призвание · '+group,cost:a[1],text:a[2],view:'abilities'});
}
for(const item of SHOP_CATALOG)add('item:'+item.id,{type:'item',name:item.name,source:item.category,cost:item.price+' мон. · базовая цена',text:item.description,view:'shop'});
for(const chapter of document.querySelectorAll('.system-rule-chapter[id]')){
 const heading=chapter.querySelector('summary h2');if(!heading)continue;
 const copy=heading.cloneNode(true);copy.querySelector('small')?.remove();
 add('rule:'+chapter.id,{type:'rule',name:copy.textContent.trim(),source:'Правила системы',text:chapter.querySelector('.sr-body')?.innerText.slice(0,300).trim()||'',view:'rules',target:chapter.id});
}
function element(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function toggle(key){
 if(!available()||!catalog.has(key))return;record();favorites=favorites.includes(key)?favorites.filter(k=>k!==key):[...favorites,key];updateStars();renderFavorites();renderSession();record();api.save(true);
}
function star(key){const b=element('button','','favorite-star');b.type='button';b.dataset.favorite=key;b.onclick=e=>{e.preventDefault();e.stopPropagation();toggle(key);};paintStar(b);return b;}
function paintStar(b){const selected=favorites.includes(b.dataset.favorite);const text=selected?'★':'☆';if(b.textContent!==text)b.textContent=text;b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',(selected?'Убрать из избранного: ':'В избранное: ')+(catalog.get(b.dataset.favorite)?.name||''));b.title=b.getAttribute('aria-label');b.disabled=!window.KATAR_CHARACTERS?.isReady();}
function updateStars(){document.querySelectorAll('.favorite-star[data-favorite]').forEach(paintStar);}
function injectCards(root){
 for(const card of root.querySelectorAll('.portal-ability,.ability-card,.product')){
  if(card.querySelector('.favorite-star'))continue;
  let key=card.dataset.favoriteKey;
  if(!key&&!card.classList.contains('product')){
   const source=card.querySelector('.portal-eyebrow,.ability-source')?.textContent||'',group=source.split(' · ').slice(1).join(' · '),name=card.querySelector('h3')?.textContent;
   key=keyFor(source.startsWith('Знамение')?'omen':source.startsWith('Ключ')?'key':'vocation',group,name);
  }
  if(catalog.has(key)){card.classList.add('favorite-enabled');card.append(star(key));}
 }
}
for(const root of [$('portal-ability-results'),$('shop-products'),$('chosen-skills')]){if(!root)continue;injectCards(root);new MutationObserver(()=>{injectCards(root);scheduleSession();}).observe(root,{childList:true});}
for(const chapter of document.querySelectorAll('.system-rule-chapter[id]'))if(catalog.has('rule:'+chapter.id))chapter.querySelector('summary').append(star('rule:'+chapter.id));
function openFavorite(data){
 api.showView(data.view);
 if(data.type==='rule'){const target=$(data.target);target.open=true;target.scrollIntoView({block:'start',behavior:'smooth'});}
 if(data.type==='ability'){$('portal-ability-type').value='';$('portal-ability-group').value='';$('portal-ability-search').value=data.name;$('portal-ability-search').dispatchEvent(new Event('input',{bubbles:true}));}
 if(data.type==='item'){$('shop-category').value='';$('shop-category').dispatchEvent(new Event('change',{bubbles:true}));$('shop-search').value=data.name;$('shop-search').dispatchEvent(new Event('input',{bubbles:true}));}
}
function favoriteCard(data){
 const card=element('article',undefined,'play-card favorite-enabled'),source=element('small',data.source),title=element('h3',data.name),text=element('p',data.text||'');
 const open=element('button','Открыть →','portal-button');open.type='button';open.onclick=()=>openFavorite(data);
 card.append(source,title);if(data.cost)card.append(element('div',data.cost,'play-cost'));card.append(text,open,star(data.key));return card;
}
function renderFavorites(){
 const grid=$('favorites-grid'),query=$('favorites-search').value.toLocaleLowerCase('ru').trim(),type=$('favorites-type').value;grid.replaceChildren();
 const data=favorites.map(k=>catalog.get(k)).filter(Boolean).filter(d=>(!type||d.type===type)&&(!query||(d.name+' '+d.source+' '+d.text).toLocaleLowerCase('ru').includes(query)));
 for(const d of data)grid.append(favoriteCard(d));$('favorites-empty').hidden=data.length>0;$('favorites-count').textContent=data.length+' / '+favorites.length;
}
$('favorites-search').oninput=renderFavorites;$('favorites-type').onchange=renderFavorites;
(window.KATAR_HOOKS ||= {}).playTools={get:()=>({favorites:[...favorites]}),set:data=>{favorites=[...new Set(Array.isArray(data?.favorites)?data.favorites.filter(k=>typeof k==='string').map(k=>k===keyFor('vocation','Щитоносец','Тяжеловес')?keyFor('vocation','Щитоносец','Плечом к плечу'):k===keyFor('vocation','Щитоносец','Неистовство')?keyFor('vocation','Щитоносец','Стой за мной'):k).filter(k=>catalog.has(k)).slice(0,1000):[])];updateStars();renderFavorites();scheduleSession();}};
const healthFields=[...document.querySelectorAll('.quick-values .tile')].slice(0,2).map(n=>[...n.querySelectorAll('.uline')]);
const resourceBars=[...document.querySelectorAll('.track-group')].map(g=>({name:g.querySelector('.scale-lab')?.textContent.trim(),bar:g.querySelector('.bar')}));
const inspiration=resourceBars.find(x=>x.name==='Вдохновение')?.bar;
function getResource(kind){if(kind==='hp'||kind==='mp')return val(healthFields[kind==='hp'?0:1][0].textContent);if(kind==='stress')return val($('stress-total').value);return inspiration?[...inspiration.querySelectorAll('.pip.on')].length:0;}
function setResource(kind,n){
 if(!available()||!Number.isSafeInteger(n))return;record();
 if(kind==='hp'||kind==='mp'){const field=healthFields[kind==='hp'?0:1][0];field.textContent=String(n);field.dispatchEvent(new Event('input',{bubbles:true}));}
 else if(kind==='stress'){if(n<0){notice('Стресс не может быть отрицательным.');$('session-stress').value=getResource(kind)??0;return;}$('stress-total').value=String(n);$('stress-total').dispatchEvent(new Event('change',{bubbles:true}));}
 else if(inspiration){const pips=[...inspiration.querySelectorAll('.pip')];if(n<0||n>pips.length){notice('На шкале вдохновения доступны значения от 0 до '+pips.length+'.');$('session-inspiration').value=getResource(kind);return;}pips.forEach((p,i)=>p.classList.toggle('on',i<n));inspiration.dispatchEvent(new Event('input',{bubbles:true}));}
 record();api.save(true);renderSession();
}
for(const kind of ['hp','mp','stress','inspiration']){
 $('session-'+kind).onchange=e=>{const n=val(e.target.value);if(n===null){notice('Введите целое число.');renderSession();return;}setResource(kind,n);};
 document.querySelectorAll('[data-resource="'+kind+'"]').forEach(b=>b.onclick=()=>setResource(kind,(getResource(kind)??0)+Number(b.dataset.delta)));
}
function renderSession(){
 const name=document.querySelector('.ident-l .line')?.textContent.trim()||'Персонаж без имени';$('session-name').textContent=name;
 for(const kind of ['hp','mp','stress','inspiration']){const input=$('session-'+kind);if(document.activeElement!==input)input.value=getResource(kind)??'';input.disabled=!available();}
 $('session-hp-max').textContent='макс. '+(healthFields[0][1]?.textContent.trim()||'—');$('session-mp-max').textContent='макс. '+(healthFields[1][1]?.textContent.trim()||'—');
 const tiles=document.querySelectorAll('.quick-values .tile');$('session-defense').textContent=tiles[2].querySelector('.uline').textContent;$('session-speed').textContent=tiles[3].querySelector('.uline').textContent+' м';
 $('session-stress-note').hidden=(getResource('stress')??0)<10;
 const weapons=$('session-weapons');weapons.replaceChildren();
 for(const tr of document.querySelectorAll('.weapon-card tbody tr')){const cells=[...tr.cells].map(c=>c.textContent.trim());if(!cells[0])continue;const card=element('article',undefined,'play-card');card.append(element('h3',cells[0]));for(const [i,label]of [[1,'Урон'],[2,'Патроны'],[3,'Дальность'],[4,'Свойства']])if(cells[i])card.append(element('p',label+': '+cells[i]));weapons.append(card);}
 $('session-weapons-empty').hidden=weapons.children.length>0;
 const abilities=$('session-abilities');abilities.replaceChildren();
 for(const original of $('chosen-skills').querySelectorAll('.ability-card')){
  const card=element('article',undefined,'play-card favorite-enabled');card.append(element('small',original.querySelector('.ability-source')?.textContent||''),element('h3',original.querySelector('h3')?.textContent||''),element('div',original.querySelector('.ability-cost')?.textContent||'','play-cost'));
  original.querySelectorAll('p:not(.ability-print-text)').forEach(p=>card.append(element('p',p.textContent)));const key=original.querySelector('.favorite-star')?.dataset.favorite;if(key)card.append(star(key));abilities.append(card);
 }
 $('session-abilities-empty').hidden=abilities.children.length>0;
 const quick=$('session-favorites');quick.replaceChildren();for(const k of favorites.slice(0,8)){const data=catalog.get(k);if(!data)continue;const b=element('button',data.name,'portal-button');b.type='button';b.onclick=()=>openFavorite(data);quick.append(b);}
}
function scheduleSession(){clearTimeout(renderTimer);renderTimer=setTimeout(renderSession,80);}
$('session-stress-open').onclick=()=>{api.showView('sheet');const d=document.querySelector('.soul-rules');d.open=true;d.scrollIntoView({block:'center'});};
for(const name of ['modifier','edge']){const target=$('session-roll-'+name),source=$('check-'+(name==='modifier'?'modifier':'edge'));target.replaceChildren(...[...source.children].map(n=>n.cloneNode(true)));target.value=source.value;target.onchange=()=>{syncRoll();$('session-roll-result').textContent='';};}
function syncRoll(){for(const name of ['modifier','edge']){const source=$('check-'+name);source.value=$('session-roll-'+name).value;source.dispatchEvent(new Event('change',{bubbles:true}));}$('session-roll-button').disabled=$('check-roll').disabled;$('session-roll-formula').textContent=$('check-formula').textContent;}
$('session-roll-button').onclick=()=>{syncRoll();$('check-ac').value=$('session-roll-ac').value;$('check-ac').dispatchEvent(new Event('input',{bubbles:true}));$('check-roll').click();$('session-roll-result').textContent=$('check-result').textContent;};
for(const node of [document.querySelector('.quick-values'),$('chosen-skills'),document.querySelector('.stats'),document.querySelector('.skills-section'),document.querySelector('.weapon-card')])if(node)new MutationObserver(()=>{scheduleSession();if(node.classList.contains('skills-section')||node.classList.contains('stats'))syncRoll();}).observe(node,{subtree:true,childList:true,characterData:true});
document.addEventListener('input',scheduleRecord);document.addEventListener('change',scheduleRecord);
document.addEventListener('click',e=>{if(e.target.closest('.bar,.soul-rules,#chosen-skills,.portal-builder-panel,.shop-basket'))scheduleRecord();});
document.addEventListener('katarsis:active-character',()=>{if(currentId!==activeId())resetHistory();else undoUI();updateStars();scheduleSession();});
document.addEventListener('katarsis:restored',()=>{scheduleSession();if(!applying)setTimeout(()=>{if(available())resetHistory();},0);});
window.KATAR_PLAY_TOOLS={undo:()=>travel(false),redo:()=>travel(true),record,resetHistory,favorites:()=>[...favorites]};
renderFavorites();renderSession();syncRoll();undoUI();
})();
