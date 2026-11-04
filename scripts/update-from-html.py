from pathlib import Path
from bs4 import BeautifulSoup
import hashlib,re,base64,json,shutil
root=Path(__file__).resolve().parents[1];site=root;web=site/'web';source=(root/'КАТАРСИС.html').read_text();s=BeautifulSoup(source,'html.parser')
# Physically exclude GM data and tools from the public document.
for ident in ['view-gm','view-bestiary','gm-digital-workspace','bestiary-workspace','gm-encounter-data','bestiary-data']:
 el=s.find(id=ident)
 if el:el.decompose()
for el in s.select('[data-view="gm"],[data-view="bestiary"],[data-go="gm"],[data-go="bestiary"]'):el.decompose()
for sc in s.find_all('script'):
 t=sc.string or ''
 if "const titles={home:" in t:
  t=t.replace("gm:'Ширма Мастера',bestiary:'Бестиарий',",'')
  a=t.index("let gmActive='gm-encounters';");b=t.index("window.addEventListener('beforeprint'",a)
  t=t[:a]+t[b:];sc.string=t
# Navigation to the general GM tools; adventure handouts remain withdrawn.
nav=s.select_one('.portal-nav');link=s.new_tag('a',href='/gm',**{'class':'online-gm-link'});link.string='◇ Раздел Мастера';nav.append(link)
s.select_one('.portal-sidebar-foot').clear();s.select_one('.portal-sidebar-foot').append(BeautifulSoup('<span><i class="portal-dot"></i>Веб-версия</span><p>Общие правила — по одной ссылке.<br>Персонаж хранится в этом браузере.</p><small><a href="/">Главная сайта</a> · <a href="/updates">Обновления</a></small>','html.parser'))
h=str(s)
h=h.replace('if(saved)restore(JSON.parse(saved),false).catch','if(saved)restore(JSON.parse(saved),false).then(()=>{if(requestedInitialView)showView(requestedInitialView);}).catch').replace("let view='home',step=0,restoring=false,saveTimer=null,toastTimer=null;","const requestedInitialView=Object.hasOwn(titles,location.hash.slice(1))?location.hash.slice(1):'';let view='home',step=0,restoring=false,saveTimer=null,toastTimer=null;")
h=h.replace('Все файлы встроены в сайт и доступны без интернета.','Материалы доступны на сайте; готовые PDF можно скачать для печати.')
# Content-addressed public assets: browser downloads each unchanged asset only once.
(web/'assets').mkdir(exist_ok=True)
assets={};stats={'references':0,'unique':0,'public_html_before':len(h.encode())}
exts={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/svg+xml':'svg','font/ttf':'ttf','font/woff2':'woff2','application/pdf':'pdf','application/x-font-ttf':'ttf','application/font-woff':'woff','font/woff':'woff'}
def asset(m):
 mime,b64=m.group(1),m.group(2)
 try:raw=base64.b64decode(b64,validate=True)
 except Exception:return m.group(0)
 name=hashlib.sha256(raw).hexdigest()[:24]+'.'+exts.get(mime,'bin');path=web/'assets'/name
 if not path.exists():path.write_bytes(raw)
 stats['references']+=1;assets[name]=mime
 return '/assets/'+name
h=re.sub(r'data:([a-zA-Z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)',asset,h)
# CSS/JS additions are kept outside the source rules and character logic.
h=h.replace('</head>','<meta name="robots" content="index,follow"><link rel="stylesheet" href="/online.css"><link rel="stylesheet" href="/companion.css"></head>',1)
h=h.replace('</body>','<script src="/online.js" defer></script><script src="/companion.js" defer></script></body>',1)
(web/'play').mkdir(exist_ok=True);(web/'play/index.html').write_text(h)
# Rebuild general materials only; prepare-materials removes withdrawn adventure files.
import subprocess
subprocess.run(['node',str(site/'scripts/prepare-materials.mjs')],check=True)
# Reuse the actual emblem and display typeface on the new site pages.
s2=BeautifulSoup(h,'html.parser');logo=s2.select_one('.head-logo');logo_path=logo.get('src','') if logo else ''
fonts=re.findall(r'@font-face\s*\{[^}]+\}',h,re.S)
(web/'brand-font.css').write_text('\n'.join(fonts[:2]))
(site/'scripts/brand.json').write_text(json.dumps({'logo':logo_path},ensure_ascii=False))
stats['unique']=len(assets);stats['public_html_after']=len(h.encode());stats['source_sha256']=hashlib.sha256(source.encode()).hexdigest();stats['assets_bytes']=sum((web/'assets'/n).stat().st_size for n in assets)
(site/'scripts/build-manifest.json').write_text(json.dumps(stats,indent=2));print(stats,'logo',logo_path)
assert 'id="view-gm"' not in h and 'id="bestiary-data"' not in h and 'id="gm-encounter-data"' not in h
for p in web.rglob('*'):
 if p.is_file():assert p.stat().st_size<25*1024*1024,(p,p.stat().st_size)
