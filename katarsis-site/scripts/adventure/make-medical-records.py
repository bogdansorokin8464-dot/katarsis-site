from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph,Table,TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor,Color
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from html import escape
import json,random,urllib.request
root=Path(__file__).resolve().parents[3]
records=json.loads(Path(__file__).with_name('medical-records.json').read_text())
font=Path('/tmp/Caveat.ttf')
if not font.exists():
 try:urllib.request.urlretrieve('https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/Caveat%5Bwght%5D.ttf',font)
 except Exception:font=Path('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf')
pdfmetrics.registerFont(TTFont('Hand',str(font)))
pdfmetrics.registerFont(TTFont('Serif','/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('SerifBold','/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'))
W,H=A4
ink=HexColor('#283b49');sep=HexColor('#b8ab94')
body=ParagraphStyle('ink',fontName='Hand',fontSize=13.8,leading=14.2,textColor=ink)
small=ParagraphStyle('small',fontName='Serif',fontSize=7.7,leading=10,textColor=HexColor('#625a4d'))
header=ParagraphStyle('header',fontName='SerifBold',fontSize=8,leading=11,textColor=HexColor('#52483d'))
def para(t,style=body):return Paragraph(escape(t),style)
def drawtext(c,t,x,y,width,style=body):
 p=para(t,style);_,h=p.wrap(width,H);p.drawOn(c,x,y-h);return h
out=root/'Липотактис — медицинские карты жителей.pdf'
c=canvas.Canvas(str(out),pagesize=A4);c.setTitle('Липотактис — личные медицинские карты');c.setAuthor('Катарсис')
for i,r in enumerate(records):
 rng=random.Random(730+i);c.setFillColor(HexColor('#fbf8ee'));c.rect(0,0,W,H,fill=1,stroke=0)
 # Pale wear, intentionally light enough for home printing.
 for k in range(16):
  x=rng.choice([rng.uniform(-12,15),rng.uniform(195,220)])*mm;y=rng.uniform(0,297)*mm
  c.setFillColor(Color(.68,.59,.41,alpha=.035));c.ellipse(x-18*mm,y-22*mm,x+18*mm,y+22*mm,fill=1,stroke=0)
 c.setStrokeColor(sep);c.setLineWidth(.55);c.rect(14*mm,14*mm,W-28*mm,H-28*mm)
 c.setDash(1,3);c.line(20*mm,18*mm,20*mm,H-18*mm);c.setDash()
 for y in [244,262,278]:
  c.setFillColor(HexColor('#d9d0be'));c.circle(17*mm,y*mm,1.1*mm,fill=1,stroke=0)
 c.setFillColor(HexColor('#4d4338'));c.setFont('Serif',9);c.drawCentredString(W/2,H-26*mm,'ЛАЗАРЕТ ПРИ ЛИПОТАКТИСЕ')
 c.setFont('SerifBold',20);c.drawCentredString(W/2,H-38*mm,'ЛИЧНАЯ КАРТА БОЛЬНОГО')
 c.setStrokeColor(sep);c.line(27*mm,H-43*mm,W-23*mm,H-43*mm)
 c.setFont('Serif',8);c.drawString(28*mm,H-51*mm,'Архивный № '+r['number']);c.drawRightString(W-25*mm,H-51*mm,'Книга приёмов · 1841–1879')
 c.setFont('Serif',9);c.drawString(28*mm,H-62*mm,'Имя:');c.setFont('Hand',26);c.setFillColor(ink);c.drawString(44*mm,H-63*mm,r['name'])
 c.setStrokeColor(sep);c.line(43*mm,H-65*mm,W-26*mm,H-65*mm)
 drawtext(c,'Занятие: '+r['occupation'],28*mm,H-70*mm,157*mm,small)
 top=H-83*mm
 rows=[[para('Дата',header),para('Жалоба и осмотр',header),para('Назначение и отметка об исходе',header)]]
 for date,reason,result in r['visits']:rows.append([para(date),para(reason),para(result)])
 t=Table(rows,colWidths=[25*mm,69*mm,67*mm]);t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LINEABOVE',(0,0),(-1,0),.5,sep),('LINEBELOW',(0,0),(-1,0),.5,sep),('LINEBELOW',(0,1),(-1,-1),.35,sep),('LINEAFTER',(0,0),(1,-1),.3,sep),('LEFTPADDING',(0,0),(-1,-1),2*mm),('RIGHTPADDING',(0,0),(-1,-1),2*mm),('TOPPADDING',(0,0),(-1,-1),2.6*mm),('BOTTOMPADDING',(0,0),(-1,-1),2.6*mm)]))
 _,h=t.wrap(161*mm,H);t.drawOn(c,27*mm,top-h);y=top-h-7*mm
 drawtext(c,'ОСОБЫЕ ОТМЕТКИ',28*mm,y,155*mm,header);y-=5*mm;y-=drawtext(c,r['note'],28*mm,y,155*mm)
 if r.get('late'):
  y-=5*mm
  drawtext(c,'Поздняя приписка. Дата отсутствует.',28*mm,y,155*mm,small);y-=4.5*mm
  p=Paragraph(escape(r['late']),ParagraphStyle('late',parent=body,fontSize=16,leading=16.5,textColor=HexColor('#483326')))
  _,ph=p.wrap(155*mm,H);p.drawOn(c,28*mm,y-ph);y-=ph
 assert y>27*mm,(r['name'],'page overflow',y/mm)
 c.setFont('Serif',7.5);c.setFillColor(HexColor('#655c4f'));c.drawString(28*mm,23*mm,'Вёл карту: главный фельдшер-врач');c.line(91*mm,22.4*mm,132*mm,22.4*mm);c.setFillColor(ink);c.setFont('Hand',15);c.drawString(93*mm,24*mm,'Гл. фельдшер');c.setStrokeColor(ink);c.setLineWidth(.55);path=c.beginPath();path.moveTo(97*mm,23.4*mm);path.curveTo(105*mm,26*mm,114*mm,20.9*mm,129*mm,25.2*mm);c.drawPath(path)
 c.saveState();c.translate(164*mm,28*mm);c.rotate(-9+i);c.setStrokeColor(Color(.38,.31,.40,alpha=.48));c.setFillColor(Color(.38,.31,.40,alpha=.48));c.circle(0,0,15*mm,fill=0,stroke=1);c.circle(0,0,12.8*mm,fill=0,stroke=1);c.setFont('SerifBold',7);c.drawCentredString(0,3*mm,'ЛИПОТАКТИС');c.setFont('Serif',7);c.drawCentredString(0,-1*mm,'ЛАЗАРЕТ');c.drawCentredString(0,-5*mm,'ОСМОТРЕНО');c.restoreState()
 c.showPage()
c.save();print(out)
