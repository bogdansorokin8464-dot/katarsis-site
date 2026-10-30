"""Synchronize approved vocations, rest rules and per-vocation guides in canonical HTML.
Run from any directory, then run update-from-html.py. Idempotent.
"""
from pathlib import Path
from bs4 import BeautifulSoup
import json, html
site=Path(__file__).resolve().parents[1];root=site.parent
source=root/'КАТАРСИС.html';s=BeautifulSoup(source.read_text(),'html.parser')
script=next(t for t in s.select('script') if 'const VOCATION_DATA = ' in (t.string or ''))
t=script.string;start=t.index('const VOCATION_DATA = ')+len('const VOCATION_DATA = ')
data,length=json.JSONDecoder().raw_decode(t[start:])
updates=json.loads((site/'scripts/reworked-vocations.json').read_text());guides=json.loads((site/'scripts/vocation-guides.json').read_text())
assert set(data)==set(guides)
for name,v in updates.items():data[name].update(v)
for name,g in guides.items():
 assert len(g['actions'])==3 and len(g['chosen'])==2
 assert all(a in [x[0] for x in data[name]['skills']] for a in g['chosen']),(name,g['chosen'])
 data[name]['guide']=g
t=t[:start]+json.dumps(data,ensure_ascii=False)+t[start+length:]
t=t.replace('function card(skill,source) {','function card(skill,source,printText=\'\') {')
if "const compact=document.createElement('p')" not in t:t=t.replace('article.append(tag,title,cost,text);return article;',"if(printText){text.className='ability-screen-text';const compact=document.createElement('p');compact.className='ability-print-text';compact.textContent=printText;article.append(tag,title,cost,text,compact);}else article.append(tag,title,cost,text);return article;")
t=t.replace("card(info.key,'Ключ призвания · '+vocation)","card(info.key,'Ключ призвания · '+vocation,info.printKey)")
script.string=t
# Keep editable personal notes without presenting settled parameters as missing rules.
custom=next(sc for sc in s.select('script') if "const records=new Map();let active=[];" in (sc.string or ''))
ct=custom.string
ct=ct.replace("case 'Щитоносец':sections=", "case 'Щитоносец':intro='Стойки и условия павезы заданы в ключе. Эти поля предназначены для личных заметок и согласованных изменений; они не меняют расчёт КД автоматически.';sections=")
ct=ct.replace("case 'Кудесник':sections=", "case 'Кудесник':intro='Радиус, срок, цена и три режима Разлома заданы в ключе. Здесь можно сохранить личные заметки и согласованные изменения, не заменяя ими основные правила.';sections=")
ct=ct.replace('Что означает размер 2 м, где появляется зона и как долго существует.','Личные заметки о зоне. По ключу: радиус 2 м, видимая точка до 10 м, до начала следующего хода; продление — одно действие.')
custom.string=ct
def fragment(h):return BeautifulSoup(h,'html.parser')
def replace_id(ident,h,parent=None):
 old=s.find(id=ident)
 if old:old.replace_with(fragment(h))
 else:parent.append(fragment(h))
