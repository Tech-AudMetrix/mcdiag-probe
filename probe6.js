const pw = require("playwright-core");
const fs = require("fs");
const OUT = "/work";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const REAL = "https://mundodecartaodecredito.com/en/dante-dating-app-como-funciona/";
const DEMO = "https://googleads.github.io/google-publisher-tag-samples/display-web-interstitial-ad/js/demo.html";

async function dumpUnits(page) {
  return await page.evaluate(function () {
    var out = [];
    var els = document.querySelectorAll("[id^='gpt_unit_']");
    for (var i = 0; i < els.length; i++) {
      var u = els[i];
      var cs = window.getComputedStyle(u);
      var r = u.getBoundingClientRect();
      out.push({ id: u.id.slice(0, 120), display: cs.display, z: cs.zIndex, w: Math.round(r.width), h: Math.round(r.height) });
    }
    return out;
  });
}

async function scenario(browser, label, url, clickSel) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "pt-BR" });
  const page = await ctx.newPage();
  const ev = [];
  page.on("console", function (m) { ev.push("[console." + m.type() + "] " + m.text()); });
  page.on("pageerror", function (e) { ev.push("[pageerror] " + e.message); });
  await page.route("**/*", function (route) {
    var req = route.request();
    if (req.isNavigationRequest() && req.frame() === page.mainFrame() && req.url() !== url) {
      return route.abort();
    }
    return route.continue();
  });
  try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }); } catch (e) { ev.push("[gotoerr] " + e.message); }
  await page.waitForTimeout(9000);
  const before = await dumpUnits(page);
  var clickInfo = "none";
  try {
    var loc = page.locator(clickSel).first();
    await loc.scrollIntoViewIfNeeded({ timeout: 4000 });
    await page.waitForTimeout(300);
    await loc.click({ timeout: 8000 });
    clickInfo = "clicked:" + clickSel;
  } catch (e1) {
    clickInfo = "clickerr:" + String(e1.message).slice(0, 120);
    try {
      var ok = await page.evaluate(function (sel) {
        var a = document.querySelector(sel);
        if (!a) return "nosel";
        a.click();
        return "synthetic-click";
      }, clickSel);
      clickInfo += " | fallback:" + ok;
    } catch (e2) { clickInfo += " | fallbackerr"; }
  }
  await page.waitForTimeout(8000);
  const after = await dumpUnits(page);
  try { await page.screenshot({ path: OUT + "/probe6_" + label + "_after.png" }); } catch (e) {}
  fs.writeFileSync(OUT + "/probe6_" + label + ".json", JSON.stringify({ click: clickInfo, before: before, after: after }, null, 2));
  fs.writeFileSync(OUT + "/probe6_" + label + "_events.txt", ev.join("\n"));
  await ctx.close();
}

(async function () {
  const browser = await pw.chromium.launch({
    headless: process.env.PW_HEADED ? false : true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"]
  });
  await scenario(browser, "google_demo", DEMO, "a");
  await scenario(browser, "site", REAL, "a[href*='/author/']");
  await browser.close();
  console.log("PROBE6 DONE");
})().catch(function (e) { console.log("PROBE6 FAILED: " + e.message); process.exit(1); });
