const pw = require("playwright-core");
const fs = require("fs");
const OUT = "/work";
const UAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const UAD = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const POST = "https://suspensereader.com/is-the-silent-patient-worth-reading/";
const HOME = "https://suspensereader.com/";

async function scenario(browser, label, url, mobile) {
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 },
    userAgent: mobile ? UAM : UAD,
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: "en-US"
  });
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
    setTimeout(function () { clearInterval(iv); }, 45000);
  });
  const page = await ctx.newPage();
  const ev = [];
  const ad = [];
  page.on("console", function (m) { ev.push("[console." + m.type() + "] " + m.text()); });
  page.on("pageerror", function (e) { ev.push("[pageerror] " + e.message); });
  page.on("request", function (r) {
    const u = r.url();
    if (u.indexOf("gampad/ads") > -1) ad.push("REQ " + u.slice(0, 900));
  });
  page.on("response", async function (r) {
    const u = r.url();
    if (u.indexOf("gampad/ads") > -1) {
      let b = "";
      try { b = (await r.text()).slice(0, 1500); } catch (e) { b = "readerr"; }
      ad.push("RESP " + r.status() + " " + u.slice(0, 200) + " ||BODY|| " + b.replace(/\s+/g, " "));
    }
  });
  var gotoInfo = "";
  try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }); gotoInfo = "ok"; }
  catch (e) { gotoInfo = "gotoerr:" + String(e.message).slice(0, 120); }
  await page.waitForTimeout(18000);
  let state = {};
  try {
    state = await page.evaluate(function () {
      var o = { url: location.href };
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
  try { await page.screenshot({ path: OUT + "/probe10_" + label + ".png" }); } catch (e) {}
  fs.writeFileSync(OUT + "/probe10_" + label + ".json", JSON.stringify({ goto: gotoInfo, state: state }, null, 2));
  fs.writeFileSync(OUT + "/probe10_" + label + "_ads.txt", ad.join("\n\n"));
  fs.writeFileSync(OUT + "/probe10_" + label + "_events.txt", ev.join("\n"));
  await ctx.close();
}

(async function () {
  const browser = await pw.chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-quic", "--autoplay-policy=no-user-gesture-required"] });
  await scenario(browser, "mobile_post", POST, true);
  await scenario(browser, "mobile_home", HOME, true);
  await scenario(browser, "desktop_post", POST, false);
  await browser.close();
  console.log("PROBE10 DONE");
})().catch(function (e) { console.log("PROBE10 FAILED: " + e.message); process.exit(1); });