def e(v):return html.escape(v)
# Explicit rules; preserve the existing camp calculator and stress/soul chapter.
body=s.select_one('#rules-recovery > .sr-body');camp=body.find(id='camp-rest-rules').extract();stress=body.find(id='rules-stress').extract();body.clear()
body.append(fragment('''<p>Оплачивайте все части стоимости умения: действие, вдохновение, стресс и другие прямо указанные ресурсы.</p>
<section id="rules-rest"><h3>Короткий и длинный отдых</h3><div class="sr-formula">Длительность обоих видов отдыха определяет Мастер · за завершённый отдых снимите 1к6 стресса</div>
<p><b>Короткий отдых</b> — передышка, чтобы перевести дух и выполнить спокойный ритуал призвания. <b>Длинный отдых</b> — более основательный отдых и восстановление сил. Число минут или часов для каждого вида назначает Мастер по обстановке; фиксированной длительности нет.</p>
<p>По завершении любого из этих видов отдыха бросьте <b>один к6</b> и уменьшите свой стресс на выпавшее значение, но не ниже нуля. Например: стресс 8, выпало 5 — остаётся 3; стресс 2, выпало 6 — остаётся 0.</p>
<p>У каждого призвания есть свой ритуал: уход за снаряжением, молитва, спокойная работа руками или другой подходящий способ прийти в себя. Достаточно кратко описать его во время отдыха. Это форма обычного снятия стресса, а не второй источник к6. Несколько ритуалов за один отдых не дают дополнительных бросков.</p>
<p>Отдельные способности, прямо снимающие стресс или восстанавливающие другие ресурсы, сохраняют свою стоимость, условия и эффект. Обычный ритуал не заменяет «Исповедь», «Дисциплину» и другие выбранные умения. Отдых сам по себе не снимает отмеченные черепа в струнах души.</p>
<p>Эта процедура не назначает автоматическое восстановление ФЗ, МЗ или вдохновения. Для них применяются описания способностей и отдельные правила, согласованные с Мастером. Прерванную передышку не записывайте как завершённый отдых.</p></section>
<h3>Пример: «Глоток эфира» Кудесника</h3><div class="sr-formula">1 действие + 1 вдохновение → восстановить 1к6 МЗ, не выше максимума</div><div class="sr-example"><p>МЗ 6 из 11, выпало 4: становится 10 из 11.</p><p>МЗ 10 из 11, выпало 5: становится 11 из 11, а не 15. Максимум не увеличивается.</p></div>
<p>Дополнительные эффекты во время отдыха применяются только по описанию конкретного умения. Если способность запрещена при стрессе выше 5, значение 6 уже не удовлетворяет условию.</p>'''))
camp.find('p').string='Базовую длительность короткого и длинного отдыха назначает Мастер. Развёрнутый подходящий лагерь уменьшает только назначенное время и не меняет обычное снятие 1к6 стресса за завершённый отдых.'
body.append(camp);body.append(stress)
for option in s.select('#camp-rest option'):
 if option.get('value')=='long':option.string='Длинный'
# Chase: compare speed, not a new dice subsystem.
replace_id('rules-chase','''<section id="rules-chase"><h3>Погоня</h3><div class="sr-formula">Сравните актуальную скорость участников в метрах</div><p>Если скорость преследователя выше, он догоняет убегающего. Если скорость убегающего выше, он отрывается от преследователя. Отдельного броска погони нет.</p><p>Используйте скорость с уже действующими бонусами и штрафами. Не подменяйте её суммой метров за три действия. При равной скорости преимущество по этому правилу не получает никто; исход по обстановке определяет Мастер.</p><div class="sr-example"><p>Преследователь — 20 м, убегающий — 10 м: преследователь догоняет.</p><p>Преследователь — 10 м, убегающий — 20 м: убегающий отрывается.</p></div><p>Мгновенное перемещение от способности не считается постоянной прибавкой к скорости. Преграды и возможность продолжать преследование определяются самой сценой, а не дополнительной таблицей погони.</p></section>''',s.select_one('#rules-movement > .sr-body'))
# Vocation examples and rituals, complete and independently accessible as one rule chapter.
cards=[]
for i,(name,d) in enumerate(data.items()):
 g=guides[name];role=d.get('role','')
 cards.append(f'''<details class="vocation-guide" id="vocation-guide-{i}" data-vocation="{e(name)}"><summary><h3>{e(name)}</h3><span>{e(g['ritualName'])}</span></summary><div class="vocation-guide-body">{('<p class="vocation-role">'+e(role)+'</p>') if role else ''}<h4>Ритуал · {e(g['ritualName'])}</h4><p>{e(g['ritual'])}</p><p class="vocation-guide-caption">Во время короткого или длинного отдыха. Один обычный к6 снятия стресса за завершённый отдых, без дополнительного броска за ритуал.</p><h4>Пример хода</h4><p><b>Выбранные умения:</b> {e(' и '.join(g['chosen']))}.</p><ol class="vocation-actions">{''.join('<li>'+e(a)+'</li>' for a in g['actions'])}</ol><p><b>Реакция:</b> {e(g['reaction'])}</p><p class="vocation-guide-caption">{e(g['note'])}</p></div></details>''')
