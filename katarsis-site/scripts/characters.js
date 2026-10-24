/* Up to ten independent characters. IndexedDB avoids localStorage's small photo quota. */
(()=>{'use strict';
const $=id=>document.getElementById(id),api=window.KATAR_PORTAL,MAX=10;
const KEY='katarsis.character.portal.v1',DRAFT='katarsis.characters.draft.v1';
const clone=v=>structuredClone(v),fresh=clone(window.KATAR_EMPTY_CHARACTER);
const nameIndex=[...document.querySelectorAll('.sheet [contenteditable]')].indexOf(document.querySelector('.ident-l .line'));
let db,state={version:1,active:'',characters:[]},busy=true,ready=false,queue=Promise.resolve();
const name=c=>String(c.snapshot?.fields?.[nameIndex]||'').trim()||'Без имени';
const id=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const note=t=>{$('characters-status').textContent=t;};
function valid(s){if(!s||s.format!=='katarsis-character'||s.version!==1||!Array.isArray(s.fields)||!s.modules)throw Error('Неподдерживаемый файл персонажа.');}
function controls(){
 $('characters-count').textContent=state.characters.length+' / '+MAX;
 for(const k of ['characters-select','characters-delete'])$(k).disabled=busy||!ready;
 for(const k of ['characters-create','characters-copy'])$(k).disabled=busy||!ready||state.characters.length>=MAX;
 $('characters-limit').hidden=state.characters.length<MAX;
}
function render(){
 const select=$('characters-select');select.replaceChildren();
 state.characters.forEach((c,i)=>{const o=document.createElement('option');o.value=c.id;o.textContent=(i+1)+'. '+name(c);select.append(o);});
 select.value=state.active;controls();
}
function serial(task){const p=queue.then(task,task);queue=p.catch(()=>{});return p;}
function read(){return new Promise((resolve,reject)=>{const tx=db.transaction('library','readonly'),r=tx.objectStore('library').get('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
// Read-modify-write in one transaction also protects other tabs from lost updates.
function mutate(fn){return new Promise((resolve,reject)=>{
 const tx=db.transaction('library','readwrite'),store=tx.objectStore('library'),r=store.get('state');let next,error;
 r.onsuccess=()=>{try{next=fn(r.result||{version:1,active:'',characters:[]});if(next.characters.length>MAX)throw Error('Достигнут предел: 10 персонажей.');store.put(next,'state');}catch(e){error=e;tx.abort();}};
 tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(error||tx.error||Error('Не удалось сохранить персонажей.'));tx.onerror=()=>{};
 });}
async function storeSnapshot(snapshot,characterId=state.active){
 valid(snapshot);
 const packet=clone(snapshot);
 const ownActive=state.active;
 state=await mutate(s=>{const c=s.characters.find(c=>c.id===characterId);if(!c)throw Error('Этот лист был удалён в другой вкладке. Экспортируйте его в JSON.');c.snapshot=packet;c.updatedAt=new Date().toISOString();return s;});
 state.active=ownActive;
 try{const d=JSON.parse(localStorage.getItem(DRAFT)||'null');if(d?.characterId===characterId&&String(d.snapshot?.savedAt||'')<=String(packet.savedAt||''))localStorage.removeItem(DRAFT);}catch{}
 // Keep the single-character key as a backward-compatible best-effort backup.
 try{localStorage.setItem(KEY,JSON.stringify(packet));}catch{}
 render();
}
function saveSnapshot(snapshot,silent=false){
 if(busy||!ready)return Promise.resolve();
 const characterId=state.active;
 // Synchronous last-edit journal also runs during beforeunload.
 try{localStorage.setItem(DRAFT,JSON.stringify({characterId,snapshot}));}catch{}
 return serial(async()=>{try{await storeSnapshot(snapshot,characterId);$('portal-save-state').textContent='Сохранено в этом браузере';if(!silent)note('Сохранён персонаж: '+name(state.characters.find(c=>c.id===characterId))+'.');}catch(e){$('portal-save-state').textContent='Нужен экспорт JSON';note('Сохранение не удалось. '+e.message+' Экспортируйте текущий лист в JSON.');}});
}
async function action(fn){
 if(busy||!ready)return;busy=true;controls();const previous=clone(api.snapshot()),previousId=state.active;
 try{await serial(async()=>{await storeSnapshot(previous,previousId);await fn(previous,previousId);});}
 catch(e){try{await api.restore(previous,false);const saved=await read();if(saved)state=saved;state.active=previousId;}catch{}note(e.message+' Текущий лист сохранён; при необходимости экспортируйте JSON.');}
 finally{busy=false;render();}
}
async function addSnapshot(snapshot,previous){
 valid(snapshot);const saved=await read();if(saved.characters.length>=MAX)throw Error('Уже есть 10 персонажей. Удалите ненужный лист, предварительно экспортировав его.');
 const next=clone(snapshot);next.ui={view:'sheet',step:0};
 await api.restore(next,false);
 const newId=id();
 state=await mutate(s=>{if(s.characters.length>=MAX)throw Error('Уже есть 10 персонажей.');s.characters.push({id:newId,snapshot:clone(api.snapshot()),updatedAt:new Date().toISOString()});s.active=newId;return s;});
 try{localStorage.setItem(KEY,JSON.stringify(api.snapshot()));}catch{}
 api.showView('sheet');note('Открыт отдельный лист. Остальные персонажи сохранены.');
}
function create(){return action(async previous=>addSnapshot(clone(fresh),previous));}
function duplicate(){return action(async previous=>{const copy=clone(previous);copy.fields[nameIndex]=(String(copy.fields[nameIndex]||'').trim()||'Персонаж')+' (копия)';await addSnapshot(copy,previous);note('Копия создана в отдельном слоте. Исходный персонаж не изменён.');});}
async function importSnapshot(snapshot){valid(snapshot);return action(async previous=>addSnapshot(snapshot,previous));}
$('characters-create').onclick=create;$('characters-copy').onclick=duplicate;
$('characters-select').onchange=e=>{const target=e.target.value;action(async()=>{
 const saved=await read(),c=saved.characters.find(c=>c.id===target);if(!c)throw Error('Персонаж больше не существует.');
 const packet=clone(c.snapshot);packet.ui={...(packet.ui||{}),view:'sheet'};await api.restore(packet,false);
 state=await mutate(s=>{if(!s.characters.some(c=>c.id===target))throw Error('Персонаж был удалён.');s.active=target;return s;});
 api.showView('sheet');note('Открыт персонаж: '+name(c)+'.');
 });};
$('characters-delete').onclick=()=>{
 const c=state.characters.find(c=>c.id===state.active);if(!c||busy)return;
 if(!confirm('Удалить персонажа «'+name(c)+'»? Это нельзя отменить. Сначала экспортируйте JSON, если лист нужен. Остальные персонажи сохранятся.'+(state.characters.length===1?' Вместо последнего листа будет открыт пустой.':'')))return;
 action(async(previous,previousId)=>{
  const saved=await read(),others=saved.characters.filter(c=>c.id!==previousId);
  let next=others[0]||{id:id(),snapshot:clone(fresh),updatedAt:new Date().toISOString()};
  const packet=clone(next.snapshot);packet.ui={view:'sheet',step:0};await api.restore(packet,false);
  state=await mutate(s=>{s.characters=s.characters.filter(c=>c.id!==previousId);if(!s.characters.some(c=>c.id===next.id))s.characters.push(next);s.active=next.id;return s;});
  api.showView('sheet');note('Персонаж удалён. Другие листы сохранены.');
 });
};
window.KATAR_CHARACTERS={saveSnapshot,create,importSnapshot,flush:()=>queue};
(async()=>{try{
 // The legacy restore in the main module finishes before migration reads the form.
 await new Promise(r=>setTimeout(r,0));
 db=await new Promise((resolve,reject)=>{const request=indexedDB.open('katarsis.characters.v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('library');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Закройте старые вкладки Катарсиса и повторите.'));});
 let saved=await read();
 if(!saved){const original=clone(api.snapshot()),newId=id();saved=await mutate(s=>{if(s.characters.length)return s;s.characters=[{id:newId,snapshot:original,updatedAt:new Date().toISOString()}];s.active=newId;return s;});note('Текущий персонаж сохранён в первом слоте. Можно добавить ещё девять.');}
 try{const draft=JSON.parse(localStorage.getItem(DRAFT)||'null');if(draft&&saved.characters.some(c=>c.id===draft.characterId)){valid(draft.snapshot);saved=await mutate(s=>{const c=s.characters.find(c=>c.id===draft.characterId);if(c&&String(draft.snapshot.savedAt||'')>=String(c.snapshot.savedAt||''))c.snapshot=draft.snapshot;return s;});localStorage.removeItem(DRAFT);}}catch{}
 if(saved.version!==1||!Array.isArray(saved.characters)||saved.characters.length>MAX||!saved.characters.length)throw Error('Хранилище персонажей повреждено. Исходные данные не удалены.');
 state=saved;const c=state.characters.find(c=>c.id===state.active)||state.characters[0];state.active=c.id;
 const requested=location.hash.slice(1);await api.restore(clone(c.snapshot),false);if(requested)api.showView(requested,false);
 ready=true;busy=false;render();note('Открыт персонаж: '+name(c)+'. Все листы доступны в списке выше.');$('portal-save-state').textContent='Персонаж восстановлен';
}catch(e){busy=false;controls();note('Браузер не открыл хранилище персонажей. '+e.message+' Текущий лист можно экспортировать в JSON.');}})();
})();
