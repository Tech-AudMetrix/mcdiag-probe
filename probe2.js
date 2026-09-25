const pw = require("playwright-core");
const fs = require("fs");
const OUT = "/work";
const URL0 = "https://mundodecartaodecredito.com/en/dante-dating-app-como-funciona/";

(async function () {
  const browser = await pw.chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--autoplay-policy=no-user-gesture-required"]
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    isMobile: true, hasTouch: true, deviceScaleFactor: 3, locale: "pt-BR"
  });
  await ctx.addInitScript(function () {
    window.__gtlog = [];
    var iv = setInterval(function () {
      var g = window.googletag;
      if (g && typeof g.display === "function" && !g.__patched) {
        g.__patched = true;
        var od = g.display;
        g.display = function (s) {
          try { window.__gtlog.push("display:" + (s && s.getSlotElementId ? s.getSlotElementId() : String(s))); }
          catch (e) { window.__gtlog.push("display-arg-err"); }
          return od.apply(this, arguments);
        };
        var oe = g.enableServices;
        if (oe) { g.enableServices = function () { window.__gtlog.push("enableServices"); return oe.apply(this, arguments); }; }
        try {
          g.pubads().addEventListener("slotRenderEnded", function (e) {
            var id = "?";
            try { id = e.slot.getSlotElementId(); } catch (x) {}
            window.__gtlog.push("slotRenderEnded:" + id + ":isEmpty=" + e.isEmpty + ":size=" + (e.size ? e.size.join("x") : "null"));
          });
        } catch (e) { window.__gtlog.push("listenerErr:" + e.message); }
      }
    }, 20);
    setTimeout(function () { clearInterval(iv); }, 30000);
  });
  const page = await ctx.newPage();
  const ev = [];
  page.on("console", function (m) { ev.push("[console." + m.type() + "] " + m.text()); });
  page.on("pageerror", function (e) { ev.push("[pageerror] " + e.message); });
  try { await page.goto(URL0, { waitUntil: "domcontentloaded", timeout: 60000 }); }
  catch (e) { ev.push("[gotoerr] " + e.message); }
  const shots = [2000, 5000, 8000, 12000, 18000, 26000];
  var last = 0;
  for (var i = 0; i < shots.length; i++) {
    await page.waitForTimeout(shots[i] - last);
    last = shots[i];
    try { await page.screenshot({ path: OUT + "/t" + shots[i] + ".png" }); } catch (e) {}
  }
  const state = await page.evaluate(function () {
    function dumpEl(id) {
      var el = document.getElementById(id);
      if (!el) return { id: id, missing: true };
      var st = window.getComputedStyle(el);
      var r = el.getBoundingClientRect();
      var p = "";
      try {
        var parent = el.parentElement;
        if (parent) { p = parent.id || parent.tagName; var gp = parent.parentElement; if (gp) p += " < " + (gp.id || gp.tagName); }
      } catch (e) {}
      return { id: id, display: st.display, position: st.position, zIndex: st.zIndex, visibility: st.visibility, opacity: st.opacity, overflow: st.overflow,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, parent: p, inlineStyle: (el.getAttribute("style") || "").slice(0, 220) };
    }
    var o = {};
    o.bodyClass = document.body.className;
    var bs = window.getComputedStyle(document.body);
    o.bodyPosition = bs.position;
    o.bodyOverflow = bs.overflow;
    o.htmlClass = document.documentElement.className;
    o.els = {};
    var ids = [
      "gpt_unit_/23283724736/mundodecartaodecredito.com/Mundodecartaodecredito_WEB_Interstitial_20250814_0",
      "google_ads_iframe_/23283724736/mundodecartaodecredito.com/Mundodecartaodecredito_WEB_Interstitial_20250814_0__container__",
      "google_ads_iframe_/23283724736/mundodecartaodecredito.com/Mundodecartaodecredito_WEB_Interstitial_20250814_0",
      "google_ads_top_frame",
      "loftloader-wrapper"
    ];
    for (var i = 0; i < ids.length; i++) o.els[ids[i]] = dumpEl(ids[i]);
    var ll = document.getElementById("loftloader-wrapper");
    if (ll) {
      var lb = ll.querySelector(".loader-bg");
      var lin = ll.querySelector(".loader-inner");
      o.loftBg = lb ? (window.getComputedStyle(lb).display + "/" + window.getComputedStyle(lb).opacity) : null;
      o.loftInner = lin ? (window.getComputedStyle(lin).display + "/" + window.getComputedStyle(lin).opacity) : null;
    }
    o.gtlog = window.__gtlog || null;
    try { var top = document.elementFromPoint(195, 422); o.topEl = top ? (top.id || (top.tagName + "." + String(top.className).slice(0, 80))) : null; } catch (e) { o.topEl = "err"; }
    try { var top2 = document.elementFromPoint(195, 100); o.topEl2 = top2 ? (top2.id || (top2.tagName + "." + String(top2.className).slice(0, 80))) : null; } catch (e) { o.topEl2 = "err"; }
    return o;
  });
  fs.writeFileSync(OUT + "/probe2_state.json", JSON.stringify(state, null, 2));
  fs.writeFileSync(OUT + "/probe2_events.txt", ev.join("\n"));
  await ctx.close();
  await browser.close();
  console.log("PROBE2 DONE");
})().catch(function (e) { console.log("PROBE2 FAILED: " + e.message); process.exit(1); });
