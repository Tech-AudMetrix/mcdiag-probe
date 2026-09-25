const pw = require("playwright-core");
const fs = require("fs");
const OUT = "/work";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const POST = "https://suspensereader.com/is-the-silent-patient-worth-reading/";

async function dump(page) {
  return await page.evaluate(function () {
    var out = [];
    var els = document.querySelectorAll("[id^='gpt_unit_']");
    for (var i = 0; i < els.length; i++) {
      var u = els[i];
      var cs = window.getComputedStyle(u);
      var r = u.getBoundingClientRect();
      out.push({ id: u.id.slice(0, 150), display: cs.display, position: cs.position, bottom: cs.bottom, z: cs.zIndex, w: Math.round(r.width), h: Math.round(r.height) });
    }
    return out;
  });
}

async function scenario(browser, label, doClick) {
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
    setTimeout(function () { clearInterval(iv); }, 45000);
  });
  const page = await ctx.newPage();
  const ev = [];
  page.on("console", function (m) { ev.push("[console." + m.type() + "] " + m.text()); });
  page.on("pageerror", function (e) { ev.push("[pageerror] " + e.message); });
  await page.route("**/*", function (route) {
    var req = route.request();
    if (req.isNavigationRequest() && req.frame() === page.mainFrame() && req.url() !== POST) { return route.abort(); }
    return route.continue();
  });
  try { await page.goto(POST, { waitUntil: "domcontentloaded", timeout: 60000 }); } catch (e) { ev.push("[gotoerr] " + e.message); }
  await page.waitForTimeout(12000);
  const a1 = await dump(page);
  try { await page.screenshot({ path: OUT + "/probe7_" + label + "_t12.png" }); } catch (e) {}
  await page.evaluate(function () { window.scrollTo(0, document.body.scrollHeight); });
  await page.waitForTimeout(5000);
  const a2 = await dump(page);
  try { await page.screenshot({ path: OUT + "/probe7_" + label + "_scroll.png" }); } catch (e) {}
  var clickInfo = "none";
  if (doClick) {
    try {
      var loc = page.locator("a[href*='/category/']").first();
      await loc.scrollIntoViewIfNeeded({ timeout: 4000 });
      await page.waitForTimeout(300);
      await loc.click({ timeout: 6000 });
      clickInfo = "clicked";
    } catch (e1) { clickInfo = "clickerr:" + String(e1.message).slice(0, 100); }
    await page.waitForTimeout(6000);
  }
  const a3 = await dump(page);
  try { await page.screenshot({ path: OUT + "/probe7_" + label + "_after.png" }); } catch (e) {}
  const gtlog = await page.evaluate(function () { return window.__gtlog || null; });
  fs.writeFileSync(OUT + "/probe7_" + label + ".json", JSON.stringify({ click: clickInfo, t12: a1, scroll: a2, final: a3, gtlog: gtlog }, null, 2));
  fs.writeFileSync(OUT + "/probe7_" + label + "_events.txt", ev.join("\n"));
  await ctx.close();
}

(async function () {
  const browser = await pw.chromium.launch({ headless: process.env.PW_HEADED ? false : true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"] });
  await scenario(browser, "anchor", false);
  await scenario(browser, "click", true);
  await browser.close();
  console.log("PROBE7 DONE");
})().catch(function (e) { console.log("PROBE7 FAILED: " + e.message); process.exit(1); });
