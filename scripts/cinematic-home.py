"""Apply the cinematic landing on top of the existing, working public site. Idempotent."""
from pathlib import Path
from bs4 import BeautifulSoup
import json,math
site=Path(__file__).resolve().parents[1];web=site/'web';root=site
s=BeautifulSoup((web/'index.html').read_text(),'html.parser')
hero='/assets/16f3a3680ec6b991aa1b5d80.webp'
particles=''.join(f'<i style="--x:{31+(i*19)%66}%;--y:{15+(i*13)%65}%;--delay:{-i*.71}s;--duration:{5+i%5}s"></i>' for i in range(18))
html=f'''<section class="home-hero scene-hero" aria-labelledby="hero-title" data-tilt-scene><div class="scene-image" aria-hidden="true"><img src="{hero}" alt="" width="1456" height="720" fetchpriority="high"></div><div class="scene-sky" aria-hidden="true"><svg viewBox="0 0 600 600" fill="none"><circle class="sky-orbit" cx="300" cy="300" r="224"/><circle class="sky-orbit orbit-inner" cx="300" cy="300" r="172"/><path class="sky-path" d="M300 76 458 142 524 300 458 458 300 524 142 458 76 300 142 142Z"/><path d="M300 64v24M288 76h24M524 288v24M512 300h24M300 512v24M288 524h24M76 288v24M64 300h24"/></svg></div><div class="scene-dust" aria-hidden="true">{particles}</div><div class="hero-copy scene-copy"><div class="scene-kicker"><span></span>Настольная ролевая система</div><h1 id="hero-title">КАТАРСИС</h1><p class="scene-tagline">Всё начинается<br>с твоего выбора.</p><p class="scene-description">Мир единого Света, опасных дорог и чужих тайн. Создай героя. Собери партию. Оставь свою историю.</p><a class="button scene-button" href="/play/#builder">Создать персонажа <span aria-hidden="true">↗</span></a><div class="hero-proof">Без регистрации. Персонаж остаётся в твоём браузере.</div></div><div class="scene-bottom"><a href="#omen-stage" class="scene-discover"><span class="discover-line" aria-hidden="true"></span>Найти своё знамение <span aria-hidden="true">↓</span></a><a href="/play/#sheet" class="scene-return">Продолжить свою историю ↗</a></div></section>'''
s.select_one('.home-hero').replace_with(BeautifulSoup(html,'html.parser'))
for x in s.select('.proof-stat strong'):x['data-count']=x.get_text()
source=BeautifulSoup((root/'КАТАРСИС.html').read_text(),'html.parser')
sc=next(x.string for x in source.select('script') if 'const OMEN_DATA = ' in (x.string or ''))
pos=sc.index('const OMEN_DATA = ')+len('const OMEN_DATA = ');omens,_=json.JSONDecoder().raw_decode(sc[pos:])
flavors={
'Сила':('Оставь след.','Держать удар, раздвигать преграды и стоять там, где другие отступают.'),
'Ловкость':('Будь на шаг впереди.','Поймать момент, найти узкий проход и изменить исход одним движением.'),
'Харизма':('Пусть тебя услышат.','Слово может открыть дверь, которую не возьмёт ни один клинок.'),
'Интеллект':('Заметь то, что скрыто.','Связывать факты, находить закономерности и задавать неудобные вопросы.'),
'Мудрость':('Смотри глубже.','Слышать за словами, замечать опасность и понимать цену решения.'),
'Удача':('Доверься случаю.','Дорога не всегда ведёт туда, куда ты собирался. Иногда это к лучшему.'),
'Проклятие':('Прими свою тень.','Не всякая сила приходит без последствий. Не всякая тень принадлежит врагу.'),
'Магия':('Коснись невозможного.','У привычного мира есть границы. Ты способен почувствовать, где они тоньше.')}
buttons=[];data={}
for i,(name,d) in enumerate(omens.items()):
 a=math.radians(i*45-90);x=50+38*math.cos(a);y=50+38*math.sin(a)
 buttons.append(f'''<button type="button" class="omen-point{' is-selected' if i==0 else ''}" data-omen="{name}" aria-pressed="{'true' if i==0 else 'false'}" style="--px:{x:.2f}%;--py:{y:.2f}%"><span class="omen-point-mark" aria-hidden="true">✦</span><span>{name}</span></button>''')
 data[name]={'index':i+1,'title':flavors[name][0],'text':flavors[name][1],'bonus':d['bonus'],'skills':[x[0] for x in d['skills'][:3]]}
