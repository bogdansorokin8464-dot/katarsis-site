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
 for(const k of ['characters-backup-all','characters-import-all'])$(k).disabled=busy||!ready;
}
function render(){
 const select=$('characters-select');select.replaceChildren();
 state.characters.forEach((c,i)=>{const o=document.createElement('option');o.value=c.id;o.textContent=(i+1)+'. '+name(c);select.append(o);});
 select.value=state.active;controls();
 document.dispatchEvent(new CustomEvent('katarsis:active-character',{detail:{id:state.active}}));
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
 if(busy||!ready)return Promise.resolve(false);
 const characterId=state.active;
 // Synchronous last-edit journal also runs during beforeunload.
 try{localStorage.setItem(DRAFT,JSON.stringify({characterId,snapshot}));}catch{}
 return serial(async()=>{try{await storeSnapshot(snapshot,characterId);$('portal-save-state').textContent='Сохранено в этом браузере';if(!silent)note('Сохранён персонаж: '+name(state.characters.find(c=>c.id===characterId))+'.');return true;}catch(e){$('portal-save-state').textContent='Нужен экспорт JSON';note('Сохранение не удалось. '+e.message+' Экспортируйте текущий лист в JSON.');return false;}});
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
/* Installed inside the character-library closure: all collection writes are atomic. */
function validateCollection(data){
 if(!data||data.format!=='katarsis-collection'||data.version!==1||!Array.isArray(data.characters)||data.characters.length<1||data.characters.length>MAX)throw Error('Нужна резервная копия коллекции Катарсиса (от 1 до 10 персонажей).');
 for(const c of data.characters){valid(c?.snapshot);const s=c.snapshot;if(!Array.isArray(s.pips)||s.pips.length>5000||s.pips.some(v=>typeof v!=='boolean')||s.fields.length>5000||s.fields.some(v=>typeof v!=='string')||!s.modules||typeof s.modules!=='object'||Array.isArray(s.modules)||(s.checks!==undefined&&(!Array.isArray(s.checks)||s.checks.some(v=>typeof v!=='boolean'))))throw Error('В коллекции есть повреждённый лист. Данные не изменены.');}
 return data;
}
async function collectionData(){
 if(!ready||busy)throw Error('Дождитесь загрузки персонажей.');
 if(!await saveSnapshot(api.snapshot(),true))throw Error('Текущий лист не удалось сохранить. Экспортируйте его отдельно.');await queue;const saved=await read();
 return {format:'katarsis-collection',version:1,exportedAt:new Date().toISOString(),active:state.active,characters:clone(saved.characters)};
}
async function backupAll(){try{
 const data=await collectionData();const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='КАТАРСИС_все_персонажи_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);note('Скачана резервная копия: '+data.characters.length+' персонажей.');
}catch(e){note('Не удалось создать резервную копию: '+e.message);}}
async function importCollection(data,mode='append',confirmed=false){
 validateCollection(data);if(!['append','replace'].includes(mode))throw Error('Неизвестный режим импорта.');
 if(mode==='replace'&&!confirmed&&!confirm('Заменить всю текущую коллекцию? Нынешние листы будут удалены. Сначала скачайте резервную копию.'))return false;
 if(!ready||busy)throw Error('Дождитесь окончания текущей операции.');
 const incoming=clone(data);let success=false;
 await action(async(previous,previousId)=>{
  const saved=await read();if(mode==='append'&&saved.characters.length+incoming.characters.length>MAX)throw Error('Не хватает слотов: добавление превысит предел 10. Текущие листы не заменены.');
  const records=incoming.characters.map(c=>({id:id(),snapshot:clone(c.snapshot),updatedAt:new Date().toISOString()}));
  if(mode==='replace'){
   const idx=Math.max(0,incoming.characters.findIndex(c=>c.id===incoming.active)),target=records[idx];
   const packet=clone(target.snapshot);packet.ui={view:'sheet',step:0};await api.restore(packet,false);
   state=await mutate(s=>{s.characters=records;s.active=target.id;return s;});api.showView('sheet');
  }else state=await mutate(s=>{if(s.characters.length+records.length>MAX)throw Error('Коллекция изменилась в другой вкладке: недостаточно места.');s.characters.push(...records);s.active=previousId;return s;});
  // Old emergency drafts must never resurrect a replaced collection.
  try{localStorage.removeItem(DRAFT);localStorage.setItem(KEY,JSON.stringify(api.snapshot()));}catch{}
  success=true;note((mode==='append'?'Добавлено персонажей: ':'Коллекция восстановлена. Персонажей: ')+records.length+'.');
 });
 return success;
}
let pendingCollection=null;
function collectionPreview(){
 const mode=$('collection-mode').value,count=pendingCollection?.characters.length||0,overflow=mode==='append'&&state.characters.length+count>MAX;
 $('collection-apply').disabled=overflow||busy||!ready||!pendingCollection;
 $('collection-warning').textContent=overflow?'Не хватает свободных слотов. Можно отменить импорт или явно выбрать замену всей коллекции.':mode==='replace'?'Внимание: все текущие листы будут заменены. Скачайте резервную копию до продолжения.':'Текущие листы останутся на месте. Импортированные герои займут отдельные слоты.';
}
$('characters-backup-all').onclick=backupAll;
$('characters-import-all').onclick=()=>$('collection-file').click();
$('collection-file').onchange=async()=>{
 const file=$('collection-file').files[0];if(!file)return;
 try{
  if(file.size>200*1024*1024)throw Error('Файл слишком большой. Предел — 200 МБ.');
  const data=JSON.parse(await file.text());validateCollection(data);pendingCollection=data;
  $('collection-preview').replaceChildren();for(const [i,c]of data.characters.entries()){const li=document.createElement('li');li.textContent=(i+1)+'. '+name(c);$('collection-preview').append(li);}
  $('collection-mode').value='append';collectionPreview();$('collection-dialog').showModal();
 }catch(e){note('Импорт не выполнен: '+e.message);}finally{$('collection-file').value='';}
};
$('collection-mode').onchange=collectionPreview;
$('collection-cancel').onclick=()=>$('collection-dialog').close();
$('collection-apply').onclick=async()=>{
 const data=pendingCollection,mode=$('collection-mode').value;if(!data)return;
 if(mode==='replace'&&!confirm('Заменить все текущие листы этой коллекцией? Без резервной копии вернуть удалённые листы нельзя.'))return;
 $('collection-apply').disabled=true;
 try{const done=await importCollection(data,mode,true);if(done){pendingCollection=null;$('collection-dialog').close();}else collectionPreview();}catch(e){$('collection-warning').textContent=e.message;collectionPreview();}
};
$('collection-dialog').addEventListener('close',()=>pendingCollection=null);

window.KATAR_CHARACTERS={saveSnapshot,create,importSnapshot,collectionData,importCollection,backupAll,activeId:()=>state.active,isReady:()=>ready&&!busy,flush:()=>queue};
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
