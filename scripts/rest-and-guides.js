/* Rest changes only stress; vocation guides follow the active character. */
(()=>{'use strict';
const $=id=>document.getElementById(id),api=window.KATAR_PORTAL;
let previous='',busy=false;
function selected(){return $('vocation-select').value;}
function guideId(name){return 'vocation-guide-'+Object.keys(VOCATION_DATA).indexOf(name);}
function openGuide(){
 const name=selected();api.showView('rules');
 const chapter=$('rules-vocations');chapter.open=true;
 const guide=name?$(guideId(name)):chapter;if(guide?.tagName==='DETAILS')guide.open=true;
 requestAnimationFrame(()=>guide?.scrollIntoView({block:'start',behavior:'instant'}));
}
$('session-vocation-guide').onclick=openGuide;$('builder-vocation-guide').onclick=openGuide;
function render(){
 const name=selected(),guide=VOCATION_DATA[name]?.guide;
 const key=(window.KATAR_CHARACTERS?.activeId()||'')+'|'+name;
 if(key!==previous){
  previous=key;$('session-rest-result').textContent='';
  $('session-ritual-title').textContent=guide?'Ритуал · '+guide.ritualName:'Спокойный отдых';
  $('session-ritual-text').textContent=guide?guide.ritual:'Выберите призвание, чтобы увидеть его ритуал и пример хода. Отдыхать и снимать стресс можно и до выбора призвания.';
 }
 $('session-vocation-guide').textContent=name?'Ритуал и пример хода · '+name:'Ритуалы и примеры всех призваний';
 $('builder-vocation-guide').textContent=name?'Ритуал и пример хода · '+name:'Ритуалы и примеры всех призваний';
 $('session-rest-finish').disabled=busy||!window.KATAR_CHARACTERS?.isReady();
}
$('session-rest-finish').onclick=async()=>{
 if(busy||!window.KATAR_CHARACTERS?.isReady())return;
 const stress=$('stress-total');const before=Number(stress.value);
 if(!Number.isSafeInteger(before)||before<0){$('session-rest-result').textContent='Сначала укажите корректное целое значение стресса в листе.';return;}
 const label=$('session-rest-kind').value==='long'?'Длинный':'Короткий';
 if(!confirm(label+' отдых завершён? Его длительность определяет Мастер. Будет выполнен один бросок к6 для снятия стресса; ФЗ, МЗ и вдохновение не изменятся.'))return;
 const characterId=window.KATAR_CHARACTERS.activeId();
 busy=true;render();
 try{
  window.KATAR_PLAY_TOOLS.record();
  const die=1+Math.floor(Math.random()*6),after=Math.max(0,before-die);
  stress.value=String(after);stress.dispatchEvent(new Event('change',{bubbles:true}));
  window.KATAR_PLAY_TOOLS.record();const saved=await api.save(true);
  if(window.KATAR_CHARACTERS.activeId()===characterId)$('session-rest-result').textContent=label+' отдых: к6 = '+die+'. Стресс: '+before+' → '+after+'.'+(saved===false?' Не удалось сохранить в браузере: экспортируйте лист в JSON.':'');
 }catch(e){$('session-rest-result').textContent='Не удалось завершить запись отдыха. Проверьте стресс в листе и сохраните персонажа.';}
 finally{busy=false;render();}
};
$('vocation-select').addEventListener('change',render);
document.addEventListener('katarsis:active-character',render);
document.addEventListener('katarsis:restored',()=>{previous='';render();});
render();
})();