chapter='''<details class="system-rule-chapter" id="rules-vocations"><summary><h2><small>18 / ПРИЗВАНИЕ В ИГРЕ</small>Ритуалы отдыха и примеры ходов</h2></summary><div class="sr-body"><p>У каждого призвания — свой способ прийти в себя и свой пример применения трёх действий. Пример не выдаёт дополнительные умения: в начале указана выбранная пара. Ключ доступен автоматически.</p><p>Реакция используется только по условию конкретной способности, а не как четвёртое действие. Если в выбранном наборе нет подходящего приёма, сохранять реакцию не означает получать бесплатную атаку. Стоимость предметов и длительных задач берётся из их описаний; речь в бою занимает действие. Повторные однотипные проверки подчиняются общему правилу повторов.</p><div class="vocation-guides-grid">'''+''.join(cards)+'''</div></div></details>'''
replace_id('rules-vocations',chapter,s.select_one('#view-rules .system-rules-book'))
chapter_node=s.find(id='rules-vocations').extract();s.find(id='rules-open').insert_before(chapter_node)
chapter_node.select_one('summary small').string='17 / ПРИЗВАНИЕ В ИГРЕ'
s.select_one('#rules-open summary small').string='18 / ГРАНИЦЫ СПРАВОЧНИКА'
s.select_one('#view-rules .sr-controls span').string='18 глав · 26 призваний · 31 навык'
s.select_one('#view-rules .sr-status p').string='Основные формулы, порядок действий и примеры собраны из действующих правил и листа. Неуточнённые механики перечислены в главе «Что ещё нужно закрепить».'
nav=s.select_one('#view-rules .system-rules-index')
for target,label in [('rules-rest','Короткий и длинный отдых'),('rules-chase','Погоня по скорости'),('rules-vocations','Ритуалы и примеры ходов')]:
 if not nav.find('a',href='#'+target):
  a=s.new_tag('a',href='#'+target);a.string=label;nav.find('a',href='#rules-open').insert_before(a)
# Update unresolved-rule list without inventing healing or inspiration rules.
for li in s.select('#rules-open > .sr-body > ul > li'):
 text=li.get_text(' ',strip=True)
 if text.startswith('отдых:'):li.string='восстановление ФЗ, МЗ и вдохновения без способностей; длительность короткого и длинного отдыха назначает Мастер, снятие 1к6 стресса за завершённый отдых уже определено;'
 if text.startswith('получение вдохновения,'):li.string='получение вдохновения, источники получения стресса, снятие черепов и спорное время проверки Воли вне хода; снятие 1к6 стресса за отдых, порог 10+, провал до МЗ 1 и сосредоточение уже определены;'
