const pw = require("playwright-core");
const fs = require("fs");
const OUT = "/work";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const REAL = "https://mundodecartaodecredito.com/en/dante-dating-app-como-funciona/";
const IUNIT = "gpt_unit_/23283724736/mundodecartaodecredito.com/Mundodecartaodecredito_WEB_Interstitial_20250814_0";

async function state(page) {
  return await page.evaluate(function (id) {
    var o = {};
    o.url = location.href;
    var u = document.getElementById(id);
    o.unitFound = !!u;
    if (u) {
      var cs = window.getComputedStyle(u);
      var r = u.getBoundingClientRect();
      o.display = cs.display;
      o.z = cs.zIndex;
      o.rect = { w: Math.round(r.width), h: Math.round(r.height) };
    }
    o.gtlog = window.__gtlog || null;
    return o;
  }, IUNIT);
}

async function scenario(browser, label) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "pt-BR" });
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
            window.__gtlog.push("slotRenderEnded:" + id + ":isEmpty=" + e.isEmpty);
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
  await page.route("**/*", function (route) {
    var req = route.request();
    if (req.isNavigationRequest() && req.url() !== REAL && req.url().indexOf("?cb=") === -1 && req.frame() === page.mainFrame()) {
      return route.abort();
    }
    return route.continue();
  });
  try { await page.goto(REAL, { waitUntil: "domcontentloaded", timeout: 60000 }); } catch (e) { ev.push("[gotoerr] " + e.message); }
  await page.waitForTimeout(9000);
  const before = await state(page);
  try { await page.screenshot({ path: OUT + "/probe5_" + label + "_before.png" }); } catch (e) {}
  var clicked = "none";
  try {
    await page.click("a", { timeout: 6000 });
    clicked = "clicked";
  } catch (e) { clicked = "clickerr:" + e.message; }
  await page.waitForTimeout(7000);
  const after = await state(page);
  try { await page.screenshot({ path: OUT + "/probe5_" + label + "_after.png" }); } catch (e) {}
  fs.writeFileSync(OUT + "/probe5_" + label + ".json", JSON.stringify({ clicked: clicked, before: before, after: after }, null, 2));
  fs.writeFileSync(OUT + "/probe5_" + label + "_events.txt", ev.join("\n"));
  await ctx.close();
}

(async function () {
  const browser = await pw.chromium.launch({
    headless: process.env.PW_HEADED ? false : true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"]
  });
  await scenario(browser, "real");
  await browser.close();
  console.log("PROBE5 DONE");
})().catch(function (e) { console.log("PROBE5 FAILED: " + e.message); process.exit(1); });
