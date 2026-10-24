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
