// Eski Windows (7 / 8 / 8.1) da emoji o'rniga "□" chiqadi — Twemoji rasmlari bilan almashtiramiz.
// Faqat shu tizimlarda yuklanadi (index.html / xarita.html dagi tekshiruv orqali).
(function () {
  var BASE = "vendor/";
  var st = document.createElement("style");
  st.textContent = "img.emoji{height:1em;width:1em;margin:0 .05em 0 .1em;vertical-align:-.12em;display:inline-block}";
  document.head.appendChild(st);
  var s = document.createElement("script");
  s.src = "vendor/twemoji.min.js?v=1";
  // Rasm topilmasa — emoji matnining o'zi qoladi
  document.addEventListener("error", function (e) { var t = e.target; if (t && t.tagName === "IMG" && t.className === "emoji" && t.parentNode) t.parentNode.replaceChild(document.createTextNode(t.alt || ""), t); }, true);
  s.onload = function () {
    var T = window.twemoji; if (!T) return;
    var opt = { base: BASE, folder: "tw", ext: ".svg" };
    var parse = function (n) { try { T.parse(n, opt); } catch (e) {} };
    parse(document.body);
    var q = [], t = 0;
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === "characterData") { if (m.target.parentNode) q.push(m.target.parentNode); }
        else for (var j = 0; j < m.addedNodes.length; j++) { var a = m.addedNodes[j]; if (a.nodeType === 1 && a.tagName !== "IMG") q.push(a); else if (a.nodeType === 3 && a.parentNode) q.push(a.parentNode); }
      }
      if (!t) t = setTimeout(function () { var L = q; q = []; t = 0; for (var k = 0; k < L.length; k++) if (L[k].isConnected) parse(L[k]); }, 60);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  document.head.appendChild(s);
})();
