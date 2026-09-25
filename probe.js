const pw = require("playwright-core");
const fs = require("fs");
const OUT = "/work";
const TARGETS = {
  post: "https://mundodecartaodecredito.com/en/dante-dating-app-como-funciona/",
  home: "https://mundodecartaodecredito.com/en/"
};
const MODES = {
  mobile: {
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    locale: "pt-BR"
  },
  desktop: {
    viewport: { width: 1366, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    isMobile: false,
    hasTouch: false
  }
};

async function probe(modeName, targetName) {
  const mode = MODES[modeName];
  const target = TARGETS[targetName];
  const tag = modeName + "_" + targetName;
  const browser = await pw.chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
  });
  const ctx = await browser.newContext(mode);
  const page = await ctx.newPage();
  const ev = [];
  const ad = [];
  page.on("console", function (m) { ev.push("[console." + m.type() + "] " + m.text()); });
  page.on("pageerror", function (e) { ev.push("[pageerror] " + e.message); });
  page.on("requestfailed", function (r) {
    ev.push("[requestfailed] " + r.url().slice(0, 160) + " :: " + (r.failure() ? r.failure().errorText : ""));
  });
  page.on("request", function (r) {
    const u = r.url();
    if (/doubleclick|googlesyndication|gampad|adservice|adsbygoogle/.test(u)) ad.push("REQ " + u.slice(0, 420));
  });
  page.on("response", async function (r) {
    const u = r.url();
    if (u.indexOf("gampad/ads") > -1) {
      let b = "";
      try { b = (await r.text()).slice(0, 600); } catch (e) { b = "readerr:" + e.message; }
      ad.push("RESP " + r.status() + " " + u.slice(0, 360) + " ||BODY|| " + b.replace(/\s+/g, " "));
    }
  });
  try { await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60000 }); }
  catch (e) { ev.push("[gotoerr] " + e.message); }
  await page.waitForTimeout(20000);
  let state = {};
  try {
    state = await page.evaluate(function () {
      var o = {};
      try {
        var gt = window.googletag;
        o.url = location.href;
        o.title = document.title;
        o.hasGT = !!gt;
        o.pubadsReady = gt ? gt.pubadsReady : null;
        o.apiReady = gt ? gt.apiReady : null;
        o.enums = (gt && gt.enums) ? Object.keys(gt.enums) : null;
        o.OOPF = (gt && gt.enums && gt.enums.OutOfPageFormat) ? gt.enums.OutOfPageFormat : null;
        o.targeting = window.GAM_TARGETING || null;
        o.slots = [];
        if (gt && gt.pubads) {
          var s = gt.pubads().getSlots();
          for (var i = 0; i < s.length; i++) {
            o.slots.push({ path: s[i].getAdUnitPath(), id: s[i].getSlotElementId(), fmt: (s[i].getOutOfPageFormat ? s[i].getOutOfPageFormat() : "n/a") });
          }
        }
        var ids = [];
        var els = document.querySelectorAll("[id]");
        for (var j = 0; j < els.length; j++) { if (/google|gpt|gampad|interstitial/i.test(els[j].id)) ids.push(els[j].id.slice(0, 140)); }
        o.adIds = ids;
        var fr = [];
        var ff = document.querySelectorAll("iframe");
        for (var k = 0; k < ff.length; k++) {
          if (/googleads|doubleclick|googlesyndication|gampad/.test(ff[k].src)) fr.push({ id: ff[k].id, w: ff[k].width, h: ff[k].height, src: ff[k].src.slice(0, 200) });
        }
        o.adIframes = fr;
        var overlays = [];
        var all = document.querySelectorAll("body > div, body > iframe");
        for (var m = 0; m < all.length; m++) {
          var st = window.getComputedStyle(all[m]);
          if (st.position === "fixed" && st.display !== "none" && parseInt(st.zIndex || "0", 10) >= 1000) {
            overlays.push((all[m].id || all[m].tagName) + " z=" + st.zIndex + " " + st.width + "x" + st.height + " op=" + st.opacity);
          }
        }
        o.overlays = overlays.slice(0, 25);
      } catch (e) { o.err = String(e); }
      return o;
    });
  } catch (e) { ev.push("[evaluateerr] " + e.message); }
  fs.writeFileSync(OUT + "/probe_" + tag + "_events.txt", ev.join("\n"));
  fs.writeFileSync(OUT + "/probe_" + tag + "_ads.txt", ad.join("\n\n"));
  fs.writeFileSync(OUT + "/probe_" + tag + "_state.json", JSON.stringify(state, null, 2));
  try { await page.screenshot({ path: OUT + "/shot_" + tag + ".png" }); } catch (e) {}
  await ctx.close();
  await browser.close();
}

(async function () {
  const modeName = process.argv[2] || "mobile";
  const targetName = process.argv[3] || "post";
  await probe(modeName, targetName);
  console.log("PROBE DONE " + modeName + " " + targetName);
})().catch(function (e) { console.log("PROBE FAILED: " + e.message); process.exit(1); });
