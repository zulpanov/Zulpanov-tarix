# Testlarni guruh fayllariga bo'lish: data/tests.js  ->  data/t/<guruh>.js
# Asosiy manba hamon data/tests.js. Uni o'zgartirgandan keyin shu skriptni ishga tushiring:
#   python3 tools/split_tests.py
# Skript: guruh fayllarini yozadi, index.html dagi yuklovchini (versiyalar bilan) yangilaydi,
# SETS dagi  qs:Q6_A  yozuvlarini  qs:TQA("Q6_A")  ga aylantiradi. Takror ishlatish xavfsiz.
import hashlib, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT, HTML = os.path.join(ROOT, "data", "tests.js"), os.path.join(ROOT, "data", "t"), os.path.join(ROOT, "index.html")

groups, names = {}, []
for ln in open(SRC, encoding="utf-8").read().split("\n"):
    ln = ln.strip()
    if not ln or ln.startswith("//"): continue
    m = re.match(r"^const ([A-Z][A-Z0-9]*)_([A-Z0-9_]+)=(\[.*\]);$", ln)
    if not m: sys.exit("Tushunilmagan qator: " + ln[:80])
    g, n = m.group(1), m.group(1) + "_" + m.group(2)
    groups.setdefault(g, []).append((n, m.group(3))); names.append(n)

os.makedirs(OUT, exist_ok=True)
ver = {}
for g, items in groups.items():
    body = "// TARIX ARENA — " + g + " guruhi savollari (data/tests.js dan avtomatik)\nTQF(" + repr(g) .replace("'", '"') + ",{\n" + ",\n".join(f"{n}:{a}" for n, a in items) + "\n});\n"
    fn = os.path.join(OUT, g.lower() + ".js")
    if not os.path.exists(fn) or open(fn, encoding="utf-8").read() != body:
        open(fn, "w", encoding="utf-8").write(body)
    ver[g.lower()] = hashlib.md5(body.encode()).hexdigest()[:8]
for f in os.listdir(OUT):
    if f.endswith(".js") and f[:-3] not in ver: os.remove(os.path.join(OUT, f))

G = ",".join(f'{k}:"{v}"' for k, v in sorted(ver.items()))
LOADER = ("<!--TQ--><script>(function(){var G={" + G + "},N=Object.keys(G).length,got={},n=0,T=window.TQ={},ok;"
  "window.TQR=new Promise(function(r){ok=r});"
  "window.TQA=function(k){return T[k]||(T[k]=[])};"
  "window.TQF=function(g,o){for(var k in o){var a=TQA(k);a.length=0;Array.prototype.push.apply(a,o[k])}g=String(g).toLowerCase();if(!got[g]){got[g]=1;if(++n>=N){window.TQOK=1;ok()}}};"
  "function ld(g,t){var s=document.createElement('script');s.src='data/t/'+g+'.js?v='+G[g]+(t?'&r='+t:'');"
  "s.onerror=function(){if(t<3)setTimeout(function(){ld(g,t+1)},1500*(t+1));else{window.TQPART=1;ok()}};document.head.appendChild(s)}"
  "for(var g in G)ld(g,0);setTimeout(function(){if(!window.TQOK){window.TQPART=1;ok()}},25000)})();</script><!--/TQ-->")

h = open(HTML, encoding="utf-8").read()
h2 = re.sub(r'<script src="data/tests\.js\?v=[0-9a-f]+"></script>\n?', "", h)
if "<!--TQ-->" in h2:
    h2 = re.sub(r"<!--TQ-->.*?<!--/TQ-->", lambda _: LOADER, h2, count=1, flags=re.S)
else:
    h2 = h2.replace("<script>\n// ===== Telegram Mini App", LOADER + "\n<script>\n// ===== Telegram Mini App", 1)
    if "<!--TQ-->" not in h2: sys.exit("index.html da yuklovchi joyi topilmadi")
nm = set(names)
h2 = re.sub(r'\bqs:([A-Z][A-Z0-9]*_[A-Z0-9_]+)\b(?!\()', lambda m: f'qs:TQA("{m.group(1)}")' if m.group(1) in nm else m.group(0), h2)
miss = [n for n in names if f'TQA("{n}")' not in h2]
if h2 != h: open(HTML, "w", encoding="utf-8").write(h2)
print(f"{len(groups)} guruh, {len(names)} to'plam" + (f" · SETS da yo'q: {', '.join(miss)}" if miss else ""))