# Quick access from builder and play screen; never add printable character fields.
replace_id('builder-vocation-guide','<button type="button" class="portal-button vocation-guide-link" id="builder-vocation-guide">Ритуалы и примеры всех призваний</button>',s.find(id='vocation-status').parent)
replace_id('session-rest-tools','''<section class="play-section" id="session-rest-tools"><h2>Отдых и ритуал</h2><h3 id="session-ritual-title">Спокойный отдых</h3><p id="session-ritual-text"></p><p class="play-cost">Длительность определяет Мастер. Один к6 снятия стресса за завершённый отдых, не ниже нуля. Ритуал не добавляет второй бросок.</p><div class="rest-controls"><label for="session-rest-kind">Вид отдыха<select id="session-rest-kind"><option value="short">Короткий</option><option value="long">Длинный</option></select></label><button type="button" class="portal-button gold" id="session-rest-finish">Завершить отдых · −1к6 стресса</button></div><p id="session-rest-result" role="status" aria-live="polite"></p><button type="button" class="portal-button" id="session-vocation-guide">Ритуалы и примеры всех призваний</button></section>''',s.find(id='view-session'))
rest_node=s.find(id='session-rest-tools').extract()
s.find(id='session-weapons').find_parent('section').insert_before(rest_node)
css='''.ability-print-text{display:none!important}@media print{#chosen-skills .ability-screen-text{display:none!important}#chosen-skills .ability-print-text{display:block!important;font-size:6.6pt;line-height:1.3;margin-top:2mm}}@media screen{.vocation-guides-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}.vocation-guide{border:1px solid var(--portal-line,#d9cbb9);border-radius:14px;background:rgba(255,255,255,.45);min-width:0;scroll-margin-top:90px}.vocation-guide>summary{padding:16px;cursor:pointer;list-style:none;display:flex;flex-direction:column;gap:4px}.vocation-guide>summary h3{margin:0;font-size:21px}.vocation-guide>summary span,.vocation-guide-caption{font-size:13px;color:#6d625d}.vocation-guide>summary:after{content:'Развернуть +';font-size:12px;color:#69516c}.vocation-guide[open]>summary:after{content:'Свернуть −'}.vocation-guide-body{padding:0 16px 16px;overflow-wrap:anywhere}.vocation-guide-body h4{margin:18px 0 8px}.vocation-actions{padding-left:24px}.vocation-actions li{padding-left:3px;margin:0 0 12px}.vocation-guide-link{margin-top:12px}#session-rest-tools>p{line-height:1.65}.rest-controls{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.rest-controls label{display:grid;gap:6px;font-size:13px}.rest-controls select{font:inherit;padding:11px;border:1px solid #d9cbb9;border-radius:8px;background:#fffdf8;color:#302734}#session-rest-result:empty{display:none}#session-rest-result{padding:12px;border-radius:10px;background:#eee5d5}#session-vocation-guide{margin-top:12px;white-space:normal;text-align:left}.vocation-role{font-style:italic}@media(max-width:800px){.vocation-guides-grid{grid-template-columns:1fr}.rest-controls{align-items:stretch;flex-direction:column}.rest-controls .portal-button{white-space:normal;text-align:center}}}@media print{#builder-vocation-guide,#session-rest-tools{display:none!important}}'''
old=s.find(id='vocation-guides-style')
if old:old.string=css
else:
 st=s.new_tag('style',id='vocation-guides-style');st.string=css;s.head.append(st)
js=(site/'scripts/rest-and-guides.js').read_text();old=s.find(id='rest-and-guides-script')
if old:old.string=js
else:
 sc=s.new_tag('script',id='rest-and-guides-script');sc.string=js;s.body.append(sc)
# Keep favorites of the replaced shield abilities, using stable-name aliases.
p=site/'scripts/play-tools.js';tools=p.read_text()
old="data.favorites.filter(k=>typeof k==='string'&&catalog.has(k)).slice(0,1000)"
new="data.favorites.filter(k=>typeof k==='string').map(k=>k===keyFor('vocation','Щитоносец','Тяжеловес')?keyFor('vocation','Щитоносец','Плечом к плечу'):k===keyFor('vocation','Щитоносец','Неистовство')?keyFor('vocation','Щитоносец','Стой за мной'):k).filter(k=>catalog.has(k)).slice(0,1000)"
tools=tools.replace(old,new).replace("original.querySelectorAll('p')","original.querySelectorAll('p:not(.ability-print-text)')");p.write_text(tools);s.find(id='play-tools-script').string=tools
assert len(s.select('.sheet [contenteditable]'))==194
source.write_text(str(s))
print('Updated two vocations; guides:',len(guides),'; printable character fields unchanged.')
