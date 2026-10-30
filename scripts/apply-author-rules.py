"""One-time migration of the canonical standalone source; public export is separate."""
from pathlib import Path
from bs4 import BeautifulSoup
import re,json,shutil
root=Path(__file__).resolve().parents[2]
p=root/'КАТАРСИС.html'
text=p.read_text()
if 'id="author-rules-engine"' in text:raise SystemExit('Already migrated; edit the canonical source or engine explicitly.')
shutil.copyfile(p,'/tmp/katarsis-before-author-rules.html')
s=BeautifulSoup(text,'html.parser')
scripts=s.find_all('script')
fields=len(s.select('.sheet [contenteditable]'));pips=len(s.select('.sheet .pip'))
def frag(h):return BeautifulSoup(h,'html.parser')
def append(id,h):s.find(id=id).select_one('.sr-body').append(frag(h))
def replace(old,new):
 global s
 for n in list(s.find_all(string=True)):
  if old in n:n.replace_with(str(n).replace(old,new))
append('rules-start','<div class="sr-note"><b>Основная процедура.</b> Игрок объявляет, что хочет сделать; Мастер просит подходящую проверку: <b>к20 + применимый модификатор</b>. Для атаки используется навык, а не сырая характеристика. Особые процедуры, прямо описанные в ремесле или способности, сохраняются.</div>')
append('rules-attributes','<p>Характеристики определяют параметры персонажа и используются для спасбросков: <b>к20 + модификатор характеристики</b> по требованию Мастера. Они не заменяют навыки при обычной атаке.</p>')
replace('Таблица повторяет текущий лист персонажа. Она не назначает новую гранность кубиков или отдельную формулу общей проверки.','Проверка навыка: к20 + итоговое значение навыка из листа. Не прибавляйте связанную характеристику повторно: она уже учтена в значении навыка. Подходящий навык и необходимость проверки назначает Мастер после объявления действия.')
body=s.find(id='rules-skills').select_one('.sr-body')
body.insert(0,frag('''<section id="check-tools" class="rules-engine-controls sr-example"><h3>Бросок по листу персонажа</h3><p>Объявите действие и дождитесь назначения проверки Мастером. Значения берутся из электронного листа с учётом изучения навыка.</p><div class="author-controls"><label>Навык / спасбросок<select id="check-modifier"></select></label><label>Преимущество или помеха<select id="check-edge"><option value="plain">Обычный бросок</option><option value="plus1">Преимущество · 1-я степень (+к6)</option><option value="minus1">Помеха · 1-я степень (−к6)</option><option value="plus2">Преимущество · 2-я степень</option><option value="plus3">Преимущество · 3-я степень</option><option value="minus2">Помеха · 2-я степень</option><option value="minus3">Помеха · 3-я степень</option></select></label><label>КД цели · только для атаки<input id="check-ac" type="number" step="1" placeholder="Необязательно"/></label><button id="check-roll" class="portal-button primary" type="button">Бросить к20</button></div><p id="check-formula"></p><p id="check-result" role="status" aria-live="polite"></p><small>Для обычной проверки и спасброска успех определяет Мастер. Здесь не назначаются критические эффекты, урон или сложность проверки.</small></section>'''))
append('rules-repeats','<h3>Преимущество и помеха</h3><div class="sr-formula">Преимущество: к20 + модификатор + к6<br>Помеха: к20 + модификатор − к6</div><p>У преимущества и помехи по три степени. Обычно встречается первая; вторую и третью получить сложнее. Формулы выше описывают обычную первую степень. Формула 2-й и 3-й степеней ещё не уточнена; дополнительные к6 не назначены автоматически. Порядок совместного применения нескольких источников также не придуман.</p>')
replace('Способ броска с помехой и универсальная классификация всех действий здесь не назначены. Формула «бросьте два к20» не добавлена.','Вторая однотипная проверка получает помеху: из к20 + модификатор вычитается к6. Это не выбор худшего из двух к20. Спорную однотипность определяет Мастер.')
replace('Бросьте кубик применимой характеристики по принятому правилу атаки.','По требованию Мастера бросьте к20 + подходящий навык (например, Фехтование, Ближний бой или Стрельба). При преимуществе добавьте к6; при помехе вычтите к6.')
replace('В боевой памятке перечислены Сила, Ловкость, Магия, Проклятие и Удача. Подходящая характеристика определяется применяемой атакой. Здесь не добавляются к20, новый бонус попадания или новая связь модификатора с гранностью кубика.','Атака — проверка соответствующего навыка. Используйте его итоговое значение из листа, не добавляя характеристику второй раз. Для необычного оружия, метания и магических атак подходящий навык выбирает Мастер по описанию способности. Указанная в карточке кость урона не является костью попадания.')
replace('Брось кубик применимой характеристики:','Брось к20 + подходящий навык:')
replace('Сила · Ловкость · Магия · Проклятие · Удача','Фехтование · Ближний бой · Стрельба · иной навык по ситуации')
replace('Кость и подходящую характеристику выбирайте по применяемой атаке. Округление половины урона уточните с Мастером.','Преимущество: +к6; помеха: −к6 (обычно 1-я степень). Навык назначает Мастер. Округление половины урона уточни с ним.')
append('rules-recovery','''<section id="rules-stress"><h3>Стресс, Воля и сосредоточение</h3><p>Храбрость — это навык <b>Воля</b>. При <b>10 и более стресса</b> совершается проверка <b>к20 + Воля</b>. При провале текущее <b>Ментальное здоровье становится 1</b>; это не потеря одной единицы и не изменение максимума.</p><p>Вместо проверки можно потратить <b>одно действие на сосредоточение</b> и закрасить один череп в струнах души.</p><ul><li>Правый череп: значение этой струны <b>не может опуститься ниже 6</b>.</li><li>Левый череп: значение этой струны <b>не может превысить 5</b>.</li><li>Оба черепа одной струны закрасить нельзя.</li></ul><p>Стресс не сбрасывается автоматически ни проверкой, ни сосредоточением: такого эффекта не установлено. Сложность назначает Мастер. Порядок снятия черепов и спорное время проверки вне своего хода требуют уточнения.</p><div class="sr-note">Электронный лист блокирует выход за пределы отмеченного черепа. При отметке черепа несовместимое текущее значение приводится к границе (5 либо 6); это нормализация записи, а не дополнительное правило получения или потери стресса.</div></section>''')
# Real sheet controls; no new editable fields or pips, preserving positional saves.
s.select_one('.soul-card').append(frag('''<details class="rules-engine-controls soul-rules"><summary>Воля, стресс и черепа</summary><p>Правый череп: минимум 6. Левый: максимум 5. Оба в одной струне недопустимы. Нажатия на шкалы редактируют лист; действие учитывайте вручную.</p><div class="author-controls"><label>Точный стресс (включая 10+)<input id="stress-total" type="number" min="0" step="1" value="0"/></label></div><p id="stress-state" role="status"></p><p id="stress-will"></p><div class="author-controls"><button type="button" class="portal-button" id="stress-roll-will">Перейти к броску Воли</button><button type="button" class="portal-button" id="stress-success">Проверка успешна</button><button type="button" class="portal-button" id="stress-fail">Провал: МЗ = 1</button></div><h4>Вместо проверки: сосредоточение</h4><div class="author-controls"><label>Струна<select id="focus-string"><option value="0">Вина</option><option value="1">Жестокость</option><option value="2">Тоска</option><option value="3">Вера</option></select></label><label>Череп<select id="focus-side"><option value="0">Левый · максимум 5</option><option value="1">Правый · минимум 6</option></select></label><button type="button" class="portal-button" id="stress-focus">Сосредоточиться · 1 действие</button></div><p id="stress-outcome" role="status" aria-live="polite"></p><p id="soul-rules-status" role="status" aria-live="polite"></p><small>Стресс и МЗ не сбрасываются при сосредоточении. Снятие отметки нажатием — только исправление записи, не игровое восстановление.</small></details>'''))
# Numeric/mark behavior moves into the new rules engine, keeping image upload unchanged.
scripts[3].string=(scripts[3].string or '')[(scripts[3].string or '').index('(function () {'):]
# Restore after all positional pip values have been applied; old saves infer stress from pips.
portal=scripts[13];t=portal.string
anchor="[...document.querySelectorAll('.sheet .pip')].forEach((p,i)=>p.classList.toggle('on',!!data.pips?.[i]));"
assert anchor in t
t=t.replace(anchor,anchor+'\n if(hooks.rulesV2)hooks.rulesV2.set(data.modules.rulesV2||{});')
portal.string=t
engine=s.new_tag('script',id='author-rules-engine');engine.string=(root/'katarsis-site/scripts/rules-mechanics.js').read_text();portal.insert_before(engine)
# FAQs and the open-questions list must not contradict the clarified rules.
replace('Нет. К6 здесь задаёт только случайное стартовое распределение. Гранность атаки не выводится из этой процедуры.','Нет. Для попадания бросают к20 + соответствующий навык. К6 используется при случайном создании характеристик, для преимущества / помехи и там, где прямо указан описанием.')
replace('общая процедура проверок, применяемые кубики и назначение сложности;','назначение сложности проверок в конкретных ситуациях; базовая процедура к20 + модификатор уже определена;')
replace('механический способ броска с помехой и возможные преимущества;','формулы 2-й и 3-й степеней преимущества / помехи и порядок совместного применения источников; первая степень уже определена как +к6 / −к6;')
replace('получение вдохновения и общий порядок изменения стресса;','получение вдохновения, получение / снятие стресса, снятие черепов и спорное время проверки Воли вне хода; порог 10+, провал до МЗ 1 и сосредоточение уже определены;')
# Update ability data only: do not globally turn narrative uses of 'nearby' into mechanics.
for sc in scripts:
 t=sc.string or ''
 if 'const OMEN_DATA =' not in t:continue
 t=re.sub(r'\bрядом\b','в пределах 1 метра',t,flags=re.I)
 t=t.replace('проверкам храбрости','проверкам Воли').replace('проверки храбрости','проверки Воли').replace('проверках храбрости','проверках Воли')
 t=t.replace('Допустимую дистанцию определяет Мастер или полные правила позиции.','Дистанция этого эффекта — в пределах 1 метра.')
 old='Использование Мудрости вместо Удачи при Срыве. Преимущество союзнику на проверку Стресса.\\n\\nПассивная часть меняет характеристику вашей проверки Срыва. Отдельная реакция с ценой во вдохновении помогает союзнику на его проверке, а не заменяет её автоматическим успехом.'
 new='Преимущество союзнику на проверку Воли при стрессе (реакция + 2 вдохновения).\\n\\nОплатите реакцию и вдохновение: союзник получает преимущество на проверку Воли, а не автоматический успех. Пассивная замена «Мудрость вместо Удачи при Срыве» требует авторского уточнения: общее правило теперь использует Волю. Новая пассивная выгода вместо неё не назначена.'
 assert old in t;t=t.replace(old,new)
 old='Бросок Проклятия вместо Удачи. Успех — перенос стресса на врага. Провал — постоянное проклятие (метка).\\n\\nПри Срыве замените Удачу Проклятием и разрешите проверку. Успех переносит стресс на врага; при провале Мастер определяет постоянную метку проклятия.'
 new='Требует авторского уточнения после перехода общей проверки стресса на Волю.\\n\\nПрежний эффект: Проклятие вместо Удачи при Срыве; успех переносит стресс на врага, провал даёт постоянную метку проклятия. Эти условия сохранены как спорное описание, а не действующая замена Воли. Новая механика умения не придумана; перед применением согласуйте её с Мастером.'
 assert old in t;t=t.replace(old,new);sc.string=t
