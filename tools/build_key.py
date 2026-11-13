# Javob kalitlarini yasash: data/key/<to'plam>.json
# Server (Cloudflare Worker) o'quvchi javoblarini shu kalitlar bilan tekshiradi.
# Ishlatish: python3 tools/build_key.py   (GitHub Actions ham har o'zgarishda o'zi ishga tushiradi)
import asyncio, json, os, sys, http.server, threading, functools
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "key")
JS = r'''() => {
  const out = {}, bad = [];
  const sh = id => out[id] = out[id] || {};
  SETS.forEach(s => {
    if (s.qs && !s.cq) s.qs.forEach(q => {
      if (!q._k || q._k.startsWith("c_")) return;
      const m = q._k.match(/^(.+)_(\d+)$/); if (!m) return;
      const o = sh(m[1]); o.q = o.q || []; const v = q.o && q.o[q.a];
      if (v == null) bad.push(q._k); o.q[+m[2]] = v == null ? null : String(v);
    });
    if (s.ms) { MS.prep(s.ms); const D = s.ms; sh(s.id).ms = { m: D.mcq.map(q => String(q.o[q.a])), x: D.match.qs.map(q => q.a), w: D.open.map(q => [q.aa, q.ba]) }; }
  });
  return { out, bad };
}'''
async def main():
    port = 8799
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    h.log_message = lambda *a: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    async with async_playwright() as p:
        exe = os.environ.get("CHROME")
        b = await p.chromium.launch(**({"executable_path": exe} if exe else {}), args=["--no-sandbox"])
        pg = await b.new_page()
        await pg.goto(f"http://127.0.0.1:{port}/index.html", wait_until="load")
        await pg.wait_for_function("typeof SETS!=='undefined' && typeof MS!=='undefined' && typeof GAME!=='undefined'")
        r = await pg.evaluate(JS)
        await b.close()
    srv.shutdown()
    os.makedirs(OUT, exist_ok=True)
    keep = set()
    for k, v in r["out"].items():
        fn = os.path.join(OUT, k + ".json"); keep.add(k + ".json")
        s = json.dumps(v, ensure_ascii=False, separators=(",", ":"))
        if not os.path.exists(fn) or open(fn, encoding="utf-8").read() != s:
            open(fn, "w", encoding="utf-8").write(s)
    for f in os.listdir(OUT):
        if f.endswith(".json") and f not in keep: os.remove(os.path.join(OUT, f))
    print(f"{len(keep)} ta kalit fayli", ("· kaliti yo'q savollar: " + ", ".join(r["bad"][:10])) if r["bad"] else "")
asyncio.run(main())
