const pw = require("playwright-core");
const fs = require("fs");
const OUT = "/work";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const POST = "https://suspensereader.com/is-the-silent-patient-worth-reading/";

async function tryGoto(page, url, tries) {
  var last = "";
  for (var i = 0; i < tries; i++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      return "ok:attempt" + (i + 1);
    } catch (e) {
      last = String(e.message).slice(0, 120);
      await page.waitForTimeout(3000);
    }
  }
  return "gotoerr:" + last;
}

(async function () {
  const browser = await pw.chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-quic", "--autoplay-policy=no-user-gesture-required"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "en-US" });
  await ctx.addInitScript(function () {
    window.__gtlog = [];
    var iv = setInterval(function () {
      var g = window.googletag;
      if (g && typeof g.display === "function" && !g.__patched) {
        g.__patched = true;
        try {
          g.pubads().addEventListener("slotRenderEnded", function (e) {
            var id = "?";
            try { id = e.slot.getSlotElementId(); } catch (x) {}
            window.__gtlog.push("slotRenderEnded:" + id + ":isEmpty=" + e.isEmpty + ":size=" + (e.size ? e.size.join("x") : "null"));
          });
        } catch (e) {}
      }
    }, 20);
    setTimeout(function () { clearInterval(iv); }, 40000);
  });
  const page = await ctx.newPage();
  const ev = [];
  page.on("console", function (m) { ev.push("[console." + m.type() + "] " + m.text()); });
  page.on("pageerror", function (e) { ev.push("[pageerror] " + e.message); });
  const gotoInfo = await tryGoto(page, POST, 3);
  await page.waitForTimeout(15000);
  let state = {};
  try {
    state = await page.evaluate(function () {
      var o = { url: location.href, title: document.title };
      o.units = [];
      var els = document.querySelectorAll("[id^='gpt_unit_']");
      for (var i = 0; i < els.length; i++) {
        var u = els[i];
        var cs = window.getComputedStyle(u);
        var r = u.getBoundingClientRect();
        o.units.push({ id: u.id.slice(0, 160), display: cs.display, position: cs.position, bottom: cs.bottom, z: cs.zIndex, w: Math.round(r.width), h: Math.round(r.height) });
      }
      o.adDivs = [];
      var adDivs = document.querySelectorAll("[id^='div-gpt-']");
      for (var j = 0; j < adDivs.length; j++) {
        var d = adDivs[j];
        var ds = window.getComputedStyle(d);
        var rr = d.getBoundingClientRect();
        o.adDivs.push({ id: d.id, display: ds.display, w: Math.round(rr.width), h: Math.round(rr.height), iframes: d.querySelectorAll("iframe").length });
      }
      o.gtlog = window.__gtlog || null;
      return o;
    });
  } catch (e) { state = { err: String(e) }; }
  try { await page.screenshot({ path: OUT + "/probe9_anchor.png" }); } catch (e) {}
  fs.writeFileSync(OUT + "/probe9.json", JSON.stringify({ goto: gotoInfo, state: state }, null, 2));
  fs.writeFileSync(OUT + "/probe9_events.txt", ev.join("\n"));
  await ctx.close();
  await browser.close();
  console.log("PROBE9 DONE");
})().catch(function (e) { console.log("PROBE9 FAILED: " + e.message); process.exit(1); });