# GM attack descriptions now identify skills, never raw attributes as the attack die.
data=json.loads(s.find(id='bestiary-data').string)
for d in data:
 for a in d['attacks']:
  if a['name']=='Зажигательная бутылка':a['skill']=None;a['attribute']='к20 + навык метания по выбору Мастера'
  else:
   skill='Ближний бой' if a.get('attribute')=='Сила' else 'Стрельба' if re.search('пушк|пистолет|револьвер|руж|обрез|винтовк|Выстрел',a['name'],re.I) else 'Фехтование'
   a['skill']=skill;v=d['skills'].get(skill)
   a['attribute']='к20 + '+skill+(' ('+('+' if v>=0 else '')+str(v)+')' if v is not None else ' (значение уточняет Мастер)')
 for a in d['abilities']+d['attacks']:
  a['text']=re.sub(r'\bрядом\b','в пределах 1 метра',a['text'],flags=re.I)
 d['tags']=d.get('tags',[])
s.find(id='bestiary-data').string=json.dumps(data,ensure_ascii=False,separators=(',',':'))
be=s.find(id='bestiary-workspace');t=be.string
old='Атака: кубик указанной характеристики по вашим правилам. Здесь не введены к20 или дополнительный бонус попадания.'
t=t.replace(old,'Атака: к20 + соответствующий навык; преимущество +к6, помеха −к6 (1-я степень). Характеристику повторно не прибавляйте.')
t=t.replace('Кость атаки — по вашим правилам указанной характеристики, без добавленного к20.','Атака — к20 + соответствующий навык. Преимущество +к6, помеха −к6 (1-я степень).')
t=t.replace('d.description,d.gear,','d.description,d.gear,...(d.tags||[]),')
t=t.replace("role=$('be-role').value,grid=", "role=$('be-role').value,tag=$('be-tag').value,grid=")
t=t.replace('&&(!role||d.role===role));','&&(!role||d.role===role)&&(!tag||(d.tags||[]).includes(tag)));')
t=t.replace("['be-search','be-region','be-role']", "['be-search','be-region','be-role','be-tag']")
t=t.replace("$('be-role').value='';render();", "$('be-role').value='';$('be-tag').value='';render();")
t=t.replace("el('p',d.description),metrics(d)", "el('p',d.description),el('p','Теги: '+((d.tags||[]).join(', ')||'не назначены')),metrics(d)")
# Include the attack roll when copying a statblock into the GM scene.
t=t.replace("a.name+' · '+a.cost+(a.damage?", "a.name+' · '+a.cost+(a.attribute?' · '+a.attribute:'')+(a.damage?")
be.string=t
s.find(id='be-role').parent.insert_after(frag('<label>Тег<select id="be-tag"><option value="">Все теги</option><option value="Зверь">Зверь</option></select></label>'))
gm=s.find(id='gm-digital-workspace');gm.string=gm.string.replace("a.name+' · '+a.cost+(a.damage?", "a.name+' · '+a.cost+(a.attribute?' · '+a.attribute:'')+(a.damage?")
append('rules-attack','<div class="sr-note">Формулировка «преимущество против зверей» сохраняется. Для будущих существ предусмотрен тег <b>Зверь</b>; текущим НПС он автоматически не назначен. Это не новая классификация всего бестиария.</div>')
# The illustrated fixed-result encounter remains illustrative, but no longer denies d6 disadvantage.
sk=s.find(id='combat-skirmish-data');d=json.loads(sk.string)
for f in d['frames']:
 f['lesson']=f['lesson'].replace('Способ броска с помехой здесь не назначается: показан его готовый результат.','Помеха первой степени вычитает к6 из к20 + навык. В примере показан уже итоговый результат.').replace('Счётчик повторов считается в пределах хода и не добавляет отдельную кость к результату.','Счётчик повторов считается в пределах хода: вторая атака получает −к6, третья автоматически проваливается.')
 for r in f['rows']:r[1]=r[1].replace('Тот рядом, в пределах 6 м.','Тот в пределах 6 м.')
 if f.get('active'):f['lesson']+=' Броски попадания — к20 + соответствующий навык; при помехе −к6. Указанные результаты уже включают модификаторы.'