first=next(iter(data));d=data[first]
stage='''<section class="home-section omen-stage" id="omen-stage" aria-labelledby="omens-title"><div class="section-head reveal"><div><div class="eyebrow">Восемь знамений · восемь начал</div><h2 id="omens-title">С чего начнётся<br>твоя история?</h2></div><p class="omen-instruction">Коснись знамения.<br>У каждого свой характер.</p></div><div class="omen-experience"><div class="omen-orbit" aria-label="Выбор знамения для знакомства"><svg class="omen-orbit-lines" viewBox="0 0 500 500" aria-hidden="true"><circle cx="250" cy="250" r="190"/><circle cx="250" cy="250" r="135"/><path d="M250 60 384 116 440 250 384 384 250 440 116 384 60 250 116 116Z"/></svg><div class="omen-center" aria-hidden="true"><svg viewBox="0 0 100 100"><path d="m50 5 9 35 36 10-36 9-9 36-10-36L5 50l35-10Z"/><path d="M20 20 29 29M80 20 71 29M20 80 29 71M80 80 71 71"/></svg></div>'''+''.join(buttons)+f'''</div><article class="omen-story" aria-live="polite" aria-atomic="true"><div class="eyebrow" id="omen-index">01 / 08 · Знамение</div><h3 id="omen-name">{first}</h3><p class="omen-story-title" id="omen-title">{d['title']}</p><p id="omen-description">{d['text']}</p><div class="omen-bonus"><span>Особенность знамения</span><p id="omen-bonus">{d['bonus']}</p></div><div class="omen-skill-list" id="omen-skills">{''.join('<span>'+x+'</span>' for x in d['skills'])}</div><a class="text-link" href="/play/#builder">Перейти к конструктору <span aria-hidden="true">↗</span></a><p class="omen-disclaimer">Знамение персонажа выбирается в конструкторе.</p></article></div></section>'''
old=s.find(id='omen-stage')
if old:old.replace_with(BeautifulSoup(stage,'html.parser'))
else:s.select_one('.proof-strip').insert_after(BeautifulSoup(stage,'html.parser'))
kit='''<section class="home-section tactile-section" id="tactile" aria-labelledby="tactile-title"><div class="section-head reveal"><div><div class="eyebrow">По ту сторону экрана</div><h2 id="tactile-title">Мир, который хочется<br>взять в руки.</h2></div><p class="tactile-caption">Концепты аксессуаров Катарсиса.<br>Тот же характер. Другая форма.</p></div><div class="tactile-grid"><figure class="tactile-box reveal" data-tilt-card><img src="/assets/521696a96b610e4a4f824f5b.webp" alt="Концепт светлой коробки Катарсиса с монолитом" width="1100" height="733" loading="lazy"><figcaption><span>01 / Коробочное издание</span><span>Катарсис</span></figcaption></figure><figure class="tactile-dice reveal" data-tilt-card><img src="/assets/8e7b22fb6a4d63c789f6219f.webp" alt="Концепт семи молочных игровых костей со сливовыми и золотыми деталями" width="1024" height="1024" loading="lazy"><figcaption><span>02 / Семь многогранников</span><span>Случай в твоих руках</span></figcaption></figure></div><p class="tactile-note">Изображения показывают дизайн аксессуаров, а не товары в продаже.</p></section>'''
old=s.find(id='tactile')
if old:old.replace_with(BeautifulSoup(kit,'html.parser'))
else:s.select_one('.faq-layout').insert_before(BeautifulSoup(kit,'html.parser'))
# A deliberate separator rather than another stack of cards.
for el in s.select('.feature-note,.directory-link,.faq-item'):el['data-motion-item']=''
nav=s.find(id='main-nav')
if not nav.find('a',href='#omen-stage'):
 a=s.new_tag('a',href='#omen-stage');a.string='Знамения';nav.insert(0,a)
for p in s.select('link[rel="preload"][as="image"]'):p['href']=hero
s.find('meta',property='og:image')['content']=hero
if not s.find('link',href='/cinematic.css'):
 l=s.new_tag('link',rel='stylesheet',href='/cinematic.css');s.head.append(l)
sc=s.find(id='omen-preview-data')
if not sc:sc=s.new_tag('script',id='omen-preview-data',type='application/json');s.body.append(sc)
sc.string=json.dumps(data,ensure_ascii=False)
if not s.find('script',src='/cinematic.js'):
 sc=s.new_tag('script',src='/cinematic.js',defer='');s.body.append(sc)
if not s.find(attrs={'data-motion-toggle':True}):
 b=s.new_tag('button',type='button',attrs={'class':'motion-toggle','data-motion-toggle':'','aria-pressed':'false'});b.string='Анимации: включены';s.select_one('.footer').append(b)
(web/'index.html').write_text(str(s));print('Cinematic hero, eight interactive omens, tactile designs and motion controls installed.')