sk.string=json.dumps(d,ensure_ascii=False,separators=(',',':'))
style=s.new_tag('style',id='author-rules-style');style.string='''.author-controls{display:flex;flex-wrap:wrap;gap:12px;align-items:end}.author-controls label{display:flex;flex-direction:column;gap:5px;flex:1 1 180px;min-width:0}.author-controls input,.author-controls select{width:100%;min-width:0;padding:9px;border:1px solid #b9a98d;border-radius:7px;background:#fffaf1;color:#45354d;font:inherit}.author-controls button{white-space:normal;max-width:100%}.soul-rules{padding:10px;margin-top:10px;border:1px solid #cbbb9c;border-radius:8px;font-size:13px;line-height:1.5}.soul-rules summary{cursor:pointer;font-weight:600}.soul-rules h4{margin:14px 0 8px}.soulbar .pip[aria-disabled="true"]{opacity:.42;cursor:not-allowed}#check-result{font-weight:600;overflow-wrap:anywhere}#stress-outcome,#soul-rules-status{overflow-wrap:anywhere}@media print{.rules-engine-controls{display:none!important}}''';s.head.append(style)
assert fields==len(s.select('.sheet [contenteditable]'))
assert pips==len(s.select('.sheet .pip'))
p.write_text(str(s))
print('Updated canonical source; preserved',fields,'editable fields and',pips,'pips.')
